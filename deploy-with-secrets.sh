#!/bin/bash
set -e

echo "🚀 Lightspeed Meta CAPI - Complete Deployment Script"
echo "======================================================"

# Load environment variables
if [ ! -f .env.local ]; then
  echo "❌ Error: .env.local not found"
  exit 1
fi

source .env.local

# Export Cloudflare credentials
export CLOUDFLARE_API_TOKEN
export CLOUDFLARE_ACCOUNT_ID

echo ""
echo "📦 Step 1: Deploy Worker code..."
npx wrangler deploy

echo ""
echo "🔐 Step 2: Upload VikGinChoice secrets..."
echo "$VIKGINCHOICE_LIGHTSPEED_API_KEY" | npx wrangler secret put VIKGINCHOICE_LIGHTSPEED_API_KEY
echo "$VIKGINCHOICE_LIGHTSPEED_API_SECRET" | npx wrangler secret put VIKGINCHOICE_LIGHTSPEED_API_SECRET
echo "$VIKGINCHOICE_LIGHTSPEED_SHOP_ID" | npx wrangler secret put VIKGINCHOICE_LIGHTSPEED_SHOP_ID
echo "$VIKGINCHOICE_META_ACCESS_TOKEN" | npx wrangler secret put VIKGINCHOICE_META_ACCESS_TOKEN
echo "$VIKGINCHOICE_META_PIXEL_ID" | npx wrangler secret put VIKGINCHOICE_META_PIXEL_ID
echo "$VIKGINCHOICE_GA4_MEASUREMENT_ID" | npx wrangler secret put VIKGINCHOICE_GA4_MEASUREMENT_ID
echo "$VIKGINCHOICE_GA4_API_SECRET" | npx wrangler secret put VIKGINCHOICE_GA4_API_SECRET

echo ""
echo "🔐 Step 3: Upload Retoertje secrets..."
echo "$RETOERTJE_LIGHTSPEED_API_KEY" | npx wrangler secret put RETOERTJE_LIGHTSPEED_API_KEY
echo "$RETOERTJE_LIGHTSPEED_API_SECRET" | npx wrangler secret put RETOERTJE_LIGHTSPEED_API_SECRET
echo "$RETOERTJE_LIGHTSPEED_SHOP_ID" | npx wrangler secret put RETOERTJE_LIGHTSPEED_SHOP_ID
echo "$RETOERTJE_META_ACCESS_TOKEN" | npx wrangler secret put RETOERTJE_META_ACCESS_TOKEN
echo "$RETOERTJE_META_PIXEL_ID" | npx wrangler secret put RETOERTJE_META_PIXEL_ID
echo "$RETOERTJE_GA4_MEASUREMENT_ID" | npx wrangler secret put RETOERTJE_GA4_MEASUREMENT_ID
echo "$RETOERTJE_GA4_API_SECRET" | npx wrangler secret put RETOERTJE_GA4_API_SECRET

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🔗 Worker URL: https://lightspeed-meta-capi.f-amekran.workers.dev"
echo ""
echo "📋 Next steps:"
echo "1. Test webhook: curl https://lightspeed-meta-capi.f-amekran.workers.dev/health"
echo "2. Place test order on VikGinChoice or Retoertje"
echo "3. Monitor logs: npx wrangler tail lightspeed-meta-capi --format pretty"
