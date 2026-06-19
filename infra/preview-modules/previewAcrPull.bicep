// =============================================================================
// previewAcrPull.bicep — cross-RG AcrPull grant for a preview Container App
// =============================================================================
//
// Deployed by `infra/preview.bicep` with `scope: resourceGroup('rg-atomicly-
// preview-shared')` so the role assignment lives in the SHARED preview RG
// (where the ACR is) rather than in the per-PR preview RG. The AcrPull role
// definition is referenced via subscriptionResourceId so we never need the
// dev RG.
//
// WHY a separate module from infra/modules/acrPull.bicep: that module is
// consumed by main.bicep at the dev RG scope. Re-using it would require
// passing a different scope at the call site, which Bicep does support, but
// the role-assignment GUID seed would still collide with main.bicep's seed
// for the dev app's identity. A purpose-built module with an explicit seed
// keeps both deploy paths independent and the preview-only behaviour
// obvious.
// =============================================================================

@description('Name of the shared preview ACR (without `.azurecr.io`).')
param acrName string

@description('Principal ID of the preview Container App managed identity (user-assigned).')
param principalId string

@description('Stable seed used to derive the role-assignment GUID. Should include the PR number, commit SHA, and Container App name so a re-deploy with the same identity is idempotent but a new identity gets a fresh assignment.')
param roleAssignmentNameSeed string

// AcrPull built-in role definition ID — stable across all Azure subscriptions.
var acrPullRoleId = '7f951dda-4ed3-4680-a7ca-43fe172d538d'

resource acr 'Microsoft.ContainerRegistry/registries@2023-11-01-preview' existing = {
  name: acrName
}

resource acrPullAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(acr.id, principalId, acrPullRoleId, roleAssignmentNameSeed)
  scope: acr
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', acrPullRoleId)
    principalId: principalId
    principalType: 'ServicePrincipal'
  }
}
