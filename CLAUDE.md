# Claude Project Instructions - Lightspeed Meta CAPI

## 🚀 CLAUDE STARTUP INSTRUCTIONS
**User should say**: "Start Claude voor lightspeed-meta-capi project"

**Then Claude should**:
1. Read: `README.md` (complete project overview)
2. Check: `.env.local` (alle werkende credentials)
3. Review: `wrangler.toml` (Cloudflare Worker config)
4. Ready to build!

## 📁 PROJECT CONTEXT
Dit is een **standalone Cloudflare Worker** voor server-side conversion tracking tussen Lightspeed eCom C-Series en Meta Conversions API.

**Volledig gescheiden van**: handleidingen-automation project in parent folder

## 🏪 MULTI-TENANT ARCHITECTURE
**BELANGRIJK**: Deze Worker ondersteunt **meerdere webshops** via één deployment:

### Supported Webshops:
1. **VikGinChoice** (vikginchoice.nl) - Primary shop
2. **Retoertje** - Secondary shop
3. *Easily add more...*

### Architecture Pattern:
- **Single Worker** handles all shops
- Shop identified via webhook URL parameter: `?shop=vikginchoice`
- **Per-shop credentials** mapped via environment variables
- **Shared codebase**, isolated data per shop

### Adding New Shops:
```bash
# 1. Add 5 environment variables per shop:
SHOPNAME_LIGHTSPEED_API_KEY=xxx
SHOPNAME_LIGHTSPEED_API_SECRET=xxx
SHOPNAME_LIGHTSPEED_SHOP_ID=xxx
SHOPNAME_META_ACCESS_TOKEN=xxx
SHOPNAME_META_PIXEL_ID=xxx

# 2. Configure webhook in Lightspeed:
https://worker-url/webhook?shop=shopname

# Done! Worker automatically handles the new shop.
```

## 🎯 MAIN TASK
Bouw een Cloudflare Worker die:

1. **Multi-Shop Support**
   - Detect shop from webhook request (?shop=vikginchoice)
   - Load shop-specific credentials from environment
   - Route to correct Lightspeed API + Meta Pixel

2. **Lightspeed Orders ophalen**
   - Via Orders API endpoint
   - Periodiek (cron) of via webhook (order.created)
   - Extract: order_id, total, currency, customer data
   - **Per shop**: different API keys

3. **Meta CAPI Events versturen**
   - Event: "Purchase"
   - User data: SHA-256 gehasht (email, phone)
   - Event deduplication: zelfde event_id als pixel
   - Complete payload volgens CAPI spec
   - **Per shop**: different pixel IDs

4. **Security & Best Practices**
   - Credentials via Cloudflare Secrets
   - Webhook signature verification (per shop)
   - SHA-256 hashing voor PII
   - Rate limiting & retry logica

5. **Logging & Debugging**
   - Optionele R2 logging (per shop)
   - Cloudflare Workers Analytics
   - Meta Test Events Tool integratie

## 🔑 CREDENTIALS LOCATION & MANAGEMENT

### Three-Tier Secret Strategy:
```
1. LOCAL (.env.local)
   ↓ For: wrangler dev (local testing)

2. GITHUB SECRETS
   ↓ For: GitHub Actions CI/CD → Auto-deploy

3. CLOUDFLARE SECRETS
   ↓ For: Production runtime (Worker environment)
```

### GitHub-First Workflow (RECOMMENDED):
✅ **Store ALL credentials in GitHub Secrets** (encrypted vault)
✅ **GitHub Actions** auto-deploys on push
✅ **Never manually run** `wrangler secret put` in production

### Required Secrets per Shop:
**VikGinChoice:**
- `VIKGINCHOICE_LIGHTSPEED_API_KEY`
- `VIKGINCHOICE_LIGHTSPEED_API_SECRET`
- `VIKGINCHOICE_LIGHTSPEED_SHOP_ID`
- `VIKGINCHOICE_META_ACCESS_TOKEN`
- `VIKGINCHOICE_META_PIXEL_ID`

**Retoertje:**
- `RETOERTJE_LIGHTSPEED_API_KEY`
- `RETOERTJE_LIGHTSPEED_API_SECRET`
- `RETOERTJE_LIGHTSPEED_SHOP_ID`
- `RETOERTJE_META_ACCESS_TOKEN`
- `RETOERTJE_META_PIXEL_ID`

**Shared:**
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `GITHUB_TOKEN` (optional - for advanced workflows)

**Platforms met credentials**:
- ✅ Cloudflare (Account ID, API Token)
- ✅ Meta (Access Token, Pixel ID - **per shop**)
- ✅ Lightspeed (API Key, Secret, Shop ID - **per shop**)
- ✅ GitHub (Secrets vault voor alle credentials)

## 📚 IMPLEMENTATION REFERENCE

### Core APIs te gebruiken:
1. **Cloudflare Workers Fetch API**
   - https://developers.cloudflare.com/workers/runtime-apis/fetch/
   - Voor POST naar Meta CAPI

2. **Cloudflare Crypto API**
   - https://developers.cloudflare.com/workers/runtime-apis/crypto/
   - Voor SHA-256 hashen user_data

3. **Meta CAPI Endpoint**
   - POST: `https://graph.facebook.com/v18.0/{pixel_id}/events`
   - Headers: access_token
   - Body: data array met events

4. **Lightspeed Orders API**
   - GET: `{cluster_url}/orders.json`
   - Headers: API Key
   - Query: filters voor nieuwe orders

### Event Payload Structure (Meta CAPI):
```javascript
{
  "data": [
    {
      "event_name": "Purchase",
      "event_time": 1234567890, // Unix timestamp
      "event_id": "order_123",   // Zelfde als pixel event_id!
      "event_source_url": "https://shop.example.com/checkout",
      "action_source": "website",
      "user_data": {
        "em": ["sha256_hash_of_email"],
        "ph": ["sha256_hash_of_phone"],
        "ct": ["sha256_hash_of_city"],
        "country": ["nl"]
      },
      "custom_data": {
        "currency": "EUR",
        "value": 99.99,
        "content_ids": ["product_123"],
        "content_type": "product",
        "num_items": 2
      }
    }
  ],
  "test_event_code": "TEST12345" // Alleen in test mode
}
```

## 🏗️ FOLDER STRUCTURE TO CREATE
```
lightspeed-meta-capi/
├── src/
│   ├── index.js              # Main worker (routing + shop detection)
│   ├── config/
│   │   └── shops.js          # Multi-tenant shop configuration
│   ├── handlers/
│   │   ├── webhook.js        # Multi-tenant webhook handler
│   │   └── cron.js           # Scheduled sync (all shops)
│   ├── services/
│   │   ├── lightspeed.js     # Lightspeed API client (shop-aware)
│   │   ├── meta-capi.js      # Meta CAPI client (shop-aware)
│   │   └── logger.js         # R2 logging service (per shop)
│   └── utils/
│       ├── hash.js           # SHA-256 hashing
│       ├── validator.js      # Request validation
│       ├── retry.js          # Retry logic voor API calls
│       └── shop-resolver.js  # NEW: Resolve shop from request
├── .github/
│   └── workflows/
│       └── deploy.yml        # GitHub Actions CI/CD
├── deploy.sh                 # Local deployment script
├── .env.local                # Local credentials (gitignored)
├── .env.example              # Template for new developers
├── wrangler.toml             # Cloudflare Worker config
└── package.json              # Dependencies
```

## ✅ IMPLEMENTATION CHECKLIST

### Phase 0: Infrastructure Setup (GitHub-First)
- [ ] Create `.env.local` with multi-shop credentials
- [ ] Update `.env.example` with multi-shop template
- [ ] Initialize Git repository
- [ ] Create GitHub repository (github.com/famekran/lightspeed-meta-capi)
- [ ] Add all secrets to GitHub Secrets vault
- [ ] Create `.github/workflows/deploy.yml` (GitHub Actions)
- [ ] Create `deploy.sh` script for local deployments
- [ ] Test: Push to GitHub → auto-deploy

### Phase 1: Core Setup
- [ ] Create shop resolver utility (src/utils/shop-resolver.js)
- [ ] Create shop config mapper (src/config/shops.js)
- [ ] Initialize Worker routing (GET /health, POST /webhook?shop=X)
- [ ] Implement multi-tenant secrets binding
- [ ] Setup error handling & logging (per shop)

### Phase 2: Lightspeed Integration
- [ ] Lightspeed API client (shop-aware auth, orders fetch)
- [ ] Order data parser (extract relevant fields)
- [ ] Webhook signature verification (per shop)
- [ ] Test with VikGinChoice first, then Retoertje

### Phase 3: Meta CAPI Integration
- [ ] SHA-256 hasher voor user_data
- [ ] Meta CAPI client (shop-aware POST events)
- [ ] Event payload builder (per shop pixel)
- [ ] Deduplication logic (event_id matching)

### Phase 4: Testing & Debugging
- [ ] Local testing: wrangler dev + Postman
- [ ] Test VikGinChoice → Meta Test Events Tool
- [ ] Test Retoertje → Meta Test Events Tool
- [ ] Error handling & retry logic
- [ ] R2 logging implementatie (per shop, optioneel)

### Phase 5: Production Deployment
- [ ] Verify all secrets in GitHub Secrets
- [ ] Push to GitHub → GitHub Actions deploys
- [ ] Setup webhooks in Lightspeed (both shops)
- [ ] Monitor via Cloudflare Analytics
- [ ] Verify events in Meta Events Manager (both pixels)

## 🔐 SECURITY REQUIREMENTS
- ✅ **PII Hashing**: Email/phone ALTIJD SHA-256 hashen
- ✅ **Secrets**: NOOIT hardcoded, altijd via Cloudflare Secrets
- ✅ **Webhook Verification**: Validate Lightspeed signatures
- ✅ **Rate Limiting**: Max 60 req/min naar Meta CAPI
- ✅ **Error Logging**: Sensitive data NIET loggen

## 🧪 TESTING STRATEGY
1. **Unit Tests**: Hash functions, payload builders
2. **Integration Tests**: Mock Lightspeed/Meta APIs
3. **Local Dev**: `wrangler dev` + Postman
4. **Meta Test Mode**: Use Test Events Tool
5. **Staging**: Lightspeed sandbox → Meta test pixel

## 📊 MONITORING
- **Cloudflare Workers Analytics**: Request metrics
- **Meta Events Manager**: Conversion tracking
- **R2 Logs**: Debug events (optioneel)
- **Wrangler Tail**: Live log streaming

## 🚨 COMMON PITFALLS TO AVOID
1. ❌ User data NIET hashen → rejected by Meta
2. ❌ Event_id NIET matchen met pixel → dubbele events
3. ❌ Incomplete user_data → lage match quality
4. ❌ Secrets in code → security risk
5. ❌ Geen retry logic → data loss bij API errors

## 🔄 DEPLOYMENT WORKFLOW (GitHub-First)

### Initial Setup (Eenmalig):
```bash
# 1. Install dependencies
npm install

# 2. Create GitHub repo
git init
git remote add origin https://github.com/famekran/lightspeed-meta-capi.git

# 3. Add ALL secrets to GitHub Secrets (via GitHub UI):
# → Settings → Secrets → Actions → New repository secret
# Add: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID
# Add: VIKGINCHOICE_* (5 secrets)
# Add: RETOERTJE_* (5 secrets)

# 4. First deployment
git add .
git commit -m "Initial commit: Multi-tenant Lightspeed Meta CAPI"
git push -u origin main
# → GitHub Actions automatically deploys to Cloudflare!
```

### Daily Development Workflow:
```bash
# 1. Make changes to code
# ... edit src/index.js ...

# 2. Test locally
npm run dev  # = wrangler dev

# 3. Commit & push (auto-deploys!)
git add .
git commit -m "Add feature X"
git push origin main
# → GitHub Actions → Cloudflare deployment

# 4. Monitor logs
npm run tail  # = wrangler tail --format pretty
```

### Manual Deployment (Fallback):
```bash
# Only if GitHub Actions fails - uses local .env.local
./deploy.sh
```

### Adding a New Shop:
```bash
# 1. Add 5 secrets to GitHub Secrets:
NEWSHOP_LIGHTSPEED_API_KEY
NEWSHOP_LIGHTSPEED_API_SECRET
NEWSHOP_LIGHTSPEED_SHOP_ID
NEWSHOP_META_ACCESS_TOKEN
NEWSHOP_META_PIXEL_ID

# 2. Add shop config to src/config/shops.js
# 3. Commit & push → auto-deploy
# 4. Configure webhook in Lightspeed:
# https://worker-url/webhook?shop=newshop
```

## 📝 NEXT STEPS FOR CLAUDE
1. Bevestig begrip van requirements
2. Review `.env.local` voor credentials
3. Start met Phase 1: Core Setup
4. Incrementele implementatie per fase
5. Test elke component voordat verder gaan

---

**Status**: 🔴 Ready voor Claude implementatie
**Priority**: Setup foundation eerst (routing, auth, error handling)
