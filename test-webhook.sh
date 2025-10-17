#!/bin/bash

# Test Lightspeed Webhook
# This script simulates a webhook call from Lightspeed

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

WORKER_URL="https://lightspeed-meta-capi.f-amekran.workers.dev/webhook"

echo "=========================================="
echo "Lightspeed Webhook Test"
echo "=========================================="
echo ""

# Test payload - simulating a Lightspeed order webhook
# This mimics what Lightspeed sends when an order is updated
TEST_PAYLOAD='{
  "order": {
    "id": 304989105,
    "number": "VKNG186515",
    "createdAt": "2025-10-15T18:05:07+02:00",
    "status": "processing_awaiting_shipment",
    "paymentStatus": "paid",
    "email": "test@example.com",
    "firstname": "Test",
    "lastname": "User",
    "phone": "+31612345678",
    "addressBillingCity": "Amsterdam",
    "addressBillingZipcode": "1012 AB",
    "addressBillingCountry": {
      "code": "nl"
    },
    "priceIncl": 54.51,
    "currency": "EUR"
  }
}'

echo -e "${BLUE}Testing webhook for VikGinChoice...${NC}"
echo "URL: $WORKER_URL?shop=vikginchoice"
echo ""

RESPONSE=$(curl -s -X POST "$WORKER_URL?shop=vikginchoice" \
  -H "Content-Type: application/json" \
  -d "$TEST_PAYLOAD")

echo -e "${YELLOW}Response:${NC}"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""

if echo "$RESPONSE" | grep -q '"success": true'; then
  echo -e "${GREEN}✅ Webhook test successful!${NC}"
else
  echo -e "${RED}❌ Webhook test failed${NC}"
fi

echo ""
echo "=========================================="
echo ""
echo -e "${YELLOW}Note:${NC} This is a simulated webhook call."
echo "To test with a real order:"
echo "1. Place an order on vikginchoice.nl or retoertje.nl"
echo "2. Complete the payment"
echo "3. Check the Cloudflare Worker logs:"
echo "   npx wrangler tail --format pretty"
echo ""
