#!/bin/bash

# Direct Meta CAPI test
source .env.local

echo "Sending test event directly to Meta CAPI..."
echo ""
echo "Pixel ID: $RETOERTJE_META_PIXEL_ID"
echo "Test Event Code: TEST76877"
echo ""

curl -X POST "https://graph.facebook.com/v18.0/${RETOERTJE_META_PIXEL_ID}/events" \
  -H "Content-Type: application/json" \
  -d '{
    "data": [
      {
        "event_name": "Purchase",
        "event_time": 1761672500,
        "event_id": "purchase_DIRECT_TEST_001",
        "event_source_url": "https://www.retoertje.nl/checkout/thankyou/",
        "action_source": "website",
        "user_data": {
          "em": ["7b17fb0bd173f625b58636fb796407c22b3d16fc78302d79f0fd30c2fc2fc068"],
          "fbc": "fb.1.1752832754445.IwY2xjawLm-kJleHRuA2FlbQIxMABicmlkETFaQ2FOcm9lZXpBMm14THBCAR6SGTxhZSd6GO-lTriOpSUK_fKQVZxwgViXWjAT40cWE3bJ7LMTsye2ilw5WA_aem_gbFraAu3Uf30p9gxh-PUFw",
          "fbp": "fb.1.1752832686956.559349522818458445",
          "client_ip_address": "2a02:a45a:f585:0:b6d5:5ac0:2a90:99d4",
          "client_user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "external_id": "DIRECT_TEST_001"
        },
        "custom_data": {
          "currency": "EUR",
          "value": 99.99
        }
      }
    ],
    "access_token": "'"${RETOERTJE_META_ACCESS_TOKEN}"'",
    "test_event_code": "TEST76877"
  }'

echo ""
echo ""
echo "Check Meta Test Events tab for: purchase_DIRECT_TEST_001"
