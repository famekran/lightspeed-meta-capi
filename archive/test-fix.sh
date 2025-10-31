#!/bin/bash

# Test script to verify KV lookup fix
ORDER_ID="RTR_FIX_TEST_$(date +%s)"
export CLOUDFLARE_API_TOKEN="sDlEOCgSrV_g3sP3wQYlwdiLFWT_4dBuYRW7BLuo"
export CLOUDFLARE_ACCOUNT_ID="2febeaec7b825dc19b659d7e783cf622"

echo "Testing with Order: $ORDER_ID"
echo ""

echo "=== Step 1: Browser sends pixel data ==="
curl -s -X POST "https://lightspeed-meta-capi.f-amekran.workers.dev/pixel-data?shop=retoertje" \
  -H "Content-Type: application/json" \
  -d "{
    \"order_id\": \"$ORDER_ID\",
    \"fbc\": \"fb.1.1234567890.FIXED_FBC_TEST\",
    \"fbp\": \"fb.1.9876543210.FIXED_FBP_TEST\",
    \"client_user_agent\": \"Mozilla/5.0 Fix Test\",
    \"event_source_url\": \"https://www.retoertje.nl/checkout/thankyou/\"
  }"

echo ""
echo ""
echo "=== Step 2: Wait 2 seconds for KV write ==="
sleep 2

echo ""
echo "=== Step 3: Verify pixel data in KV ==="
npx wrangler kv key get --namespace-id=12eed91ee98246308b01517ba9bd677f --remote "pixel_data_retoertje_$ORDER_ID" 2>&1

echo ""
echo ""
echo "=== Step 4: Trigger webhook (should find pixel data with fixed lookup) ==="
curl -s -X POST "https://lightspeed-meta-capi.f-amekran.workers.dev/webhook?shop=retoertje" \
  -H "Content-Type: application/json" \
  -d "{
    \"order\": {
      \"number\": \"$ORDER_ID\",
      \"priceIncl\": 199.99,
      \"currency\": \"EUR\",
      \"customer\": {
        \"email\": \"fixtest@example.com\",
        \"firstname\": \"Fix\",
        \"lastname\": \"Test\"
      }
    }
  }"

echo ""
echo ""
echo "✅ Test complete! Check if webhook found pixel data in logs above."
