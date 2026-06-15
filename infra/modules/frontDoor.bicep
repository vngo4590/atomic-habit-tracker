@description('Globally unique Front Door profile name')
param profileName string

@description('Globally unique endpoint name')
param endpointName string

@description('Backend host name (App Service default hostname)')
param originHostName string

@description('Log Analytics workspace resource ID for diagnostics')
param logAnalyticsWorkspaceId string

@description('''
Front Door SKU. Premium is required for WAF managed rule sets (OWASP DRS + Bot
Manager). Standard supports custom WAF rules (rate limiting) only.
''')
@allowed([
  'Standard_AzureFrontDoor'
  'Premium_AzureFrontDoor'
])
param skuName string = 'Standard_AzureFrontDoor'

@description('Resource ID of the WAF policy to attach to the endpoint. Empty skips WAF.')
param wafPolicyId string = ''

// ---------------------------------------------------------------------------
// Front Door Profile — global anycast edge, caching, TLS termination, and
// built-in network-layer (L3/L4) DDoS protection at the Microsoft edge.
// Premium additionally unlocks the managed WAF rule sets configured in
// modules/wafPolicy.bicep.
// ---------------------------------------------------------------------------
resource profile 'Microsoft.Cdn/profiles@2024-09-01' = {
  name: profileName
  location: 'Global'
  sku: {
    name: skuName
  }
  properties: {
    originResponseTimeoutSeconds: 60
  }
}

// ---------------------------------------------------------------------------
// Front Door Endpoint — serves traffic on <name>.azurefd.net
// No custom domain required for dev.
//
// NOTE: In some Azure subscriptions/regions, Front Door Standard endpoints
// deployed via Bicep can get stuck with deploymentStatus: 'NotStarted'.
// This is an Azure platform issue — the endpoint hostname resolves but
// returns HTTP 404 because the route never reaches the edge POPs.
// The deploy-local.sh script and CI/CD workflow detect this and fall back
// to the App Service direct URL. See infra/README.md for details.
// ---------------------------------------------------------------------------
resource endpoint 'Microsoft.Cdn/profiles/afdEndpoints@2024-09-01' = {
  name: endpointName
  parent: profile
  location: 'Global'
  properties: {
    enabledState: 'Enabled'
  }
}

// ---------------------------------------------------------------------------
// Origin Group — defines health probes, load balancing, and session affinity.
// ---------------------------------------------------------------------------
resource originGroup 'Microsoft.Cdn/profiles/originGroups@2024-09-01' = {
  name: 'atomicly-origin-group'
  parent: profile
  properties: {
    loadBalancingSettings: {
      sampleSize: 4
      successfulSamplesRequired: 3
      additionalLatencyInMilliseconds: 50
    }
    healthProbeSettings: {
      probePath: '/api/healthz'
      probeRequestType: 'GET'
      probeProtocol: 'Https'
      probeIntervalInSeconds: 120
    }
    sessionAffinityState: 'Disabled'
  }
}

// ---------------------------------------------------------------------------
// Origin — the App Service backend.  We use the App Service hostname
// and preserve the host header so the App Service routing works.
// ---------------------------------------------------------------------------
resource origin 'Microsoft.Cdn/profiles/originGroups/origins@2024-09-01' = {
  name: 'atomicly-origin'
  parent: originGroup
  properties: {
    hostName: originHostName
    httpPort: 80
    httpsPort: 443
    originHostHeader: originHostName
    priority: 1
    weight: 1000
    enabledState: 'Enabled'
    enforceCertificateNameCheck: true
  }
}

// ---------------------------------------------------------------------------
// Route — maps the endpoint to the origin group with HTTPS redirect,
// caching disabled for dynamic app content, and compression off.
// ---------------------------------------------------------------------------
resource route 'Microsoft.Cdn/profiles/afdEndpoints/routes@2024-09-01' = {
  name: 'default-route'
  parent: endpoint
  dependsOn: [
    origin
  ]
  properties: {
    originGroup: {
      id: originGroup.id
    }
    supportedProtocols: [
      'Https'
    ]
    patternsToMatch: [
      '/*'
    ]
    forwardingProtocol: 'HttpsOnly'
    linkToDefaultDomain: 'Enabled'
    httpsRedirect: 'Enabled'
    cacheConfiguration: {
      queryStringCachingBehavior: 'IgnoreQueryString'
      compressionSettings: {
        isCompressionEnabled: false
        contentTypesToCompress: []
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Diagnostics — send Front Door access logs to Log Analytics.
// ---------------------------------------------------------------------------
resource frontDoorDiagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: 'frontDoorDiagnostics'
  scope: profile
  properties: {
    workspaceId: logAnalyticsWorkspaceId
    logs: [
      {
        category: 'FrontDoorAccessLog'
        enabled: true
      }
    ]
    metrics: [
      {
        category: 'AllMetrics'
        enabled: true
      }
    ]
  }
}

// ---------------------------------------------------------------------------
// Security Policy — associates the WAF policy with this endpoint so every
// request that hits the edge is inspected before being forwarded to the origin.
// Only created when a WAF policy ID is supplied.
// ---------------------------------------------------------------------------
resource securityPolicy 'Microsoft.Cdn/profiles/securityPolicies@2024-09-01' = if (!empty(wafPolicyId)) {
  name: 'atomicly-waf-association'
  parent: profile
  properties: {
    parameters: {
      type: 'WebApplicationFirewall'
      wafPolicy: {
        id: wafPolicyId
      }
      associations: [
        {
          domains: [
            {
              id: endpoint.id
            }
          ]
          patternsToMatch: [
            '/*'
          ]
        }
      ]
    }
  }
}

output profileId string = profile.id
output endpointHostName string = endpoint.properties.hostName
@description('Front Door instance GUID — used to lock the App Service origin to THIS Front Door via the X-Azure-FDID header.')
output frontDoorId string = profile.properties.frontDoorId
