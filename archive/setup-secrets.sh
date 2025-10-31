#!/bin/bash

# Setup Cloudflare Worker Secrets
# Run this once after deployment to configure all secrets

echo "🔐 Setting up Cloudflare Worker secrets..."
echo ""

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "❌ Error: .env.local not found!"
    exit 1
fi

# Load environment variables
source .env.local

# Export Cloudflare credentials
export CLOUDFLARE_API_TOKEN
export CLOUDFLARE_ACCOUNT_ID

echo "Setting up secrets for VikGinChoice..."
echo "$VIKGINCHOICE_LIGHTSPEED_API_KEY" | npx wrangler secret put VIKGINCHOICE_LIGHTSPEED_API_KEY
echo "$VIKGINCHOICE_LIGHTSPEED_API_SECRET" | npx wrangler secret put VIKGINCHOICE_LIGHTSPEED_API_SECRET
echo "$VIKGINCHOICE_LIGHTSPEED_SHOP_ID" | npx wrangler secret put VIKGINCHOICE_LIGHTSPEED_SHOP_ID
echo "$VIKGINCHOICE_META_ACCESS_TOKEN" | npx wrangler secret put VIKGINCHOICE_META_ACCESS_TOKEN
echo "$VIKGINCHOICE_META_PIXEL_ID" | npx wrangler secret put VIKGINCHOICE_META_PIXEL_ID

echo ""
echo "Setting up secrets for Retoertje..."
echo "$RETOERTJE_LIGHTSPEED_API_KEY" | npx wrangler secret put RETOERTJE_LIGHTSPEED_API_KEY
echo "$RETOERTJE_LIGHTSPEED_API_SECRET" | npx wrangler secret put RETOERTJE_LIGHTSPEED_API_SECRET
echo "$RETOERTJE_LIGHTSPEED_SHOP_ID" | npx wrangler secret put RETOERTJE_LIGHTSPEED_SHOP_ID
echo "$RETOERTJE_META_ACCESS_TOKEN" | npx wrangler secret put RETOERTJE_META_ACCESS_TOKEN
echo "$RETOERTJE_META_PIXEL_ID" | npx wrangler secret put RETOERTJE_META_PIXEL_ID

echo ""
echo "✅ All secrets configured!"
echo ""
echo "🧪 Test the webhook:"
echo "curl https://lightspeed-meta-capi.f-amekran.workers.dev/webhook?shop=vikginchoice"
