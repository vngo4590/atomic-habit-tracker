@description('Azure region')
param location string = resourceGroup().location

@description('Name of the App Service Plan')
param planName string

@description('SKU name (B1 is cheapest for Linux containers)')
param skuName string = 'B1'

// ---------------------------------------------------------------------------
// App Service Plan — Linux tier for containerised Next.js workload.
// B1 Basic is cost-effective for dev and supports custom containers + HTTPS.
// ---------------------------------------------------------------------------
resource plan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: planName
  location: location
  sku: {
    name: skuName
    tier: 'Basic'
    size: skuName
    family: 'B'
    capacity: 1
  }
  kind: 'linux'
  properties: {
    reserved: true
    perSiteScaling: false
    targetWorkerCount: 0
    targetWorkerSizeId: 0
  }
}

output id string = plan.id
output name string = plan.name
