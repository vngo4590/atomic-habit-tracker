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

@description('Resource ID of the delegated subnet for private VNet access')
param subnetId string

@description('Resource ID of the VNet (for private DNS zone linking)')
param vnetId string

// ---------------------------------------------------------------------------
// Private DNS Zone — resolves the PostgreSQL FQDN to its private IP inside
// the VNet so the Container App never needs public routes to reach the DB.
// ---------------------------------------------------------------------------
resource privateDnsZone 'Microsoft.Network/privateDnsZones@2024-06-01' = {
  name: 'privatelink.postgres.database.azure.com'
  location: 'global'
}

// Link the DNS zone to the VNet so containers can resolve .postgres.database.azure.com
resource privateDnsZoneLink 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2024-06-01' = {
  name: '${privateDnsZone.name}-link'
  parent: privateDnsZone
  location: 'global'
  properties: {
    registrationEnabled: false
    virtualNetwork: {
      id: vnetId
    }
  }
}

// ---------------------------------------------------------------------------
// PostgreSQL Flexible Server — Burstable B1ms keeps dev cost low.
// Public access is fully disabled; only VNet-integrated clients can connect.
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
      delegatedSubnetResourceId: subnetId
      privateDnsZoneArmResourceId: privateDnsZone.id
      publicNetworkAccess: 'Disabled'
    }
  }
  dependsOn: [
    privateDnsZoneLink
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
