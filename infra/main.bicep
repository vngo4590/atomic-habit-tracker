targetScope = 'subscription'

// ---------------------------------------------------------------------------
// Atomicly Dev Infrastructure — Azure Bicep
// Region: australiaeast | Environment: dev
// ---------------------------------------------------------------------------
// This template deploys a secure, cost-conscious dev environment for the
// Atomicly Next.js habit tracker.  It provisions:
//   • Resource group
//   • Azure Container Registry (Basic)
//   • Log Analytics workspace + Application Insights for observability
//   • Azure Database for PostgreSQL Flexible Server (public access locked
//     down to Azure services + optional admin IP)
//   • Azure Key Vault for secret management
//   • Azure App Service Plan + Web App (Linux container)
//   • Azure Front Door (Standard by default) with a WAF policy (custom rate
//     limiting + bot/UA block rules) for edge, bot and DDoS protection.
//     Premium optionally adds OWASP + Bot Manager managed rule sets. The App
//     Service origin is locked to the Front Door so the WAF cannot be bypassed.
//
// Secrets are stored in Key Vault and injected at runtime via a
// system-assigned managed identity.
// ---------------------------------------------------------------------------

@description('Environment name (dev, staging, prod).')
param environment string = 'dev'

@description('Azure region for all resources.')
param location string = 'australiaeast'

@description('Short project identifier used in resource names.')
param projectName string = 'atomicly'

@description('Globally-unique suffix (e.g. 8-char hex) to avoid naming collisions.')
param uniqueSuffix string

@description('PostgreSQL flexible-server admin username.')
param postgresAdminUsername string = 'psqladmin'

@description('PostgreSQL admin password.  Must be strong.')
@secure()
param postgresAdminPassword string

@description('Docker image tag to deploy (e.g. dev-latest or git SHA).')
param imageTag string = 'dev-latest'

@description('''
Front Door SKU. Standard (default) is ~10x cheaper (~$35/mo vs ~$330/mo) and
supports custom WAF rules including rate limiting and bot/UA block rules.
Premium additionally enables WAF managed rule sets (OWASP DRS + Bot Manager).
We default to Standard and compensate for the missing managed rules with custom
WAF rules, a Turnstile bot challenge on auth, and app-layer hardening. Switch to
Premium for managed-signature/zero-day coverage. See docs/architecture/security.md.
''')
@allowed([
  'Standard_AzureFrontDoor'
  'Premium_AzureFrontDoor'
])
param frontDoorSku string = 'Standard_AzureFrontDoor'

// ---------------------------------------------------------------------------
// Local naming helpers
// ---------------------------------------------------------------------------
var rgName = 'rg-${projectName}-${environment}-aue-${uniqueSuffix}'
var baseName = '${projectName}${environment}${uniqueSuffix}'
var appServiceName = 'app-${projectName}-${environment}-aue'
var appServiceId = resourceId(subscription().subscriptionId, rg.name, 'Microsoft.Web/sites', appServiceName)
var frontDoorEndpointName = '${projectName}-${environment}-${uniqueSuffix}'
// NOTE: Front Door Standard auto-generates a unique hash suffix for the endpoint
// hostname (e.g. atomicly-dev-XXXX-fab7fhdwbsehg7af.z01.azurefd.net).  This
// hash is NOT available at Bicep deployment time, so we cannot construct the
// real URL here.  The deploy script queries the actual hostname via REST API
// after the deployment completes.

// ---------------------------------------------------------------------------
// Resource Group
// ---------------------------------------------------------------------------
resource rg 'Microsoft.Resources/resourceGroups@2024-11-01' = {
  name: rgName
  location: location
  tags: {
    environment: environment
    project: projectName
    managedBy: 'bicep'
  }
}

// ---------------------------------------------------------------------------
// Monitoring — Log Analytics (feeds diagnostics)
// ---------------------------------------------------------------------------
module monitoring 'modules/monitoring.bicep' = {
  name: 'monitoring'
  scope: rg
  params: {
    location: location
    environment: environment
    uniqueSuffix: uniqueSuffix
    appServiceId: appServiceId
  }
}

// ---------------------------------------------------------------------------
// Container Registry — stores the Next.js standalone Docker image
// ---------------------------------------------------------------------------
module acr 'modules/acr.bicep' = {
  name: 'acr'
  scope: rg
  params: {
    location: location
    acrName: 'cr${baseName}'
  }
}

// ---------------------------------------------------------------------------
// PostgreSQL Flexible Server — public access with Azure-services firewall
// ---------------------------------------------------------------------------
module postgres 'modules/postgres.bicep' = {
  name: 'postgres'
  scope: rg
  params: {
    location: location
    serverName: 'psql-${projectName}-${environment}-aue-${uniqueSuffix}'
    adminUsername: postgresAdminUsername
    adminPassword: postgresAdminPassword
    databaseName: 'atomicly'
  }
}

// ---------------------------------------------------------------------------
// Key Vault — holds runtime secrets; accessed by Web App via managed id
// ---------------------------------------------------------------------------
module keyvault 'modules/keyvault.bicep' = {
  name: 'keyvault'
  scope: rg
  params: {
    location: location
    vaultName: 'kv-${projectName}${environment}${uniqueSuffix}'
    tenantId: subscription().tenantId
  }
}

// ---------------------------------------------------------------------------
// App Service Plan + Web App — Next.js standalone container runtime
// ---------------------------------------------------------------------------
module appServicePlan 'modules/appServicePlan.bicep' = {
  name: 'appServicePlan'
  scope: rg
  params: {
    location: location
    planName: 'plan-${projectName}-${environment}-aue'
  }
}

module appService 'modules/appService.bicep' = {
  name: 'appService'
  scope: rg
  params: {
    location: location
    appName: appServiceName
    planId: appServicePlan.outputs.id
    acrLoginServer: acr.outputs.loginServer
    imageTag: imageTag
    logAnalyticsWorkspaceId: monitoring.outputs.logAnalyticsWorkspaceId
    applicationInsightsConnectionString: monitoring.outputs.connectionString
  }
}

// ---------------------------------------------------------------------------
// Web Application Firewall policy — edge OWASP/Bot/rate-limit rules. Deployed
// before Front Door so its ID can be associated with the endpoint.
// ---------------------------------------------------------------------------
module wafPolicy 'modules/wafPolicy.bicep' = {
  name: 'wafPolicy'
  scope: rg
  params: {
    // WAF policy names must be alphanumeric only (no hyphens).
    wafPolicyName: 'waf${baseName}'
    skuName: frontDoorSku
    mode: 'Prevention'
  }
}

// ---------------------------------------------------------------------------
// Front Door — global edge, WAF (OWASP + Bot Manager on Premium), built-in
// network-layer DDoS protection. The WAF policy is associated via securityPolicy.
// ---------------------------------------------------------------------------
module frontDoor 'modules/frontDoor.bicep' = {
  name: 'frontDoor'
  scope: rg
  params: {
    profileName: 'afd-${projectName}${environment}${uniqueSuffix}'
    endpointName: frontDoorEndpointName
    originHostName: appService.outputs.defaultHostName
    logAnalyticsWorkspaceId: monitoring.outputs.logAnalyticsWorkspaceId
    skuName: frontDoorSku
    wafPolicyId: wafPolicy.outputs.policyId
  }
}

// ---------------------------------------------------------------------------
// Post-deploy role assignments — grant Web App managed identity access
// to Key Vault and ACR.  These are created after the Web App so the
// principalId is known.
// ---------------------------------------------------------------------------
module keyVaultAccess 'modules/keyvaultAccess.bicep' = {
  name: 'keyVaultAccess'
  scope: rg
  params: {
    vaultName: keyvault.outputs.vaultName
    principalId: appService.outputs.principalId
  }
}

module acrPullAccess 'modules/acrPull.bicep' = {
  name: 'acrPullAccess'
  scope: rg
  params: {
    acrName: acr.outputs.name
    principalId: appService.outputs.principalId
  }
}

// ---------------------------------------------------------------------------
// Outputs
// ---------------------------------------------------------------------------
output resourceGroupName string = rg.name
output acrLoginServer string = acr.outputs.loginServer
output acrName string = acr.outputs.name
output appServiceName string = appService.outputs.name
output appServiceHostName string = appService.outputs.defaultHostName
// WARNING: This may return the short base name (without Azure's auto-generated
// hash suffix) because Bicep evaluates outputs during deployment.  Always
// verify the actual hostname via REST API after deployment.
output frontDoorEndpoint string = 'https://${frontDoor.outputs.endpointHostName}'
output postgresFqdn string = postgres.outputs.fqdn
output keyVaultUri string = keyvault.outputs.vaultUri
output keyVaultName string = keyvault.outputs.vaultName
output appInsightsConnectionString string = monitoring.outputs.connectionString
@description('Front Door instance GUID. CI uses this to add an X-Azure-FDID access restriction so the App Service origin only accepts traffic from THIS Front Door.')
output frontDoorId string = frontDoor.outputs.frontDoorId
@description('Whether Premium WAF managed rule sets (OWASP DRS + Bot Manager) are active.')
output wafManagedRulesEnabled bool = wafPolicy.outputs.managedRulesEnabled
