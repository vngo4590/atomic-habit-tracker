@description('Azure region')
param location string = resourceGroup().location

@description('Globally unique ACR name (alphanumeric, 5–50 chars)')
param acrName string

// ---------------------------------------------------------------------------
// Azure Container Registry — stores the built Next.js standalone image.
// Basic SKU is sufficient for dev workloads and keeps cost minimal.
// Admin account is disabled; we rely on managed-identity AcrPull instead.
// ---------------------------------------------------------------------------
resource acr 'Microsoft.ContainerRegistry/registries@2023-11-01-preview' = {
  name: acrName
  location: location
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: false
    anonymousPullEnabled: false
  }
}

output id string = acr.id
output name string = acr.name
output loginServer string = acr.properties.loginServer
