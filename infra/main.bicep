targetScope = 'subscription'

// ---------------------------------------------------------------------------
// Atomicly Dev Infrastructure — Azure Bicep
// Region: australiaeast | Environment: dev
// ---------------------------------------------------------------------------
// This template deploys a secure, cost-conscious dev environment for the
// Atomicly Next.js habit tracker.  It provisions:
//   • Resource group
//   • Azure Container Registry (Basic)
//   • Log Analytics workspace for observability
//   • Virtual network with dedicated subnets for Container Apps and PostgreSQL
//   • Azure Database for PostgreSQL Flexible Server (private VNet access)
//   • Azure Key Vault for secret management
//   • Azure Container Apps environment + app (Next.js standalone container)
//   • Azure Front Door Standard with WAF for edge security and DDoS protection
//
// All data-plane traffic stays inside the VNet.  Secrets are injected from
// Key Vault at runtime via a user-assigned managed identity.
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

@description('Container CPU cores.')
param containerCpu string = '0.5'

@description('Container memory (Gi).')
param containerMemory string = '1Gi'

@description('Minimum replicas (0 = scale-to-zero for dev cost savings).')
param minReplicas int = 0

@description('Maximum replicas.')
param maxReplicas int = 3

@description('Docker image tag to deploy (e.g. dev-latest or git SHA).')
param imageTag string = 'dev-latest'

// ---------------------------------------------------------------------------
// Local naming helpers
// ---------------------------------------------------------------------------
var rgName = 'rg-${projectName}-${environment}-aue'
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
// Monitoring — Log Analytics (feeds Container Apps, Front Door diagnostics)
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
// Networking — VNet + delegated subnets for Container Apps and PostgreSQL
// ---------------------------------------------------------------------------
module networking 'modules/networking.bicep' = {
  name: 'networking'
  scope: rg
  params: {
    location: location
    vnetName: 'vnet-${projectName}-${environment}-aue'
    containerAppsSubnetName: 'containers'
    containerAppsSubnetPrefix: '10.0.0.0/23'
    postgresSubnetName: 'postgres'
    postgresSubnetPrefix: '10.0.2.0/28'
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
// PostgreSQL Flexible Server — private VNet integration only, no public access
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
    subnetId: networking.outputs.postgresSubnetId
    vnetId: networking.outputs.vnetId
  }
}

// ---------------------------------------------------------------------------
// Key Vault — holds runtime secrets; accessed by Container App via managed id
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
// Container Apps — Next.js runtime with health probes and Key Vault secrets
// ---------------------------------------------------------------------------
module containerApp 'modules/containerApp.bicep' = {
  name: 'containerApp'
  scope: rg
  params: {
    location: location
    environmentName: 'cae-${projectName}-${environment}-aue'
    appName: 'ca-${projectName}-${environment}-aue'
    acrLoginServer: acr.outputs.loginServer
    subnetId: networking.outputs.containerAppsSubnetId
    logAnalyticsWorkspaceId: monitoring.outputs.logAnalyticsWorkspaceId
    keyVaultName: keyvault.outputs.vaultName
    containerCpu: containerCpu
    containerMemory: containerMemory
    minReplicas: minReplicas
    maxReplicas: maxReplicas
    imageTag: imageTag
    appPublicUrl: frontDoorEndpointUrl
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
    originHostName: containerApp.outputs.fqdn
    logAnalyticsWorkspaceId: monitoring.outputs.logAnalyticsWorkspaceId
  }
}

// ---------------------------------------------------------------------------
// Post-deploy role assignment — grant Container App managed identity access
// to Key Vault so it can resolve secret references at runtime.
// ---------------------------------------------------------------------------
module keyVaultAccess 'modules/keyvaultAccess.bicep' = {
  name: 'keyVaultAccess'
  scope: rg
  params: {
    vaultName: keyvault.outputs.vaultName
    principalId: containerApp.outputs.managedIdentityPrincipalId
  }
}

// ---------------------------------------------------------------------------
// Post-deploy role assignment — grant Container App managed identity AcrPull
// so it can pull images from ACR without using admin credentials.
// ---------------------------------------------------------------------------
module acrPullAccess 'modules/acrPull.bicep' = {
  name: 'acrPullAccess'
  scope: rg
  params: {
    acrName: acr.outputs.name
    principalId: containerApp.outputs.managedIdentityPrincipalId
  }
}

// ---------------------------------------------------------------------------
// Outputs
// ---------------------------------------------------------------------------
output resourceGroupName string = rg.name
output acrLoginServer string = acr.outputs.loginServer
output acrName string = acr.outputs.name
output containerAppFqdn string = containerApp.outputs.fqdn
output frontDoorEndpoint string = frontDoorEndpointUrl
output postgresFqdn string = postgres.outputs.fqdn
output keyVaultUri string = keyvault.outputs.vaultUri
output keyVaultName string = keyvault.outputs.vaultName
output appInsightsConnectionString string = monitoring.outputs.appInsightsConnectionString
