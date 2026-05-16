@description('Azure region')
param location string = resourceGroup().location

@description('VNet name')
param vnetName string

@description('Subnet name for Container Apps environment')
param containerAppsSubnetName string = 'containers'

@description('CIDR for Container Apps subnet (must be /23 or larger)')
param containerAppsSubnetPrefix string = '10.0.0.0/23'

@description('Subnet name for PostgreSQL delegation')
param postgresSubnetName string = 'postgres'

@description('CIDR for PostgreSQL subnet (must be /28 or larger)')
param postgresSubnetPrefix string = '10.0.2.0/28'

// ---------------------------------------------------------------------------
// Virtual Network — isolates all private traffic between the app and DB.
// ---------------------------------------------------------------------------
resource vnet 'Microsoft.Network/virtualNetworks@2024-05-01' = {
  name: vnetName
  location: location
  properties: {
    addressSpace: {
      addressPrefixes: [
        '10.0.0.0/16'
      ]
    }
    subnets: [
      {
        name: containerAppsSubnetName
        properties: {
          addressPrefix: containerAppsSubnetPrefix
          delegations: [
            {
              name: 'containerAppsEnvDelegation'
              properties: {
                serviceName: 'Microsoft.App/environments'
              }
            }
          ]
        }
      }
      {
        name: postgresSubnetName
        properties: {
          addressPrefix: postgresSubnetPrefix
          delegations: [
            {
              name: 'postgresqlDelegation'
              properties: {
                serviceName: 'Microsoft.DBforPostgreSQL/flexibleServers'
              }
            }
          ]
          serviceEndpoints: []
          privateEndpointNetworkPolicies: 'Disabled'
          privateLinkServiceNetworkPolicies: 'Enabled'
        }
      }
    ]
  }
}

output vnetId string = vnet.id
output vnetName string = vnet.name
output containerAppsSubnetId string = resourceId('Microsoft.Network/virtualNetworks/subnets', vnet.name, containerAppsSubnetName)
output postgresSubnetId string = resourceId('Microsoft.Network/virtualNetworks/subnets', vnet.name, postgresSubnetName)
