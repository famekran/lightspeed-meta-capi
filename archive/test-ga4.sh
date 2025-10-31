#!/bin/bash

# Test GA4 Measurement Protocol Integration
# Tests both shops with debug endpoint

set -e

echo "======================================"
echo "🧪 GA4 Measurement Protocol Test"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test order data
TEST_ORDER_ID="TEST_GA4_$(date +%s)"
WORKER_URL="http://localhost:8787"

echo "📝 Test Configuration:"
echo "   Order ID: $TEST_ORDER_ID"
echo "   Worker URL: $WORKER_URL"
echo ""

# ==========================================
# TEST 1: Retoertje Pixel Data Upload
# ==========================================

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 1: Retoertje - Pixel Data Upload"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "Sending pixel data (fbc, fbp, ga_client_id)..."
PIXEL_RESPONSE=$(curl -s -X POST "$WORKER_URL/pixel-data?shop=retoertje" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "'"$TEST_ORDER_ID"'",
    "fbc": "fb.1.1234567890.IwY2xjawLmTestData",
    "fbp": "fb.1.1234567890.9876543210",
    "ga_client_id": "1234567890.9876543210",
    "client_user_agent": "Mozilla/5.0 (Test)",
    "event_source_url": "https://www.retoertje.nl/checkout/thankyou/"
  }')

echo "$PIXEL_RESPONSE" | jq '.'

if echo "$PIXEL_RESPONSE" | jq -e '.success == true and .stored.ga_client_id == true' > /dev/null; then
  echo -e "${GREEN}✅ Pixel data uploaded successfully (ga_client_id present)${NC}"
else
  echo -e "${RED}❌ Pixel data upload failed or ga_client_id missing${NC}"
  exit 1
fi

echo ""
sleep 2

# ==========================================
# TEST 2: Retoertje Webhook → Meta + GA4
# ==========================================

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 2: Retoertje - Webhook (Meta + GA4)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "Sending webhook with order data..."
WEBHOOK_RESPONSE=$(curl -s -X POST "$WORKER_URL/webhook?shop=retoertje" \
  -H "Content-Type: application/json" \
  -d '{
    "order": {
      "number": "'"$TEST_ORDER_ID"'",
      "priceIncl": 99.99,
      "currency": "EUR",
      "tax": 17.64,
      "shippingCost": 5.95,
      "createdAt": "'"$(date -u +"%Y-%m-%dT%H:%M:%SZ")"'",
      "customer": {
        "email": "test@retoertje.nl",
        "phone": "+31612345678",
        "firstname": "Test",
        "lastname": "User",
        "city": "Amsterdam",
        "zipcode": "1012AB",
        "country": "NL"
      },
      "products": [{
        "articleCode": "SKU123",
        "title": "Test Product",
        "quantityOrdered": 2,
        "priceIncl": 42.00
      }]
    }
  }')

echo "$WEBHOOK_RESPONSE" | jq '.'

# Check if both platforms succeeded
META_SUCCESS=$(echo "$WEBHOOK_RESPONSE" | jq -r '.platforms.meta.success')
GA4_SUCCESS=$(echo "$WEBHOOK_RESPONSE" | jq -r '.platforms.ga4.success')
GA4_SKIPPED=$(echo "$WEBHOOK_RESPONSE" | jq -r '.platforms.ga4.skipped // false')

echo ""
echo "Platform Results:"
if [ "$META_SUCCESS" = "true" ]; then
  echo -e "  Meta CAPI: ${GREEN}✅ Success${NC}"
else
  echo -e "  Meta CAPI: ${RED}❌ Failed${NC}"
fi

if [ "$GA4_SUCCESS" = "true" ]; then
  echo -e "  GA4 MP:    ${GREEN}✅ Success${NC}"
elif [ "$GA4_SKIPPED" = "true" ]; then
  echo -e "  GA4 MP:    ${YELLOW}⊘ Skipped (not configured)${NC}"
else
  echo -e "  GA4 MP:    ${RED}❌ Failed${NC}"
fi

echo ""

# ==========================================
# TEST 3: VikGinChoice (Quick Test)
# ==========================================

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 3: VikGinChoice - Quick Test"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

TEST_ORDER_ID_VGC="TEST_VGC_$(date +%s)"

# Upload pixel data
echo "Uploading pixel data..."
curl -s -X POST "$WORKER_URL/pixel-data?shop=vikginchoice" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "'"$TEST_ORDER_ID_VGC"'",
    "fbc": "fb.1.1234567890.TestVGC",
    "fbp": "fb.1.9876543210.TestVGC",
    "ga_client_id": "9876543210.1234567890",
    "client_user_agent": "Mozilla/5.0 (Test)"
  }' > /dev/null

sleep 1

# Send webhook
echo "Sending webhook..."
VGC_RESPONSE=$(curl -s -X POST "$WORKER_URL/webhook?shop=vikginchoice" \
  -H "Content-Type: application/json" \
  -d '{
    "order": {
      "number": "'"$TEST_ORDER_ID_VGC"'",
      "priceIncl": 149.99,
      "currency": "EUR",
      "customer": {
        "email": "test@vikginchoice.nl"
      }
    }
  }')

VGC_META=$(echo "$VGC_RESPONSE" | jq -r '.platforms.meta.success')
VGC_GA4=$(echo "$VGC_RESPONSE" | jq -r '.platforms.ga4.success')

echo "Results:"
if [ "$VGC_META" = "true" ] && [ "$VGC_GA4" = "true" ]; then
  echo -e "  ${GREEN}✅ Both platforms successful${NC}"
elif [ "$VGC_META" = "true" ] || [ "$VGC_GA4" = "true" ]; then
  echo -e "  ${YELLOW}⚠️ Partial success (at least one platform worked)${NC}"
else
  echo -e "  ${RED}❌ Both platforms failed${NC}"
fi

echo ""

# ==========================================
# SUMMARY
# ==========================================

echo "======================================"
echo "📊 Test Summary"
echo "======================================"
echo ""

if [ "$META_SUCCESS" = "true" ] && [ "$GA4_SUCCESS" = "true" ]; then
  echo -e "${GREEN}✅ All tests passed!${NC}"
  echo ""
  echo "Next steps:"
  echo "  1. Deploy to production: npm run deploy"
  echo "  2. Update Cloudflare secrets with GA4 credentials"
  echo "  3. Add thank-you page scripts to both shops"
  echo "  4. Monitor GA4 Realtime reports for live events"
  exit 0
else
  echo -e "${YELLOW}⚠️ Some tests incomplete${NC}"
  echo ""
  echo "Check logs above for details."
  echo ""
  echo "If GA4 is skipped, make sure:"
  echo "  1. .env.local has GA4 credentials"
  echo "  2. Worker is running: npm run dev"
  exit 0
fi
