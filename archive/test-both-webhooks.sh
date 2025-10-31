#!/bin/bash

# Test both VikGinChoice and Retoertje webhooks

WORKER_URL="https://lightspeed-meta-capi.f-amekran.workers.dev/webhook"

echo "=========================================="
echo "Testing RETOERTJE Webhook"
echo "=========================================="
echo ""

RETOERTJE_PAYLOAD='{
  "order": {
    "id": 304989106,
    "number": "RET789123",
    "createdAt": "2025-10-17T10:00:00+02:00",
    "status": "processing_awaiting_shipment",
    "paymentStatus": "paid",
    "email": "test@retoertje.nl",
    "firstname": "Test",
    "lastname": "Retoertje",
    "phone": "+31687654321",
    "addressBillingCity": "Rotterdam",
    "addressBillingZipcode": "3011 AB",
    "addressBillingCountry": {
      "code": "nl"
    },
    "priceIncl": 89.99,
    "currency": "EUR"
  }
}'

curl -s -X POST "$WORKER_URL?shop=retoertje" \
  -H "Content-Type: application/json" \
  -d "$RETOERTJE_PAYLOAD" | jq '.'

echo ""
echo "=========================================="
echo "Testing VIKGINCHOICE Webhook"
echo "=========================================="
echo ""

VIKGIN_PAYLOAD='{
  "order": {
    "id": 304989107,
    "number": "VKNG789456",
    "createdAt": "2025-10-17T10:00:00+02:00",
    "status": "processing_awaiting_shipment",
    "paymentStatus": "paid",
    "email": "test@vikginchoice.nl",
    "firstname": "Test",
    "lastname": "VikGin",
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

curl -s -X POST "$WORKER_URL?shop=vikginchoice" \
  -H "Content-Type: application/json" \
  -d "$VIKGIN_PAYLOAD" | jq '.'

echo ""
echo "=========================================="
echo "Both tests complete!"
echo "=========================================="
