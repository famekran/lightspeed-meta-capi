#!/bin/bash

# Manual Deployment Script for Lightspeed Meta CAPI Worker
# Uses .env.local for credentials

echo "🚀 Deploying Lightspeed Meta CAPI Worker to Cloudflare..."
echo ""

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "❌ Error: .env.local not found!"
    echo "Please create .env.local from .env.example and fill in your credentials."
    exit 1
fi

# Load environment variables
echo "📋 Loading environment variables from .env.local..."
source .env.local

# Validate required variables
if [ -z "$CLOUDFLARE_API_TOKEN" ] || [ -z "$CLOUDFLARE_ACCOUNT_ID" ]; then
    echo "❌ Error: Missing Cloudflare credentials in .env.local"
    exit 1
fi

# Export for wrangler
export CLOUDFLARE_API_TOKEN
export CLOUDFLARE_ACCOUNT_ID

# Deploy to Cloudflare
echo ""
echo "📦 Deploying Worker to Cloudflare..."
wrangler deploy

if [ $? -ne 0 ]; then
    echo "❌ Deployment failed!"
    exit 1
fi

# Setup secrets (only if .env.local has all secrets)
echo ""
echo "🔐 Setting up Worker secrets..."

# VikGinChoice secrets
if [ -n "$VIKGINCHOICE_LIGHTSPEED_API_KEY" ]; then
    echo "$VIKGINCHOICE_LIGHTSPEED_API_KEY" | wrangler secret put VIKGINCHOICE_LIGHTSPEED_API_KEY --force
    echo "$VIKGINCHOICE_LIGHTSPEED_API_SECRET" | wrangler secret put VIKGINCHOICE_LIGHTSPEED_API_SECRET --force
    echo "$VIKGINCHOICE_LIGHTSPEED_SHOP_ID" | wrangler secret put VIKGINCHOICE_LIGHTSPEED_SHOP_ID --force
    echo "$VIKGINCHOICE_META_ACCESS_TOKEN" | wrangler secret put VIKGINCHOICE_META_ACCESS_TOKEN --force
    echo "$VIKGINCHOICE_META_PIXEL_ID" | wrangler secret put VIKGINCHOICE_META_PIXEL_ID --force
    echo "  ✅ VikGinChoice secrets configured"
fi

# Retoertje secrets
if [ -n "$RETOERTJE_LIGHTSPEED_API_KEY" ]; then
    echo "$RETOERTJE_LIGHTSPEED_API_KEY" | wrangler secret put RETOERTJE_LIGHTSPEED_API_KEY --force
    echo "$RETOERTJE_LIGHTSPEED_API_SECRET" | wrangler secret put RETOERTJE_LIGHTSPEED_API_SECRET --force
    echo "$RETOERTJE_LIGHTSPEED_SHOP_ID" | wrangler secret put RETOERTJE_LIGHTSPEED_SHOP_ID --force
    echo "$RETOERTJE_META_ACCESS_TOKEN" | wrangler secret put RETOERTJE_META_ACCESS_TOKEN --force
    echo "$RETOERTJE_META_PIXEL_ID" | wrangler secret put RETOERTJE_META_PIXEL_ID --force
    echo "  ✅ Retoertje secrets configured"
fi

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "🔗 Live Worker URL:"
echo "   https://lightspeed-meta-capi.f-amekran.workers.dev"
echo ""
echo "📝 Next steps:"
echo "1. Configure webhooks in Lightspeed:"
echo "   - VikGinChoice: https://lightspeed-meta-capi.f-amekran.workers.dev/webhook?shop=vikginchoice"
echo "   - Retoertje: https://lightspeed-meta-capi.f-amekran.workers.dev/webhook?shop=retoertje"
echo ""
echo "2. Test with test order in Lightspeed"
echo ""
echo "3. Monitor logs:"
echo "   npm run tail"
echo ""
echo "💡 Daily workflow: git push → GitHub Actions auto-deploys"
