#!/bin/bash

# Test VikGinChoice Meta CAPI event
source .env.local

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 Testing VikGinChoice Meta CAPI Integration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Pixel ID: $VIKGINCHOICE_META_PIXEL_ID"
echo "Test Event Code: TEST85114"
echo ""

# Step 1: Store pixel data in KV
ORDER_ID="VKNG_TEST_$(date +%s)"
echo "Step 1: Storing pixel data for order: $ORDER_ID"
curl -s -X POST "https://lightspeed-meta-capi.f-amekran.workers.dev/pixel-data?shop=vikginchoice" \
  -H "Content-Type: application/json" \
  -d "{
    \"order_id\": \"$ORDER_ID\",
    \"fbc\": \"fb.1.1234567890.VIKGINCHOICE_TEST_FBC\",
    \"fbp\": \"fb.1.9876543210.VIKGINCHOICE_TEST_FBP\",
    \"client_user_agent\": \"Mozilla/5.0 (VikGinChoice Test Agent)\",
    \"event_source_url\": \"https://www.vikginchoice.nl/checkout/thankyou/\"
  }" | jq '.'

echo ""
echo "Step 2: Waiting 2 seconds for KV write..."
sleep 2

echo ""
echo "Step 3: Sending webhook to trigger CAPI event..."

# Step 2: Trigger webhook with test event code in Meta CAPI
# Note: We'll send directly to Meta CAPI with test_event_code
curl -s -X POST "https://graph.facebook.com/v18.0/${VIKGINCHOICE_META_PIXEL_ID}/events" \
  -H "Content-Type: application/json" \
  -d "{
    \"data\": [
      {
        \"event_name\": \"Purchase\",
        \"event_time\": $(date +%s),
        \"event_id\": \"purchase_${ORDER_ID}\",
        \"event_source_url\": \"https://www.vikginchoice.nl/checkout/thankyou/\",
        \"action_source\": \"website\",
        \"user_data\": {
          \"em\": [\"$(echo -n 'test@vikginchoice.nl' | sha256sum | cut -d' ' -f1)\"],
          \"fbc\": \"fb.1.1234567890.VIKGINCHOICE_TEST_FBC\",
          \"fbp\": \"fb.1.9876543210.VIKGINCHOICE_TEST_FBP\",
          \"client_ip_address\": \"77.165.150.241\",
          \"client_user_agent\": \"Mozilla/5.0 (VikGinChoice Test Agent)\",
          \"external_id\": \"${ORDER_ID}\"
        },
        \"custom_data\": {
          \"currency\": \"EUR\",
          \"value\": 149.99,
          \"content_ids\": [\"test_product_123\"],
          \"content_type\": \"product\"
        }
      }
    ],
    \"access_token\": \"${VIKGINCHOICE_META_ACCESS_TOKEN}\",
    \"test_event_code\": \"TEST85114\"
  }" | jq '.'

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Test Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Order ID: $ORDER_ID"
echo "Event ID: purchase_${ORDER_ID}"
echo ""
echo "📊 Check Meta Events Manager Test Events tab for:"
echo "   - Event: Purchase"
echo "   - Event ID: purchase_${ORDER_ID}"
echo "   - Parameters: fbc, fbp, external_id, client_ip_address, client_user_agent"
echo ""
echo "Expected to see:"
echo "   ✅ Klik-ID (fbc)"
echo "   ✅ Browser-ID (fbp)"
echo "   ✅ Externe ID"
echo "   ✅ IP-adres"
echo "   ✅ User-agent"
echo "   ✅ E-mailadres"
