targetScope = 'resourceGroup'

@description('Azure region.')
param location string = resourceGroup().location

@description('Environment name (dev, staging, prod).')
param environment string

@description('Globally unique suffix added to shared resource names.')
param uniqueSuffix string

@description('Resource ID of the App Service that emits application telemetry.')
param appServiceId string

var logAnalyticsName = 'law-atomicly-${environment}-aue-${uniqueSuffix}'
var appInsightsName = 'appi-atomicly-${environment}-aue-${uniqueSuffix}'
var errorRateAlertName = 'alert-errors-atomicly-${environment}-aue-${uniqueSuffix}'
var authFailureAlertName = 'alert-authfail-atomicly-${environment}-aue-${uniqueSuffix}'
var uncaughtExceptionAlertName = 'alert-uncaught-atomicly-${environment}-aue-${uniqueSuffix}'
var commonTags = {
  environment: environment
  project: 'atomicly'
  managedBy: 'bicep'
}

// ---------------------------------------------------------------------------
// Log Analytics Workspace — central ingestion point for app traces, platform
// diagnostics, and alert queries. Retention stays short in dev to control cost.
// ---------------------------------------------------------------------------
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: logAnalyticsName
  location: location
  tags: commonTags
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
    features: {
      enableLogAccessUsingOnlyResourcePermissions: true
    }
  }
}

// ---------------------------------------------------------------------------
// Application Insights — workspace-based telemetry for the Atomicly web app.
// The hidden-link tag helps Azure show the App Service and Insights resource as
// a connected pair in the portal.
// ---------------------------------------------------------------------------
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  kind: 'web'
  tags: union(commonTags, {
    'hidden-link:${appServiceId}': 'Resource'
  })
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}

// ---------------------------------------------------------------------------
// Error-rate spike alert — catches bursts of unexpected exceptions that usually
// mean users are hitting a broken path right now.
// ---------------------------------------------------------------------------
resource errorRateSpikeAlert 'Microsoft.Insights/scheduledQueryRules@2023-12-01' = {
  name: errorRateAlertName
  location: location
  kind: 'LogAlert'
  tags: commonTags
  properties: {
    displayName: 'Atomicly ${environment} error rate spike'
    description: 'Alert when the app records more than 10 exceptions in 5 minutes.'
    enabled: true
    severity: 2
    evaluationFrequency: 'PT5M'
    windowSize: 'PT5M'
    scopes: [
      appInsights.id
    ]
    criteria: {
      allOf: [
        {
          query: 'union isfuzzy=true AppExceptions | where TimeGenerated >= ago(5m)'
          timeAggregation: 'Count'
          operator: 'GreaterThan'
          threshold: 10
          failingPeriods: {
            numberOfEvaluationPeriods: 1
            minFailingPeriodsToAlert: 1
          }
        }
      ]
    }
    autoMitigate: true
    skipQueryValidation: true
    actions: {
      actionGroups: []
    }
  }
}

// ---------------------------------------------------------------------------
// Authentication failure spike alert — watches for repeated login failures that
// may indicate a brute-force attempt or an auth outage.
// ---------------------------------------------------------------------------
resource authFailureSpikeAlert 'Microsoft.Insights/scheduledQueryRules@2023-12-01' = {
  name: authFailureAlertName
  location: location
  kind: 'LogAlert'
  tags: commonTags
  properties: {
    displayName: 'Atomicly ${environment} auth failure spike'
    description: 'Alert when auth.login_failed custom events exceed 20 in 5 minutes.'
    enabled: true
    severity: 1
    evaluationFrequency: 'PT5M'
    windowSize: 'PT5M'
    scopes: [
      appInsights.id
    ]
    criteria: {
      allOf: [
        {
          query: 'union isfuzzy=true AppEvents | where TimeGenerated >= ago(5m) | where Name == "auth.login_failed"'
          timeAggregation: 'Count'
          operator: 'GreaterThan'
          threshold: 20
          failingPeriods: {
            numberOfEvaluationPeriods: 1
            minFailingPeriodsToAlert: 1
          }
        }
      ]
    }
    autoMitigate: true
    skipQueryValidation: true
    actions: {
      actionGroups: []
    }
  }
}

// ---------------------------------------------------------------------------
// Uncaught exception alert — fires on the first unhandled exception signal so
// we notice crash loops and fatal runtime failures quickly.
// ---------------------------------------------------------------------------
resource uncaughtExceptionAlert 'Microsoft.Insights/scheduledQueryRules@2023-12-01' = {
  name: uncaughtExceptionAlertName
  location: location
  kind: 'LogAlert'
  tags: commonTags
  properties: {
    displayName: 'Atomicly ${environment} uncaught exception'
    description: 'Alert when the app records an unhandled exception or trace in the last 5 minutes.'
    enabled: true
    severity: 1
    evaluationFrequency: 'PT5M'
    windowSize: 'PT5M'
    scopes: [
      appInsights.id
    ]
    criteria: {
      allOf: [
        {
          query: 'union isfuzzy=true AppExceptions, AppTraces | where TimeGenerated >= ago(5m) | where (tolower(tostring(column_ifexists("HandledAt", ""))) == "unhandled") or (column_ifexists("Message", "") has "Unhandled exception") or (column_ifexists("Message", "") has "uncaught exception")'
          timeAggregation: 'Count'
          operator: 'GreaterThan'
          threshold: 0
          failingPeriods: {
            numberOfEvaluationPeriods: 1
            minFailingPeriodsToAlert: 1
          }
        }
      ]
    }
    autoMitigate: true
    skipQueryValidation: true
    actions: {
      actionGroups: []
    }
  }
}

output logAnalyticsWorkspaceId string = logAnalytics.id
output logAnalyticsCustomerId string = logAnalytics.properties.customerId
output instrumentationKey string = appInsights.properties.InstrumentationKey
output connectionString string = appInsights.properties.ConnectionString
