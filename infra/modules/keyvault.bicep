@description('Azure region')
param location string = resourceGroup().location

@description('Globally unique Key Vault name (3–24 alphanumeric + hyphens)')
param vaultName string

@description('Azure AD tenant ID')
param tenantId string

// ---------------------------------------------------------------------------
// Key Vault — stores runtime secrets (DB URL, auth secret).
// Soft-delete and purge protection are enabled for recovery safety.
// Public access is kept enabled so GitHub Actions can seed secrets,
// but we rely on RBAC (not access policies) for fine-grained control.
// ---------------------------------------------------------------------------
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: vaultName
  location: location
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: tenantId
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 7
    enablePurgeProtection: true
    publicNetworkAccess: 'Enabled'
    networkAcls: {
      defaultAction: 'Allow'
      bypass: 'AzureServices'
    }
  }
}

output id string = keyVault.id
output name string = keyVault.name
output vaultName string = keyVault.name
output vaultUri string = keyVault.properties.vaultUri
