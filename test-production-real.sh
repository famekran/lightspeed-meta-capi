#!/bin/bash

# Production Test Script - Tests worker with realistic order data
# Mimics real Lightspeed webhook payload

set -e

echo "========================================="
echo "🧪 PRODUCTION WORKER TEST"
echo "========================================="
echo ""

# Generate unique test order number
TEST_ORDER="RTR_PROD_$(date +%Y%m%d_%H%M%S)"
TIMESTAMP=$(date +%s)

echo "📋 Test Order: $TEST_ORDER"
echo "⏰ Timestamp: $TIMESTAMP"
echo ""

#===================================
# STEP 1: Store Pixel Data
#===================================
echo "=== STEP 1: Storing Pixel Data ==="
echo ""

PIXEL_RESPONSE=$(curl -s -X POST "https://lightspeed-meta-capi.f-amekran.workers.dev/pixel-data?shop=retoertje" \
  -H "Content-Type: application/json" \
  -d "{
  \"order_id\": \"$TEST_ORDER\",
  \"fbc\": \"fb.1.${TIMESTAMP}.PROD_FBC_ABC123DEF456\",
  \"fbp\": \"fb.1.${TIMESTAMP}.PROD_FBP_XYZ789UVW012\",
  \"ga_client_id\": \"1234567890.9876543210\",
  \"ga_session_id\": \"${TIMESTAMP}\",
  \"gclid\": \"Cj0KCQjw_PROD_TEST_GCLID_123456\",
  \"utm\": {
    \"utm_source\": \"google\",
    \"utm_medium\": \"cpc\",
    \"utm_campaign\": \"production_test\",
    \"utm_term\": \"test_keyword\",
    \"utm_content\": \"test_ad\"
  },
  \"client_user_agent\": \"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36\",
  \"event_source_url\": \"https://www.retoertje.nl/checkout/thankyou/\",
  \"referrer\": \"https://www.google.com/\"
}")

echo "Pixel Data Response:"
echo "$PIXEL_RESPONSE" | jq '.'
echo ""

sleep 2

#===================================
# STEP 2: Send Webhook (Realistic Lightspeed Format)
#===================================
echo "=== STEP 2: Processing Webhook ==="
echo ""

WEBHOOK_RESPONSE=$(curl -s -X POST "https://lightspeed-meta-capi.f-amekran.workers.dev/webhook?shop=retoertje" \
  -H "Content-Type: application/json" \
  -d "{
  \"order\": {
    \"id\": 999999,
    \"number\": \"$TEST_ORDER\",
    \"createdAt\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
    \"updatedAt\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
    \"status\": \"completed\",
    \"paymentStatus\": \"paid\",
    \"currency\": \"EUR\",
    \"priceIncl\": 99.99,
    \"priceExcl\": 82.64,
    \"tax\": 17.35,
    \"shippingCost\": 5.95,
    \"email\": \"productiontest@retoertje.nl\",
    \"firstname\": \"Production\",
    \"lastname\": \"Test\",
    \"phone\": \"+31612345678\",
    \"mobile\": \"+31687654321\",
    \"addressBillingCity\": \"Amsterdam\",
    \"addressBillingZipcode\": \"1012AB\",
    \"addressBillingCountry\": {
      \"code\": \"NL\",
      \"title\": \"Nederland\"
    },
    \"products\": [
      {
        \"id\": 12345,
        \"title\": \"Test Product - Production Run\",
        \"articleCode\": \"PROD-TEST-001\",
        \"quantityOrdered\": 2,
        \"basePriceIncl\": 47.02,
        \"basePriceExcl\": 38.86,
        \"variant\": {
          \"resource\": {
            \"id\": 67890
          }
        },
        \"product\": {
          \"resource\": {
            \"id\": 11111
          }
        }
      }
    ]
  }
}")

echo "Webhook Response:"
echo "$WEBHOOK_RESPONSE" | jq '.'
echo ""

#===================================
# STEP 3: Extract Results
#===================================
echo "=== STEP 3: Test Results Summary ==="
echo ""

SUCCESS=$(echo "$WEBHOOK_RESPONSE" | jq -r '.success')
META_SUCCESS=$(echo "$WEBHOOK_RESPONSE" | jq -r '.platforms.meta.success')
GA4_SUCCESS=$(echo "$WEBHOOK_RESPONSE" | jq -r '.platforms.ga4.success')
META_TRACE=$(echo "$WEBHOOK_RESPONSE" | jq -r '.platforms.meta.fbtrace_id // "N/A"')

echo "Overall Success: $SUCCESS"
echo "Meta CAPI Success: $META_SUCCESS"
echo "GA4 Success: $GA4_SUCCESS"
echo "Meta Trace ID: $META_TRACE"
echo ""

#===================================
# STEP 4: Test Deduplication
#===================================
echo "=== STEP 4: Testing Deduplication ==="
echo ""

DEDUP_RESPONSE=$(curl -s -X POST "https://lightspeed-meta-capi.f-amekran.workers.dev/webhook?shop=retoertje" \
  -H "Content-Type: application/json" \
  -d "{
  \"order\": {
    \"number\": \"$TEST_ORDER\",
    \"priceIncl\": 99.99,
    \"currency\": \"EUR\",
    \"email\": \"productiontest@retoertje.nl\"
  }
}")

IS_DUPLICATE=$(echo "$DEDUP_RESPONSE" | jq -r '.duplicate')

echo "Deduplication Response:"
echo "$DEDUP_RESPONSE" | jq '.'
echo ""
echo "Is Duplicate: $IS_DUPLICATE"
echo ""

#===================================
# FINAL SUMMARY
#===================================
echo "========================================="
echo "📊 TEST SUMMARY"
echo "========================================="
echo "Test Order: $TEST_ORDER"
echo ""
echo "✅ Tests Passed:"
if [ "$SUCCESS" = "true" ]; then echo "  - Webhook processing"; fi
if [ "$META_SUCCESS" = "true" ]; then echo "  - Meta CAPI event sent"; fi
if [ "$GA4_SUCCESS" = "true" ]; then echo "  - GA4 event sent"; fi
if [ "$IS_DUPLICATE" = "true" ]; then echo "  - Deduplication working"; fi
echo ""
echo "📋 Next Steps:"
echo "  1. Check Meta Events Manager:"
echo "     https://business.facebook.com/events_manager2"
echo "     Look for event: purchase_$TEST_ORDER"
echo ""
echo "  2. Check GA4 Realtime:"
echo "     https://analytics.google.com/"
echo "     Look for transaction: $TEST_ORDER"
echo ""
echo "  3. Meta Trace ID for debugging: $META_TRACE"
echo ""
echo "========================================="
