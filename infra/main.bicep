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
//   • Azure Front Door Standard with WAF for edge security and DDoS protection
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

// ---------------------------------------------------------------------------
// Local naming helpers
// ---------------------------------------------------------------------------
var rgName = 'rg-${projectName}-${environment}-aue-${uniqueSuffix}'
var baseName = '${projectName}${environment}${uniqueSuffix}'
var frontDoorEndpointName = '${projectName}-${environment}-${uniqueSuffix}'
var frontDoorEndpointUrl = 'https://${frontDoorEndpointName}.azurefd.net'

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
    logAnalyticsName: 'law-${projectName}-${environment}-aue'
    appInsightsName: 'appi-${projectName}-${environment}-aue'
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
    appName: 'app-${projectName}-${environment}-aue'
    planId: appServicePlan.outputs.id
    acrLoginServer: acr.outputs.loginServer
    imageTag: imageTag
    appInsightsConnectionString: monitoring.outputs.appInsightsConnectionString
  }
}

// ---------------------------------------------------------------------------
// Front Door — global edge, WAF OWASP rules, built-in DDoS protection
// ---------------------------------------------------------------------------
module frontDoor 'modules/frontDoor.bicep' = {
  name: 'frontDoor'
  scope: rg
  params: {
    profileName: 'afd-${projectName}${environment}${uniqueSuffix}'
    endpointName: frontDoorEndpointName
    originHostName: appService.outputs.defaultHostName
    logAnalyticsWorkspaceId: monitoring.outputs.logAnalyticsWorkspaceId
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
output frontDoorEndpoint string = frontDoorEndpointUrl
output postgresFqdn string = postgres.outputs.fqdn
output keyVaultUri string = keyvault.outputs.vaultUri
output keyVaultName string = keyvault.outputs.vaultName
output appInsightsConnectionString string = monitoring.outputs.appInsightsConnectionString
