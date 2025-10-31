#!/bin/bash

# Register Lightspeed Webhooks for Meta CAPI Integration
# This script registers order.created and order.paid webhooks for both shops

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔗 Registering Lightspeed Webhooks for Meta CAPI Integration"
echo "============================================================"
echo ""

# Load environment variables
if [ -f .env.local ]; then
  source .env.local
else
  echo -e "${RED}❌ Error: .env.local not found${NC}"
  exit 1
fi

# Worker URL
WORKER_URL="https://lightspeed-meta-capi.f-amekran.workers.dev"

# Function to register a webhook
register_webhook() {
  local SHOP_NAME=$1
  local API_KEY=$2
  local API_SECRET=$3
  local CLUSTER_URL=$4
  local ITEM_GROUP=$5
  local ITEM_ACTION=$6

  echo -e "${YELLOW}Registering ${ITEM_GROUP}.${ITEM_ACTION} webhook for ${SHOP_NAME}...${NC}"

  # Convert shop name to lowercase for URL parameter
  local SHOP_PARAM=$(echo "$SHOP_NAME" | tr '[:upper:]' '[:lower:]')

  # Create webhook
  RESPONSE=$(curl -s -X POST "${CLUSTER_URL}/webhooks.json" \
    -u "${API_KEY}:${API_SECRET}" \
    -H "Content-Type: application/json" \
    -d "{
      \"webhook\": {
        \"isActive\": true,
        \"itemGroup\": \"${ITEM_GROUP}\",
        \"itemAction\": \"${ITEM_ACTION}\",
        \"language\": \"en\",
        \"format\": \"json\",
        \"address\": \"${WORKER_URL}/webhook?shop=${SHOP_PARAM}\"
      }
    }")

  # Check if webhook was created successfully
  if echo "$RESPONSE" | grep -q '"webhook"'; then
    WEBHOOK_ID=$(echo "$RESPONSE" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
    echo -e "${GREEN}✅ Webhook registered successfully (ID: ${WEBHOOK_ID})${NC}"
    echo "   URL: ${WORKER_URL}/webhook?shop=${SHOP_PARAM}"
  else
    echo -e "${RED}❌ Failed to register webhook${NC}"
    echo "   Response: $RESPONSE"
  fi

  echo ""
}

# Register VikGinChoice webhooks
echo -e "${GREEN}━━━ VikGinChoice ━━━${NC}"
if [ -n "$VIKGINCHOICE_LIGHTSPEED_API_KEY" ]; then
  # Get cluster URL from shop ID
  CLUSTER_URL="https://api.webshopapp.com/${VIKGINCHOICE_LIGHTSPEED_LANGUAGE:-nl}"

  register_webhook "vikginchoice" \
    "$VIKGINCHOICE_LIGHTSPEED_API_KEY" \
    "$VIKGINCHOICE_LIGHTSPEED_API_SECRET" \
    "$CLUSTER_URL" \
    "orders" \
    "created"

  register_webhook "vikginchoice" \
    "$VIKGINCHOICE_LIGHTSPEED_API_KEY" \
    "$VIKGINCHOICE_LIGHTSPEED_API_SECRET" \
    "$CLUSTER_URL" \
    "orders" \
    "paid"
else
  echo -e "${RED}❌ VikGinChoice credentials not found in .env.local${NC}"
  echo ""
fi

# Register Retoertje webhooks
echo -e "${GREEN}━━━ Retoertje ━━━${NC}"
if [ -n "$RETOERTJE_LIGHTSPEED_API_KEY" ]; then
  # Get cluster URL from shop ID
  CLUSTER_URL="https://api.webshopapp.com/${RETOERTJE_LIGHTSPEED_LANGUAGE:-nl}"

  register_webhook "retoertje" \
    "$RETOERTJE_LIGHTSPEED_API_KEY" \
    "$RETOERTJE_LIGHTSPEED_API_SECRET" \
    "$CLUSTER_URL" \
    "orders" \
    "created"

  register_webhook "retoertje" \
    "$RETOERTJE_LIGHTSPEED_API_KEY" \
    "$RETOERTJE_LIGHTSPEED_API_SECRET" \
    "$CLUSTER_URL" \
    "orders" \
    "paid"
else
  echo -e "${RED}❌ Retoertje credentials not found in .env.local${NC}"
  echo ""
fi

echo -e "${GREEN}✅ Webhook registration complete!${NC}"
echo ""
echo "📋 Next steps:"
echo "   1. Test with a real order on both shops"
echo "   2. Monitor Worker logs: npm run tail"
echo "   3. Check Meta Events Manager in 24-48h for gebeurtenisdekking improvement"
