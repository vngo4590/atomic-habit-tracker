#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Local deployment script for Atomicly dev environment on Azure (App Service).
#
# Prerequisites:
#   • az login (already done)
#   • docker buildx (or standard docker)
#   • openssl (for secret generation)
#
# What it does:
#   1. Generates secure secrets if they don't exist locally
#   2. Pre-creates ACR and builds/pushes images BEFORE Bicep deploy
#   3. Deploys the full Bicep stack
#   4. Seeds Key Vault with runtime secrets
#   5. Grants App Service managed identity access to ACR and Key Vault
#   6. Configures App Service app settings (with Key Vault references)
#   7. Temporarily adds local IP to PostgreSQL firewall
#   8. Runs Prisma migrations from local machine
#   9. Removes local IP from PostgreSQL firewall
#  10. Smoke-tests the deployment
# ---------------------------------------------------------------------------
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

LOCATION="australiaeast"
ENVIRONMENT="dev"
PROJECT_NAME="atomicly"
UNIQUE_SUFFIX="${AZURE_UNIQUE_SUFFIX:-$(cat "$PROJECT_ROOT/.azure-suffix" 2>/dev/null || true)}"

if [ -z "$UNIQUE_SUFFIX" ]; then
  UNIQUE_SUFFIX=$(openssl rand -hex 4)
  echo "$UNIQUE_SUFFIX" > "$PROJECT_ROOT/.azure-suffix"
  echo "Generated new unique suffix: $UNIQUE_SUFFIX (saved to .azure-suffix)"
fi

RG_NAME="rg-${PROJECT_NAME}-${ENVIRONMENT}-aue-${UNIQUE_SUFFIX}"
ACR_NAME="cr${PROJECT_NAME}${ENVIRONMENT}${UNIQUE_SUFFIX}"
KV_NAME="kv-${PROJECT_NAME}${ENVIRONMENT}${UNIQUE_SUFFIX}"
APP_NAME="app-${PROJECT_NAME}-${ENVIRONMENT}-aue"
POSTGRES_NAME="psql-${PROJECT_NAME}-${ENVIRONMENT}-aue-${UNIQUE_SUFFIX}"
FD_ENDPOINT="${PROJECT_NAME}-${ENVIRONMENT}-${UNIQUE_SUFFIX}"

# Secret files (gitignored)
SECRETS_DIR="$PROJECT_ROOT/.secrets"
mkdir -p "$SECRETS_DIR"
POSTGRES_PASSWORD_FILE="$SECRETS_DIR/postgres-admin-password"
AUTH_SECRET_FILE="$SECRETS_DIR/auth-secret"

generate_secret_if_missing() {
  local file="$1"
  local length="${2:-32}"
  if [ ! -f "$file" ]; then
    openssl rand -base64 "$length" > "$file"
    echo "Generated secret: $file"
  fi
}

generate_secret_if_missing "$POSTGRES_PASSWORD_FILE" 24
generate_secret_if_missing "$AUTH_SECRET_FILE" 32

POSTGRES_PASSWORD=$(cat "$POSTGRES_PASSWORD_FILE")
AUTH_SECRET=$(cat "$AUTH_SECRET_FILE")

echo ""
echo "========================================"
echo "Deploying Atomicly dev infrastructure"
echo "Region:     $LOCATION"
echo "RG:         $RG_NAME"
echo "ACR:        $ACR_NAME"
echo "Postgres:   $POSTGRES_NAME"
echo "Key Vault:  $KV_NAME"
echo "App:        $APP_NAME"
echo "========================================"
echo ""

# ---------------------------------------------------------------------------
# 0. Ensure resource group and ACR exist so we can build images early
# ---------------------------------------------------------------------------
echo "[0/10] Ensuring ACR exists for image build ..."
az group create --name "$RG_NAME" --location "$LOCATION" --output none
az acr create \
  --resource-group "$RG_NAME" \
  --name "$ACR_NAME" \
  --sku Basic \
  --location "$LOCATION" \
  --admin-enabled false \
  --output none

az acr login --name "$ACR_NAME"
ACR_LOGIN_SERVER="${ACR_NAME}.azurecr.io"
APP_PUBLIC_URL="https://${FD_ENDPOINT}.azurefd.net"

cd "$PROJECT_ROOT"

docker build \
  --target runner \
  --tag "${ACR_LOGIN_SERVER}/atomicly:dev-latest" \
  --build-arg NEXT_PUBLIC_APP_URL="$APP_PUBLIC_URL" \
  --build-arg DEPLOYMENT_VERSION="dev-latest" \
  .

docker build \
  --target migrator \
  --tag "${ACR_LOGIN_SERVER}/atomicly-migrator:dev-latest" \
  .

docker push "${ACR_LOGIN_SERVER}/atomicly:dev-latest"
docker push "${ACR_LOGIN_SERVER}/atomicly-migrator:dev-latest"

# ---------------------------------------------------------------------------
# 1. Deploy Bicep infrastructure (image already exists in ACR)
# ---------------------------------------------------------------------------
echo ""
echo "[1/10] Deploying Bicep infrastructure ..."
az deployment sub create \
  --name "atomicly-${ENVIRONMENT}-local-$(date +%s)" \
  --location "$LOCATION" \
  --template-file "$PROJECT_ROOT/infra/main.bicep" \
  --parameters \
    location="$LOCATION" \
    environment="$ENVIRONMENT" \
    uniqueSuffix="$UNIQUE_SUFFIX" \
    postgresAdminPassword="$POSTGRES_PASSWORD" \
    imageTag="dev-latest"

# ---------------------------------------------------------------------------
# 2. Seed Key Vault secrets
# ---------------------------------------------------------------------------
echo ""
echo "[2/10] Seeding Key Vault secrets ..."
DB_URL="postgresql://psqladmin:${POSTGRES_PASSWORD}@${POSTGRES_NAME}.postgres.database.azure.com:5432/atomicly?schema=public&sslmode=require"
az keyvault secret set --vault-name "$KV_NAME" --name database-url --value "$DB_URL" --output none
az keyvault secret set --vault-name "$KV_NAME" --name auth-secret --value "$AUTH_SECRET" --output none

# ---------------------------------------------------------------------------
# 3. Grant App Service access to ACR and Key Vault
# ---------------------------------------------------------------------------
echo ""
echo "[3/10] Granting App Service access to ACR and Key Vault ..."
APP_PRINCIPAL_ID=$(az webapp show --name "$APP_NAME" --resource-group "$RG_NAME" --query identity.principalId -o tsv)

# AcrPull
az role assignment create \
  --assignee "$APP_PRINCIPAL_ID" \
  --role AcrPull \
  --scope $(az acr show --name "$ACR_NAME" --resource-group "$RG_NAME" --query id -o tsv) \
  --output none 2>/dev/null || true

# Key Vault Secrets User
az role assignment create \
  --assignee "$APP_PRINCIPAL_ID" \
  --role "Key Vault Secrets User" \
  --scope $(az keyvault show --name "$KV_NAME" --resource-group "$RG_NAME" --query id -o tsv) \
  --output none 2>/dev/null || true

# ---------------------------------------------------------------------------
# 4. Update App Service app settings with Key Vault references
# ---------------------------------------------------------------------------
echo ""
echo "[4/10] Updating App Service app settings ..."
KV_URL="https://${KV_NAME}.vault.azure.net"

az webapp config appsettings set \
  --name "$APP_NAME" \
  --resource-group "$RG_NAME" \
  --settings \
    "NODE_ENV=production" \
    "HOSTNAME=0.0.0.0" \
    "PORT=3000" \
    "AUTH_URL=$APP_PUBLIC_URL" \
    "NEXT_PUBLIC_APP_URL=$APP_PUBLIC_URL" \
    "DEPLOYMENT_VERSION=azure-dev" \
    "DATABASE_URL=@Microsoft.KeyVault(SecretUri=${KV_URL}/secrets/database-url/)" \
    "AUTH_SECRET=@Microsoft.KeyVault(SecretUri=${KV_URL}/secrets/auth-secret/)" \
  --output none

# Restart to pick up new settings and image
az webapp restart --name "$APP_NAME" --resource-group "$RG_NAME" --output none

# ---------------------------------------------------------------------------
# 5. Add local IP to PostgreSQL firewall for migrations
# ---------------------------------------------------------------------------
echo ""
echo "[5/10] Adding local IP to PostgreSQL firewall ..."
LOCAL_IP=$(curl -s https://api.ipify.org)
az postgres flexible-server firewall-rule create \
  --name "$POSTGRES_NAME" \
  --resource-group "$RG_NAME" \
  --rule-name "local-admin" \
  --start-ip-address "$LOCAL_IP" \
  --end-ip-address "$LOCAL_IP" \
  --output none

# ---------------------------------------------------------------------------
# 6. Run database migrations
# ---------------------------------------------------------------------------
echo ""
echo "[6/10] Running database migrations ..."
# Run the migrator image locally, pointing at the public PostgreSQL endpoint
# The migrator image already has Prisma CLI and the schema.
docker run --rm \
  -e "DATABASE_URL=$DB_URL" \
  -e "NODE_ENV=production" \
  "${ACR_LOGIN_SERVER}/atomicly-migrator:dev-latest"

# ---------------------------------------------------------------------------
# 7. Remove local IP from PostgreSQL firewall
# ---------------------------------------------------------------------------
echo ""
echo "[7/10] Removing local IP from PostgreSQL firewall ..."
az postgres flexible-server firewall-rule delete \
  --name "$POSTGRES_NAME" \
  --resource-group "$RG_NAME" \
  --rule-name "local-admin" \
  --yes \
  --output none

# ---------------------------------------------------------------------------
# 8. Smoke test
# ---------------------------------------------------------------------------
echo ""
echo "[8/10] Running smoke tests ..."
APP_HOST=$(az webapp show --name "$APP_NAME" --resource-group "$RG_NAME" --query defaultHostName -o tsv)
echo "App Service URL: https://$APP_HOST"
echo "Front Door URL:  $APP_PUBLIC_URL"

for i in {1..12}; do
  if curl -sf "https://$APP_HOST/api/healthz" > /dev/null 2>&1; then
    echo "✅ Health check passed on App Service"
    break
  fi
  echo "  Waiting for app to be healthy ..."
  sleep 10
done

if curl -sf "https://${FD_ENDPOINT}.azurefd.net/api/healthz" > /dev/null 2>&1; then
  echo "✅ Health check passed on Front Door"
else
  echo "⚠️  Front Door health check failed (may need a few more minutes to propagate)"
fi

echo ""
echo "========================================"
echo "Deployment complete!"
echo "Front Door URL: $APP_PUBLIC_URL"
echo "========================================"
