#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Local deployment script for Atomicly dev environment on Azure.
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
#   5. Updates Container App with Key Vault secret references
#   6. Runs Prisma migrations via a temporary Container App job
#   7. Smoke-tests the deployment
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
APP_NAME="ca-${PROJECT_NAME}-${ENVIRONMENT}-aue"
ENV_NAME="cae-${PROJECT_NAME}-${ENVIRONMENT}-aue"
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
echo "========================================"
echo ""

# ---------------------------------------------------------------------------
# 0. Ensure resource group and ACR exist so we can build images early
# ---------------------------------------------------------------------------
echo "[0/7] Ensuring ACR exists for image build ..."
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
echo "[1/7] Deploying Bicep infrastructure ..."
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
echo "[2/7] Seeding Key Vault secrets ..."
DB_URL="postgresql://psqladmin:${POSTGRES_PASSWORD}@${POSTGRES_NAME}.postgres.database.azure.com:5432/atomicly?schema=public&sslmode=require"
az keyvault secret set --vault-name "$KV_NAME" --name database-url --value "$DB_URL" --output none
az keyvault secret set --vault-name "$KV_NAME" --name auth-secret --value "$AUTH_SECRET" --output none

# ---------------------------------------------------------------------------
# 3. Update Container App with Key Vault secret references
# ---------------------------------------------------------------------------
echo ""
echo "[3/7] Updating Container App with Key Vault secrets ..."
MANAGED_IDENTITY_ID=$(az containerapp show --name "$APP_NAME" --resource-group "$RG_NAME" --query identity.userAssignedIdentities -o json | grep -o '/subscriptions/[^"]*' | head -1)
KV_URL="https://${KV_NAME}.vault.azure.net"

az containerapp update \
  --name "$APP_NAME" \
  --resource-group "$RG_NAME" \
  --image "${ACR_LOGIN_SERVER}/atomicly:dev-latest" \
  --secrets \
    "database-url=keyvaultref:${KV_URL}/secrets/database-url,identityref:${MANAGED_IDENTITY_ID}" \
    "auth-secret=keyvaultref:${KV_URL}/secrets/auth-secret,identityref:${MANAGED_IDENTITY_ID}" \
  --env-vars \
    "DATABASE_URL=secretref:database-url" \
    "AUTH_SECRET=secretref:auth-secret" \
  --output none

# ---------------------------------------------------------------------------
# 4. Run database migrations
# ---------------------------------------------------------------------------
echo ""
echo "[4/7] Running database migrations ..."

JOB_NAME="atomicly-migrate-$(date +%s)"

az containerapp job create \
  --name "$JOB_NAME" \
  --resource-group "$RG_NAME" \
  --environment "$ENV_NAME" \
  --image "${ACR_LOGIN_SERVER}/atomicly-migrator:dev-latest" \
  --cpu "0.5" \
  --memory "1Gi" \
  --env-vars "DATABASE_URL=$DB_URL" "NODE_ENV=production" \
  --trigger-type Manual \
  --replica-timeout 300 \
  --replica-retry-limit 1 \
  --output none || true

sleep 5
az containerapp job start \
  --name "$JOB_NAME" \
  --resource-group "$RG_NAME" \
  --output none

echo "Waiting for migration job to complete ..."
for i in {1..30}; do
  STATUS=$(az containerapp job execution list \
    --name "$JOB_NAME" \
    --resource-group "$RG_NAME" \
    --query '[0].properties.status' -o tsv 2>/dev/null || echo "Running")
  if [ "$STATUS" == "Succeeded" ]; then
    echo "Migrations completed successfully."
    break
  elif [ "$STATUS" == "Failed" ]; then
    echo "Migration job failed!"
    exit 1
  fi
  echo "  status=$STATUS (waiting ...)"
  sleep 10
done

# ---------------------------------------------------------------------------
# 5. Verify Container App is healthy
# ---------------------------------------------------------------------------
echo ""
echo "[5/7] Running smoke tests ..."
FQDN=$(az containerapp show --name "$APP_NAME" --resource-group "$RG_NAME" --query properties.configuration.ingress.fqdn -o tsv)
echo "Container App FQDN: https://$FQDN"
echo "Front Door URL:     $APP_PUBLIC_URL"

for i in {1..12}; do
  if curl -sf "https://$FQDN/api/healthz" > /dev/null 2>&1; then
    echo "✅ Health check passed on Container App"
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

# ---------------------------------------------------------------------------
# 6. Cleanup migration job
# ---------------------------------------------------------------------------
echo ""
echo "[6/7] Cleaning up migration job ..."
az containerapp job delete --name "$JOB_NAME" --resource-group "$RG_NAME" --yes --output none 2>/dev/null || true

echo ""
echo "========================================"
echo "Deployment complete!"
echo "Front Door URL: $APP_PUBLIC_URL"
echo "========================================"
