@description('Azure region')
param location string = resourceGroup().location

@description('Name of the Web App')
param appName string

@description('App Service Plan resource ID')
param planId string

@description('ACR login server FQDN')
param acrLoginServer string

@description('Docker image tag to deploy')
param imageTag string = 'dev-latest'

@description('Log Analytics workspace resource ID for diagnostics')
param logAnalyticsWorkspaceId string = ''

// ---------------------------------------------------------------------------
// Web App — runs the Next.js standalone container.
//
// Security settings:
//   • HTTPS only
//   • FTPS disabled
//   • TLS 1.2 minimum
//   • System-assigned managed identity for ACR pull and Key Vault
//   • Health check endpoint for load-balancer probes
//   • Detailed logging enabled for diagnostics
//
// NOTE: App settings (DATABASE_URL, AUTH_SECRET, etc.) are injected
// post-deployment by the deploy script so secrets never live in Bicep.
// ---------------------------------------------------------------------------
resource webApp 'Microsoft.Web/sites@2023-12-01' = {
  name: appName
  location: location
  kind: 'app,linux'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: planId
    httpsOnly: true
    clientAffinityEnabled: false
    siteConfig: {
      linuxFxVersion: 'DOCKER|${acrLoginServer}/atomicly:${imageTag}'
      acrUseManagedIdentityCreds: true
      alwaysOn: true
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      scmMinTlsVersion: '1.2'
      healthCheckPath: '/api/healthz'
      httpLoggingEnabled: true
      detailedErrorLoggingEnabled: true
      requestTracingEnabled: true
      numberOfWorkers: 1
      // HTTP/2 is disabled because Azure Front Door Standard has protocol
      // compatibility issues when communicating with Linux container origins
      // over HTTP/2.  Front Door still serves HTTP/2 to clients; this only
      // affects the origin-to-Front-Door hop which falls back to HTTP/1.1.
      http20Enabled: false
    }
  }
}

// ---------------------------------------------------------------------------
// Diagnostic settings — ship logs and metrics to Log Analytics.
// ---------------------------------------------------------------------------
resource appServiceDiagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = if (!empty(logAnalyticsWorkspaceId)) {
  name: 'appServiceDiagnostics'
  scope: webApp
  properties: {
    workspaceId: logAnalyticsWorkspaceId
    logs: [
      {
        category: 'AppServiceHTTPLogs'
        enabled: true
      }
      {
        category: 'AppServiceConsoleLogs'
        enabled: true
      }
      {
        category: 'AppServiceAppLogs'
        enabled: true
      }
      {
        category: 'AppServiceAuditLogs'
        enabled: true
      }
    ]
    metrics: [
      {
        category: 'AllMetrics'
        enabled: true
      }
    ]
  }
}

output id string = webApp.id
output name string = webApp.name
output principalId string = webApp.identity.principalId
output defaultHostName string = webApp.properties.defaultHostName
