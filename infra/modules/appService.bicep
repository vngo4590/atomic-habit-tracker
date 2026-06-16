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

@description('Application Insights connection string injected into the web app runtime.')
param applicationInsightsConnectionString string = ''

// ---------------------------------------------------------------------------
// Web App — runs the Next.js standalone container.
//
// Security settings:
//   • HTTPS only
//   • FTPS disabled
//   • TLS 1.2 minimum
//   • Inbound restricted to the Azure Front Door service tag (deny by default)
//   • System-assigned managed identity for ACR pull and Key Vault
//   • Health check endpoint for load-balancer probes
//   • Detailed logging enabled for diagnostics
//
// NOTE: Secret app settings (DATABASE_URL, AUTH_SECRET, etc.) are injected
// post-deployment by the deploy script so secrets never live in Bicep.
// The non-secret Application Insights connection string is safe to stamp here.
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
      http20Enabled: true
      // -----------------------------------------------------------------------
      // Ingress lockdown — only Azure Front Door may reach the origin.
      // WHY: Without this, the public *.azurewebsites.net hostname is reachable
      // directly, letting an attacker bypass the Front Door WAF entirely. We
      // deny by default and allow only the AzureFrontDoor.Backend service tag.
      // A second, tighter X-Azure-FDID header restriction (pinning to OUR Front
      // Door instance) is added post-deployment by the CI workflow, because the
      // Front Door ID is not known until the Front Door is created.
      // -----------------------------------------------------------------------
      ipSecurityRestrictionsDefaultAction: 'Deny'
      ipSecurityRestrictions: [
        {
          name: 'Allow-AzureFrontDoor'
          description: 'Only accept inbound traffic from the Azure Front Door edge.'
          priority: 100
          action: 'Allow'
          tag: 'ServiceTag'
          ipAddress: 'AzureFrontDoor.Backend'
        }
      ]
      // Apply the same restrictions to the SCM/Kudu management site.
      scmIpSecurityRestrictionsUseMain: true
      appSettings: empty(applicationInsightsConnectionString)
        ? []
        : [
            {
              name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
              value: applicationInsightsConnectionString
            }
          ]
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
