// =============================================================================
// preview.bicep — ephemeral per-PR preview stack
// =============================================================================
//
// Scope: resourceGroup. The workflow (`pr-preview.yml`) creates the RG with
// `az group create` first (so it can stamp the canonical preview tags
// including `created-at`), then runs `az deployment group create` against
// this template.
//
// Resources provisioned:
//   * Container Apps Environment (Consumption profile only, no VNet)
//   * Container App (minReplicas 0, maxReplicas 2, ingress port 3000,
//     ipSecurityRestrictions.defaultAction = 'Deny' — runner IPs are added
//     post-deploy by the workflow on a per-job basis)
//   * User-assigned managed identity for the Container App (so AcrPull on
//     the shared preview ACR can be granted before the app starts)
//   * Postgres Flexible Server (B1ms, 20 GB, autoGrow off, no HA, 7-day
//     backup) + database `atomicly` + Azure-services firewall + require_TLS
//   * Key Vault (Standard, soft-delete on — Azure mandates — purge
//     protection OFF so the teardown workflow can re-create the KV under
//     the same name after a force-push)
//   * Log Analytics workspace (0.1 GB/day daily cap, 7-day retention) wired
//     to the Container Apps Environment for app logs
//
// Cross-RG: AcrPull role assignment is scoped to the shared preview ACR's RG
// (`rg-atomicly-preview-shared`), NOT this preview RG. The dev RG is never
// touched.
//
// Deliberate divergences from `main.bicep`:
//   * No VNet, no private endpoints, no Front Door, no WAF. Previews are
//     private testbeds, locked down via Container Apps IP restrictions plus
//     app-layer auth.
//   * Key Vault purge protection is OFF (vs ON in dev) — see the design doc
//     Decision 3 for the cost/rotation tradeoff.
//   * No App Insights, no scheduled-query alerts. Preview observability is
//     limited to the Log Analytics ingestion of Container Apps logs.
//
// No `utcNow()` calls anywhere. `createdAt` is passed in by the workflow,
// computed ONCE at RG creation, so re-deploys do NOT reset the reaper clock.
// =============================================================================

targetScope = 'resourceGroup'

@description('Pull request number. Used in every resource name and tag.')
@minLength(1)
param prNumber string

@description('Short commit SHA (7 lowercase hex chars).')
@minLength(7)
@maxLength(7)
param commitSha string

@description('Azure region. Defaults to the RG location.')
param location string = resourceGroup().location

@description('Postgres admin password. Generated per workflow run by `openssl rand -base64 32`; passed via @secure() and never echoed or stored as a long-lived credential.')
@secure()
@minLength(16)
param postgresAdminPassword string

@description('NextAuth.js secret used to sign session JWTs. Generated per workflow run, passed via @secure(), and stored as a Container Apps secret (not a GitHub secret).')
@secure()
@minLength(32)
param authSecret string

@description('Postgres admin username.')
param postgresAdminUsername string = 'psqladmin'

@description('Container image tag to deploy, e.g. pr-1234-abcdef0.')
param imageTag string

@description('Shared preview ACR login server, e.g. cratomiclypreview<suffix>.azurecr.io.')
param acrLoginServer string

@description('Resource group containing the shared preview ACR (typically `rg-atomicly-preview-shared`). The AcrPull role assignment is created in this RG, NOT in the preview RG.')
param sharedAcrResourceGroup string = 'rg-atomicly-preview-shared'

@description('Name of the shared preview ACR (without `.azurecr.io`).')
param acrName string

@description('ISO-8601 UTC timestamp of the preview creation. Set ONCE by the workflow on the first deploy of this PR + SHA and passed unchanged on every re-deploy so the reaper does not see a refreshed clock. NEVER set via utcNow() here.')
param createdAt string

// ---------------------------------------------------------------------------
// Derived names. All deterministic from (prNumber, commitSha) so the teardown
// workflow can compute them without reading state.
// ---------------------------------------------------------------------------
var caeName = 'cae-atomicly-pr-${prNumber}'
var appName = 'ca-atomicly-pr-${prNumber}'
var identityName = '${appName}-identity'
var postgresServerName = 'psql-atomicly-pr-${prNumber}-${commitSha}'
var keyVaultName = 'kv-atompr-${prNumber}-${commitSha}'
var logAnalyticsName = 'law-atomicly-pr-${prNumber}'
var databaseName = 'atomicly'

// ---------------------------------------------------------------------------
// Canonical preview tag contract. Every resource in this template must carry
// these five tags — the reaper, the cost dashboard, and the deny policies all
// rely on them.
// ---------------------------------------------------------------------------
var commonTags = {
  pr: prNumber
  commit: commitSha
  lifetime: 'ephemeral'
  'created-by': 'github-actions'
  'created-at': createdAt
}

// ---------------------------------------------------------------------------
// Log Analytics workspace — small, capped, short retention.
// 0.1 GB/day cap × $2.99/GB = $0.30/day worst-case, well under the $1/day
// per-preview ceiling. Cap dropped from 0.2 → 0.1 GB during the design
// rubber-duck review (see design.md Decision 6).
// ---------------------------------------------------------------------------
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: logAnalyticsName
  location: location
  tags: commonTags
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
    workspaceCapping: {
      dailyQuotaGb: json('0.1')
    }
    features: {
      enableLogAccessUsingOnlyResourcePermissions: true
    }
  }
}

// ---------------------------------------------------------------------------
// Key Vault — Standard, soft-delete on (mandatory), purge protection OFF.
// The teardown workflow runs `az keyvault purge` after RG deletion so the
// next push to the same PR can re-create under the same name.
// ---------------------------------------------------------------------------
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: keyVaultName
  location: location
  tags: commonTags
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 7
    // NOTE: enablePurgeProtection is intentionally omitted. The Azure KV API
    // rejects an explicit `false` ("cannot be set to false") and the default
    // is false, which is what we want for ephemeral previews so teardown can
    // `az keyvault purge` and the next push reuse the name.
    publicNetworkAccess: 'Enabled'
    networkAcls: {
      defaultAction: 'Allow'
      bypass: 'AzureServices'
    }
  }
}

// ---------------------------------------------------------------------------
// Postgres Flexible Server — B1ms, 20 GB, no HA, 7-day backup, no autoGrow.
// Public networking with Azure-services + per-runner-IP firewall rules
// applied by the workflow (`trap EXIT` removes them).
// ---------------------------------------------------------------------------
resource postgres 'Microsoft.DBforPostgreSQL/flexibleServers@2023-12-01-preview' = {
  name: postgresServerName
  location: location
  tags: commonTags
  sku: {
    name: 'Standard_B1ms'
    tier: 'Burstable'
  }
  properties: {
    version: '16'
    administratorLogin: postgresAdminUsername
    administratorLoginPassword: postgresAdminPassword
    storage: {
      // 32 GB is the minimum allowed size for Burstable B1ms Postgres
      // Flexible Server. autoGrow off so previews never silently scale up.
      storageSizeGB: 32
      autoGrow: 'Disabled'
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: {
      mode: 'Disabled'
    }
    network: {
      publicNetworkAccess: 'Enabled'
    }
  }
}

resource postgresAllowAzureServices 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2023-12-01-preview' = {
  name: 'AllowAllAzureServices'
  parent: postgres
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

resource postgresRequireTls 'Microsoft.DBforPostgreSQL/flexibleServers/configurations@2023-12-01-preview' = {
  name: 'require_secure_transport'
  parent: postgres
  properties: {
    value: 'ON'
    source: 'user-override'
  }
  dependsOn: [
    postgresAllowAzureServices
  ]
}

resource postgresDatabase 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-12-01-preview' = {
  name: databaseName
  parent: postgres
}

// ---------------------------------------------------------------------------
// User-assigned managed identity for the Container App. AcrPull on the
// shared preview ACR is granted to this identity by the cross-RG module
// below BEFORE the Container App is created.
// ---------------------------------------------------------------------------
resource managedIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-07-31-preview' = {
  name: identityName
  location: location
  tags: commonTags
}

// ---------------------------------------------------------------------------
// Cross-RG AcrPull grant. Scope is `rg-atomicly-preview-shared`, NOT this
// preview RG and NOT the dev RG.
// ---------------------------------------------------------------------------
module acrPullGrant 'preview-modules/previewAcrPull.bicep' = {
  name: 'preview-acr-pull-${prNumber}-${commitSha}'
  scope: resourceGroup(sharedAcrResourceGroup)
  params: {
    acrName: acrName
    principalId: managedIdentity.properties.principalId
    roleAssignmentNameSeed: '${prNumber}-${commitSha}-${appName}'
  }
}

// ---------------------------------------------------------------------------
// Container Apps Environment — Consumption profile only. No VNet integration
// (previews don't run inside the dev VNet).
// ---------------------------------------------------------------------------
resource containerAppEnv 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: caeName
  location: location
  tags: commonTags
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
    workloadProfiles: [
      {
        name: 'Consumption'
        workloadProfileType: 'Consumption'
      }
    ]
  }
}

// ---------------------------------------------------------------------------
// Container App. ipSecurityRestrictions.defaultAction = 'Deny' — runner +
// reviewer IPs are added by the workflow via `az containerapp ingress
// access-restriction set` after deploy. There are NO seed allow rules; the
// app is unreachable until a workflow job adds its IP (and removes it on
// trap EXIT).
//
// Image tag: pr-<pr>-<sha7>. Pull happens via the managed identity. AcrPull
// is granted by `acrPullGrant` above; Bicep ordering ensures the role
// assignment exists before the container starts.
// ---------------------------------------------------------------------------
resource containerApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: appName
  location: location
  tags: commonTags
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${managedIdentity.id}': {}
    }
  }
  dependsOn: [
    acrPullGrant
  ]
  properties: {
    managedEnvironmentId: containerAppEnv.id
    configuration: {
      activeRevisionsMode: 'Single'
      secrets: [
        {
          // Composed from the same admin password the workflow generated
          // and passed to the Postgres resource above. Container Apps
          // secrets are encrypted at rest and never appear in resource
          // properties or logs.
          name: 'database-url'
          value: 'postgresql://${postgresAdminUsername}:${postgresAdminPassword}@${postgresServerName}.postgres.database.azure.com:5432/${databaseName}?sslmode=require'
        }
        {
          name: 'auth-secret'
          value: authSecret
        }
      ]
      ingress: {
        external: true
        targetPort: 3000
        transport: 'auto'
        allowInsecure: false
        ipSecurityRestrictions: []
        traffic: [
          {
            weight: 100
            latestRevision: true
          }
        ]
      }
      registries: [
        {
          server: acrLoginServer
          identity: managedIdentity.id
        }
      ]
    }
    template: {
      scale: {
        minReplicas: 0
        maxReplicas: 1
        rules: []
      }
      containers: [
        {
          name: 'web'
          image: '${acrLoginServer}/atomicly:${imageTag}'
          resources: {
            // The preview exists to run the full Playwright E2E suite. 0.5 vCPU
            // rendered pages slowly enough that interactions raced and tests hit
            // their timeouts, so we give it 1 vCPU / 2Gi. minReplicas stays at 0
            // (scale-to-zero), so this larger size is only billed during the
            // short E2E burst, keeping the preview within its cost ceiling.
            cpu: json('1.0')
            memory: '2Gi'
          }
          env: [
            {
              name: 'NODE_ENV'
              value: 'production'
            }
            {
              name: 'HOSTNAME'
              value: '0.0.0.0'
            }
            {
              name: 'PORT'
              value: '3000'
            }
            {
              name: 'DEPLOYMENT_VERSION'
              value: 'preview-pr-${prNumber}-${commitSha}'
            }
            {
              // Ephemeral previews exist to run the full Playwright E2E suite,
              // which drives the versioned API from a single CI runner IP. That
              // burst legitimately exceeds the per-IP API rate-limit budget and
              // produces spurious 429s, so we disable the in-process limiter
              // here. Production never sets this flag (see proxy.ts), so its WAF
              // + in-process rate-limit backstop remain fully active.
              name: 'RATE_LIMIT_DISABLED'
              value: 'true'
            }
            {
              // Tell NextAuth to trust the preview hostname (we do not set
              // NEXTAUTH_URL; AUTH_TRUST_HOST=true is the supported way to
              // accept the request Host header in v5 when running behind a
              // proxy/ingress with a dynamic hostname).
              name: 'AUTH_TRUST_HOST'
              value: 'true'
            }
            {
              name: 'AUTH_SECRET'
              secretRef: 'auth-secret'
            }
            {
              name: 'DATABASE_URL'
              secretRef: 'database-url'
            }
          ]
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: '/api/healthz'
                port: 3000
              }
              initialDelaySeconds: 30
              periodSeconds: 10
              timeoutSeconds: 5
              failureThreshold: 6
            }
            {
              type: 'Readiness'
              httpGet: {
                path: '/api/healthz'
                port: 3000
              }
              initialDelaySeconds: 10
              periodSeconds: 5
              timeoutSeconds: 5
              failureThreshold: 12
            }
          ]
        }
      ]
    }
  }
}

// ---------------------------------------------------------------------------
// Outputs consumed by the workflow (`pr-preview.yml`).
// ---------------------------------------------------------------------------
@description('Container App FQDN; the workflow writes this to $GITHUB_OUTPUT and to the PR bot comment.')
output containerAppFqdn string = containerApp.properties.configuration.ingress.fqdn

@description('Container App name (for `az containerapp ingress access-restriction` calls).')
output containerAppName string = containerApp.name

@description('Postgres FQDN; used to build the DATABASE_URL passed to the migrator container.')
output postgresFqdn string = postgres.properties.fullyQualifiedDomainName

@description('Postgres server name (for `az postgres flexible-server firewall-rule` calls).')
output postgresServerName string = postgres.name

@description('Key Vault URI; preview app reads runtime secrets from here.')
output keyVaultUri string = keyVault.properties.vaultUri

@description('Key Vault name (used by teardown for `az keyvault purge`).')
output keyVaultName string = keyVault.name

@description('Database name (always `atomicly`).')
output databaseName string = databaseName
