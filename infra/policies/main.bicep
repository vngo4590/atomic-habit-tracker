// =============================================================================
// infra/policies/main.bicep — Azure Policy definitions + assignments for the
// PR-preview ecosystem (Phase 2 hardening of task §8.4).
// =============================================================================
//
// Scope: subscription. Defines and assigns both preview guardrails so the
// policy state is version-controlled IaC rather than a sequence of `az
// policy` commands documented in infra/README.md.
//
// Deploy with (requires Owner or User Access Administrator + Resource
// Policy Contributor on the subscription — the pr-preview principal has
// `Contributor` only and CANNOT deploy this template; an operator must):
//
//   az deployment sub create \
//     --name atomicly-preview-policies-$(date +%s) \
//     --location australiaeast \
//     --template-file infra/policies/main.bicep \
//     --parameters \
//       prPreviewPrincipalId=<sp object id> \
//       devResourceGroupName=rg-atomicly-dev-aue-<suffix>
//
// Idempotent. Re-running with the same parameters is a no-op.
// =============================================================================

targetScope = 'subscription'

@description('Object ID (NOT appId) of the pr-preview-atomicly service principal. Used by the deny-cross-rg-role-assignments policy to gate that principal specifically.')
param prPreviewPrincipalId string

@description('Name of the dev resource group that must be excluded from the deny-non-preview-rg policy assignment (its name does not match the rg-atomicly-pr-* pattern by design).')
param devResourceGroupName string

@description('Name of the shared preview resource group. Excluded for the same reason as the dev RG.')
param sharedPreviewResourceGroup string = 'rg-atomicly-preview-shared'

@description('Policy assignment effect override. Use Audit during initial roll-out to confirm the policy fires without blocking legitimate operations; switch to Deny once verified.')
@allowed([
  'Deny'
  'Audit'
  'Disabled'
])
param effect string = 'Deny'

var subId = subscription().subscriptionId
var devRgId = '/subscriptions/${subId}/resourceGroups/${devResourceGroupName}'
var sharedRgId = '/subscriptions/${subId}/resourceGroups/${sharedPreviewResourceGroup}'

// ---------------------------------------------------------------------------
// Policy definitions — loaded from the existing JSON files so the source of
// truth stays single-file. Bicep's `loadJsonContent` inlines them at build
// time.
// ---------------------------------------------------------------------------
var denyNonPreviewRgDef = loadJsonContent('./deny-non-preview-rg.json')
var denyCrossRgRoleDef = loadJsonContent('./deny-cross-rg-role-assignments.json')

resource denyNonPreviewRg 'Microsoft.Authorization/policyDefinitions@2023-04-01' = {
  name: 'atomicly-deny-non-preview-rg'
  properties: {
    displayName: denyNonPreviewRgDef.properties.displayName
    description: denyNonPreviewRgDef.properties.description
    policyType: 'Custom'
    mode: denyNonPreviewRgDef.properties.mode
    metadata: denyNonPreviewRgDef.properties.metadata
    parameters: denyNonPreviewRgDef.properties.parameters
    policyRule: denyNonPreviewRgDef.properties.policyRule
  }
}

resource denyCrossRgRole 'Microsoft.Authorization/policyDefinitions@2023-04-01' = {
  name: 'atomicly-deny-cross-rg-role-assignments'
  properties: {
    displayName: denyCrossRgRoleDef.properties.displayName
    description: denyCrossRgRoleDef.properties.description
    policyType: 'Custom'
    mode: denyCrossRgRoleDef.properties.mode
    metadata: denyCrossRgRoleDef.properties.metadata
    parameters: denyCrossRgRoleDef.properties.parameters
    policyRule: denyCrossRgRoleDef.properties.policyRule
  }
}

// ---------------------------------------------------------------------------
// Assignments — subscription-scope, with notScopes for the legitimate
// non-preview RGs.
// ---------------------------------------------------------------------------
resource denyNonPreviewRgAssignment 'Microsoft.Authorization/policyAssignments@2023-04-01' = {
  name: 'atomicly-deny-non-preview-rg'
  properties: {
    displayName: 'Atomicly — deny non-preview resource groups'
    policyDefinitionId: denyNonPreviewRg.id
    notScopes: [
      devRgId
      sharedRgId
    ]
    parameters: {
      effect: {
        value: effect
      }
    }
  }
}

resource denyCrossRgRoleAssignment 'Microsoft.Authorization/policyAssignments@2023-04-01' = {
  name: 'atomicly-deny-cross-rg-role-assignments'
  properties: {
    displayName: 'Atomicly — deny cross-RG role assignments by pr-preview principal'
    policyDefinitionId: denyCrossRgRole.id
    parameters: {
      effect: {
        value: effect
      }
      prPreviewPrincipalId: {
        value: prPreviewPrincipalId
      }
    }
  }
}

output denyNonPreviewRgDefinitionId string = denyNonPreviewRg.id
output denyCrossRgRoleDefinitionId string = denyCrossRgRole.id
