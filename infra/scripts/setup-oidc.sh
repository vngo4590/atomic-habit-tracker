#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Setup OIDC federation between GitHub Actions and Azure.
#
# This script creates:
#   • An Azure AD app registration
#   • A service principal for that app
#   • A federated credential scoped to the GitHub repo + master branch
#   • Contributor role assignment on the subscription (scoped to RG is safer)
#
# Run this once per project.  After running, copy the output values into
# GitHub Secrets (Settings → Secrets and variables → Actions).
# ---------------------------------------------------------------------------
set -euo pipefail

REPO="${1:-}"
if [ -z "$REPO" ]; then
  echo "Usage: $0 <github-owner/repo>"
  echo "Example: $0 vngo4590/atomic-habit-tracker"
  exit 1
fi

SUBSCRIPTION_ID=$(az account show --query id -o tsv)
TENANT_ID=$(az account show --query tenantId -o tsv)
APP_NAME="atomicly-github-actions"

# 1. Create the app registration (or reuse if it exists)
echo "Creating / retrieving app registration ..."
APP_ID=$(az ad app list --display-name "$APP_NAME" --query '[].appId' -o tsv)
if [ -z "$APP_ID" ]; then
  APP_ID=$(az ad app create --display-name "$APP_NAME" --query appId -o tsv)
  echo "Created app registration: $APP_ID"
else
  echo "Found existing app registration: $APP_ID"
fi

# 2. Create service principal (or reuse)
echo "Creating / retrieving service principal ..."
SP_OBJECT_ID=$(az ad sp list --filter "appId eq '$APP_ID'" --query '[].id' -o tsv)
if [ -z "$SP_OBJECT_ID" ]; then
  SP_OBJECT_ID=$(az ad sp create --id "$APP_ID" --query id -o tsv)
  echo "Created service principal: $SP_OBJECT_ID"
else
  echo "Found existing service principal: $SP_OBJECT_ID"
fi

# 3. Federated credential for GitHub Actions (master branch pushes + PRs)
FED_CRED_NAME="github-oidc-${REPO//\//-}"
echo "Creating federated credential: $FED_CRED_NAME ..."
az ad app federated-credential create \
  --id "$APP_ID" \
  --parameters "{
    \"name\": \"$FED_CRED_NAME\",
    \"issuer\": \"https://token.actions.githubusercontent.com\",
    \"subject\": \"repo:$REPO:ref:refs/heads/master\",
    \"audiences\": [\"api://AzureADTokenExchange\"]
  }" 2>/dev/null || echo "Federated credential may already exist; continuing ..."

# 4. Role assignment — Contributor on the subscription (scoped to RG after creation)
echo "Assigning Contributor role on subscription ..."
az role assignment create \
  --assignee-object-id "$SP_OBJECT_ID" \
  --assignee-principal-type ServicePrincipal \
  --role Contributor \
  --scope "/subscriptions/$SUBSCRIPTION_ID" \
  2>/dev/null || echo "Role assignment may already exist; continuing ..."

# 5. Output secrets for GitHub
echo ""
echo "========================================"
echo "GitHub Secrets to add (Repository → Settings → Secrets → Actions)"
echo "========================================"
echo "AZURE_CLIENT_ID       = $APP_ID"
echo "AZURE_TENANT_ID       = $TENANT_ID"
echo "AZURE_SUBSCRIPTION_ID = $SUBSCRIPTION_ID"
echo ""
echo "Additionally create:"
echo "AZURE_UNIQUE_SUFFIX   = <8-char hex, e.g. 271d7947>"
echo "POSTGRES_ADMIN_PASSWORD = <generate with: openssl rand -base64 24>"
echo "AUTH_SECRET           = <generate with: openssl rand -base64 32>"
echo "========================================"
