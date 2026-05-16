@description('Globally unique Front Door profile name')
param profileName string

@description('Globally unique endpoint name')
param endpointName string

@description('Backend host name (Container App FQDN)')
param originHostName string

@description('Log Analytics workspace resource ID for diagnostics')
param logAnalyticsWorkspaceId string

// ---------------------------------------------------------------------------
// Front Door Profile — Standard SKU provides global anycast edge, caching,
// TLS termination, and built-in DDoS protection at the Microsoft network edge.
// ---------------------------------------------------------------------------
resource profile 'Microsoft.Cdn/profiles@2024-09-01' = {
  name: profileName
  location: 'Global'
  sku: {
    name: 'Standard_AzureFrontDoor'
  }
  properties: {
    originResponseTimeoutSeconds: 60
  }
}

// ---------------------------------------------------------------------------
// WAF Policy — OWASP Core Rule Set to block common attacks
// (SQLi, XSS, LFI, RFI, etc.).  Mode=Prevention actively blocks requests.
// ---------------------------------------------------------------------------
resource wafPolicy 'Microsoft.Network/frontDoorWebApplicationFirewallPolicies@2024-05-01' = {
  name: '${profileName}-waf'
  location: 'Global'
  sku: {
    name: 'Standard_AzureFrontDoor'
  }
  properties: {
    policySettings: {
      enabledState: 'Enabled'
      mode: 'Prevention'
      requestBodyCheck: 'Enabled'
    }
    managedRules: {
      managedRuleSets: [
        {
          ruleSetType: 'Microsoft_DefaultRuleSet'
          ruleSetVersion: '2.1'
          ruleSetAction: 'Block'
          exclusions: []
          ruleGroupOverrides: []
        }
        {
          ruleSetType: 'Microsoft_BotManagerRuleSet'
          ruleSetVersion: '1.1'
          ruleSetAction: 'Block'
          exclusions: []
          ruleGroupOverrides: []
        }
      ]
    }
  }
}

// ---------------------------------------------------------------------------
// Front Door Endpoint — serves traffic on <name>.azurefd.net
// No custom domain required for dev.
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
// Origin — the Container App backend.  We use the Container App FQDN
// and preserve the host header so the Container Apps ingress routing works.
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
// Security Policy — links the WAF policy to the endpoint.
// ---------------------------------------------------------------------------
resource securityPolicy 'Microsoft.Cdn/profiles/securityPolicies@2024-09-01' = {
  name: 'waf-policy-link'
  parent: profile
  dependsOn: [
    route
  ]
  properties: {
    parameters: {
      type: 'WebApplicationFirewall'
      wafPolicy: {
        id: wafPolicy.id
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

// ---------------------------------------------------------------------------
// Diagnostics — send Front Door access logs and WAF logs to Log Analytics.
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
      {
        category: 'FrontDoorWebApplicationFirewallLog'
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

output profileId string = profile.id
output endpointHostName string = endpoint.properties.hostName
output wafPolicyId string = wafPolicy.id
