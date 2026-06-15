@description('Azure region')
param location string = resourceGroup().location

@description('Globally unique PostgreSQL flexible server name')
param serverName string

@description('Admin username')
param adminUsername string

@description('Admin password')
@secure()
param adminPassword string

@description('Initial database name')
param databaseName string = 'atomicly'

// ---------------------------------------------------------------------------
// PostgreSQL Flexible Server — Burstable B1ms keeps dev cost low.
// Public access is enabled but locked down to Azure services and an
// optional local-admin IP range applied post-deployment.
// ---------------------------------------------------------------------------
resource postgres 'Microsoft.DBforPostgreSQL/flexibleServers@2023-12-01-preview' = {
  name: serverName
  location: location
  sku: {
    name: 'Standard_B1ms'
    tier: 'Burstable'
  }
  properties: {
    version: '16'
    administratorLogin: adminUsername
    administratorLoginPassword: adminPassword
    storage: {
      storageSizeGB: 32
      autoGrow: 'Enabled'
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

// ---------------------------------------------------------------------------
// Firewall rule — allows Azure services (e.g. the App Service) to reach the DB
// over the public endpoint. (0.0.0.0 → 0.0.0.0 is the Azure-services magic
// range.)
//
// RESIDUAL RISK (documented in docs/architecture/security.md): the server still
// has a public endpoint. The hardened end-state is VNet integration + a private
// endpoint (the networking module already provisions a delegated Postgres
// subnet for this). That change is deferred because it cannot be validated
// without a live deployment; until then access is gated by this Azure-services
// rule + enforced TLS + a strong admin password held in Key Vault.
// ---------------------------------------------------------------------------
resource allowAzureServices 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2023-12-01-preview' = {
  name: 'AllowAllAzureServices'
  parent: postgres
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

// ---------------------------------------------------------------------------
// Enforce encrypted connections. WHY: data in motion between the app and the
// database must never travel in clear text. `require_secure_transport = ON`
// rejects any non-TLS connection at the server (the app already connects with
// sslmode=require). This is the Flexible Server default; we set it explicitly
// so the guarantee is captured in source control and cannot silently drift.
// ---------------------------------------------------------------------------
resource requireSecureTransport 'Microsoft.DBforPostgreSQL/flexibleServers/configurations@2023-12-01-preview' = {
  name: 'require_secure_transport'
  parent: postgres
  properties: {
    value: 'ON'
    source: 'user-override'
  }
  dependsOn: [
    allowAzureServices
  ]
}

// ---------------------------------------------------------------------------
// Create the application database (atomicly) if it doesn't exist.
// ---------------------------------------------------------------------------
resource database 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-12-01-preview' = {
  name: databaseName
  parent: postgres
}

output id string = postgres.id
output name string = postgres.name
output fqdn string = postgres.properties.fullyQualifiedDomainName
