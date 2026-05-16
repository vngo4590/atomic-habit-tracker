@description('Name of the Key Vault')
param vaultName string

@description('Principal ID of the managed identity to grant access')
param principalId string

// ---------------------------------------------------------------------------
// Role assignment — Key Vault Secrets User.
// Grants the Container App managed identity read-only access to secrets
// so the platform can resolve Key Vault references at container start time.
// ---------------------------------------------------------------------------
var keyVaultSecretsUserRoleId = '4633458b-17de-408a-b874-0445c86b69e6'

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: vaultName
}

resource roleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, principalId, keyVaultSecretsUserRoleId)
  scope: keyVault
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', keyVaultSecretsUserRoleId)
    principalId: principalId
    principalType: 'ServicePrincipal'
  }
}
