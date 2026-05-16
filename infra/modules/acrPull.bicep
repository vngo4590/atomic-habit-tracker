@description('Name of the Azure Container Registry')
param acrName string

@description('Principal ID of the managed identity to grant access')
param principalId string

// ---------------------------------------------------------------------------
// Role assignment — AcrPull.
// Grants the Container App managed identity permission to pull images
// from ACR without needing admin credentials or service-principal secrets.
// ---------------------------------------------------------------------------
var acrPullRoleId = '7f951dda-4ed3-4680-a7ca-43fe172d538d'

resource acr 'Microsoft.ContainerRegistry/registries@2023-11-01-preview' existing = {
  name: acrName
}

resource roleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(acr.id, principalId, acrPullRoleId)
  scope: acr
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', acrPullRoleId)
    principalId: principalId
    principalType: 'ServicePrincipal'
  }
}
