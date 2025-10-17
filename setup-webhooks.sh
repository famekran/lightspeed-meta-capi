#!/bin/bash

# Setup Lightspeed Webhooks for Order Events
# This script creates webhooks for both VikGinChoice and Retoertje

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Cloudflare Worker URL (your deployed worker)
WORKER_URL="https://lightspeed-meta-capi.f-amekran.workers.dev/webhook"

echo "=========================================="
echo "Lightspeed Webhook Setup"
echo "=========================================="
echo ""

# VikGinChoice Webhook
echo -e "${YELLOW}Creating webhook for VikGinChoice...${NC}"
VIKGIN_RESPONSE=$(curl -s -X POST "https://api.webshopapp.com/nl/webhooks.json" \
  -u "999dbf89325550b675d194b476692fe7:de8afe8fd12e9b3cf1a06636274f286e" \
  -H "Content-Type: application/json" \
  -d '{
    "webhook": {
      "isActive": true,
      "itemGroup": "orders",
      "itemAction": "updated",
      "language": "nl",
      "format": "json",
      "address": "'"$WORKER_URL"'?shop=vikginchoice"
    }
  }')

if echo "$VIKGIN_RESPONSE" | grep -q '"id"'; then
  WEBHOOK_ID=$(echo "$VIKGIN_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
  echo -e "${GREEN}✅ VikGinChoice webhook created successfully!${NC}"
  echo "   Webhook ID: $WEBHOOK_ID"
  echo "   URL: $WORKER_URL?shop=vikginchoice"
else
  echo -e "${RED}❌ Failed to create VikGinChoice webhook${NC}"
  echo "   Response: $VIKGIN_RESPONSE"
fi

echo ""

# Retoertje Webhook
echo -e "${YELLOW}Creating webhook for Retoertje...${NC}"
RETOERTJE_RESPONSE=$(curl -s -X POST "https://api.webshopapp.com/nl/webhooks.json" \
  -u "86d1160f58d16e09224b8f3351a96e90:764ecf6433ea31f0637affd77dcb03aa" \
  -H "Content-Type: application/json" \
  -d '{
    "webhook": {
      "isActive": true,
      "itemGroup": "orders",
      "itemAction": "updated",
      "language": "nl",
      "format": "json",
      "address": "'"$WORKER_URL"'?shop=retoertje"
    }
  }')

if echo "$RETOERTJE_RESPONSE" | grep -q '"id"'; then
  WEBHOOK_ID=$(echo "$RETOERTJE_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
  echo -e "${GREEN}✅ Retoertje webhook created successfully!${NC}"
  echo "   Webhook ID: $WEBHOOK_ID"
  echo "   URL: $WORKER_URL?shop=retoertje"
else
  echo -e "${RED}❌ Failed to create Retoertje webhook${NC}"
  echo "   Response: $RETOERTJE_RESPONSE"
fi

echo ""
echo "=========================================="
echo "Webhook Setup Complete!"
echo "=========================================="
echo ""
echo "The webhooks will now trigger when:"
echo "  - An order is updated (including payment status changes)"
echo ""
echo "To list existing webhooks, use:"
echo "  curl https://api.webshopapp.com/nl/webhooks.json -u API_KEY:API_SECRET"
echo ""
