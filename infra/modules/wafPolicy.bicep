@description('Globally unique WAF policy name (alphanumeric only).')
param wafPolicyName string

@description('''
Front Door SKU the WAF policy attaches to. MUST match the Front Door profile SKU.
Managed rule sets (OWASP/DRS + Bot Manager) are only available on Premium.
''')
@allowed([
  'Standard_AzureFrontDoor'
  'Premium_AzureFrontDoor'
])
param skuName string = 'Premium_AzureFrontDoor'

@description('WAF enforcement mode. Prevention blocks malicious traffic; Detection only logs.')
@allowed([
  'Prevention'
  'Detection'
])
param mode string = 'Prevention'

// Managed rule sets (OWASP Default Rule Set + Bot Manager) are a Premium-only
// feature. We derive the flag from the SKU so a Standard deployment never tries
// to attach managed rules (which would fail validation).
var enableManagedRules = skuName == 'Premium_AzureFrontDoor'

// ---------------------------------------------------------------------------
// Web Application Firewall policy.
//
// WHY: This is the app's outermost shield. It runs at the Microsoft global edge
// BEFORE traffic reaches our origin, providing:
//   • Rate limiting (volumetric DDoS / brute-force mitigation) via custom rules.
//   • OWASP Default Rule Set (DRS 2.1) — blocks SQLi, XSS, RCE, path traversal,
//     and other common web attacks (Premium only).
//   • Bot Manager rule set — classifies and blocks known-bad bots and scrapers
//     while allowing verified good bots (Premium only).
// ---------------------------------------------------------------------------
resource wafPolicy 'Microsoft.Network/FrontDoorWebApplicationFirewallPolicies@2024-02-01' = {
  name: wafPolicyName
  location: 'Global'
  sku: {
    name: skuName
  }
  properties: {
    policySettings: {
      enabledState: 'Enabled'
      mode: mode
      // Inspect request bodies so injection payloads in POST data are caught.
      requestBodyCheck: 'Enabled'
      // Return a clear 403 when the WAF blocks a request.
      customBlockResponseStatusCode: 403
    }
    customRules: {
      rules: [
        // -------------------------------------------------------------------
        // Strict rate limit on authentication endpoints. WHY: login/register
        // are the brute-force and credential-stuffing targets, so we cap them
        // hard (40 requests / 5 min / client IP) at the edge.
        // -------------------------------------------------------------------
        {
          name: 'authRateLimit'
          priority: 90
          enabledState: 'Enabled'
          ruleType: 'RateLimitRule'
          rateLimitDurationInMinutes: 5
          rateLimitThreshold: 40
          matchConditions: [
            {
              matchVariable: 'RequestUri'
              operator: 'Contains'
              negateCondition: false
              matchValue: [
                '/api/auth/'
                '/login'
                '/register'
              ]
              transforms: [
                'Lowercase'
              ]
            }
          ]
          action: 'Block'
        }
        // -------------------------------------------------------------------
        // Global volumetric rate limit. WHY: a coarse ceiling (600 req / min /
        // client IP) absorbs application-layer floods. Every request URI
        // contains '/', so this matches all traffic.
        // -------------------------------------------------------------------
        {
          name: 'globalRateLimit'
          priority: 100
          enabledState: 'Enabled'
          ruleType: 'RateLimitRule'
          rateLimitDurationInMinutes: 1
          rateLimitThreshold: 600
          matchConditions: [
            {
              matchVariable: 'RequestUri'
              operator: 'Contains'
              negateCondition: false
              matchValue: [
                '/'
              ]
              transforms: []
            }
          ]
          action: 'Block'
        }
      ]
    }
    managedRules: enableManagedRules
      ? {
          managedRuleSets: [
            {
              // OWASP-derived rules covering the most common web exploits.
              ruleSetType: 'Microsoft_DefaultRuleSet'
              ruleSetVersion: '2.1'
              ruleSetAction: 'Block'
              ruleGroupOverrides: []
              exclusions: []
            }
            {
              // Bot reputation + behavioural classification.
              ruleSetType: 'Microsoft_BotManagerRuleSet'
              ruleSetVersion: '1.0'
              ruleGroupOverrides: []
              exclusions: []
            }
          ]
        }
      : {
          // Standard SKU: custom rate-limit rules only, no managed rule sets.
          managedRuleSets: []
        }
  }
}

@description('Resource ID of the WAF policy, used to associate it with a Front Door endpoint.')
output policyId string = wafPolicy.id

@description('Whether managed OWASP/Bot rule sets were enabled (Premium only).')
output managedRulesEnabled bool = enableManagedRules
