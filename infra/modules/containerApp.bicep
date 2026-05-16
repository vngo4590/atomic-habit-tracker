@description('Azure region')
param location string = resourceGroup().location

@description('Name of the Container App Environment')
param environmentName string

@description('Name of the Container App')
param appName string

@description('ACR login server FQDN')
param acrLoginServer string

@description('Subnet resource ID for VNet integration')
param subnetId string

@description('Log Analytics workspace resource ID')
param logAnalyticsWorkspaceId string

@description('Container CPU cores')
param containerCpu string = '0.5'

@description('Container memory (Gi)')
param containerMemory string = '1Gi'

@description('Minimum replicas')
param minReplicas int = 0

@description('Maximum replicas')
param maxReplicas int = 3

@description('Docker image tag to deploy')
param imageTag string = 'dev-latest'

@description('Public URL exposed to users (Front Door endpoint)')
param appPublicUrl string

// ---------------------------------------------------------------------------
// User-assigned managed identity — created first so we can grant it access
// to ACR and Key Vault before the Container App starts.
// ---------------------------------------------------------------------------
resource managedIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-07-31-preview' = {
  name: '${appName}-identity'
  location: location
}

// ---------------------------------------------------------------------------
// Container Apps Environment — VNet-integrated so the app can reach
// PostgreSQL on its private IP.  Internal=false keeps public ingress open.
// ---------------------------------------------------------------------------
resource containerAppEnv 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: environmentName
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: reference(logAnalyticsWorkspaceId, '2023-09-01').customerId
        sharedKey: listKeys(logAnalyticsWorkspaceId, '2023-09-01').primarySharedKey
      }
    }
    vnetConfiguration: {
      infrastructureSubnetId: subnetId
      internal: false
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
// Container App — Next.js standalone runtime.
//
// NOTE: Key Vault secret references are applied AFTER deployment by the
// deployment script so that the secrets exist before the app tries to
// resolve them.  This avoids a chicken-and-egg problem during first provision.
//
// Environment variables:
//   • NODE_ENV=production
//   • HOSTNAME=0.0.0.0
//   • PORT=3000
//   • AUTH_URL & NEXT_PUBLIC_APP_URL = Front Door endpoint
//
// Probes:
//   • readiness on /api/healthz (10 s initial, 5 s period)
//   • liveness on /api/healthz (30 s initial, 10 s period)
//
// Scale:
//   • Min 0 (scale to zero when idle — keeps dev cost near zero)
//   • Max 3 (handles small bursts)
// ---------------------------------------------------------------------------
resource containerApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: appName
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${managedIdentity.id}': {}
    }
  }
  properties: {
    managedEnvironmentId: containerAppEnv.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: 3000
        transport: 'auto'
        allowInsecure: false
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
        minReplicas: minReplicas
        maxReplicas: maxReplicas
        rules: []
      }
      containers: [
        {
          name: 'web'
          image: '${acrLoginServer}/atomicly:${imageTag}'
          resources: {
            cpu: json(containerCpu)
            memory: '${containerMemory}Gi'
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
              name: 'AUTH_URL'
              value: appPublicUrl
            }
            {
              name: 'NEXT_PUBLIC_APP_URL'
              value: appPublicUrl
            }
            {
              name: 'DEPLOYMENT_VERSION'
              value: 'azure-dev'
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

output id string = containerApp.id
output name string = containerApp.name
output fqdn string = containerApp.properties.configuration.ingress.fqdn
output managedIdentityPrincipalId string = managedIdentity.properties.principalId
output managedIdentityId string = managedIdentity.id
