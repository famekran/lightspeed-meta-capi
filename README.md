# Lightspeed → Meta Conversions API Bridge
**Multi-Tenant Cloudflare Worker voor server-side conversion tracking**

## 📋 Project Overzicht
Deze Cloudflare Worker fungeert als bridge tussen Lightspeed eCom C-Series en Meta Conversions API voor server-side tracking van purchase events.

**Flow**: Lightspeed Order → Worker → Meta CAPI → Facebook Ads Manager

## 🏪 Multi-Tenant Architecture
**Ondersteunt meerdere webshops via één Worker deployment:**

### Supported Webshops:
1. **VikGinChoice** (vikginchoice.nl)
2. **Retoertje**
3. *Nieuwe shops toevoegen = 5 environment variables*

### Hoe het werkt:
- Shop geïdentificeerd via webhook URL: `?shop=vikginchoice`
- Per-shop credentials (Lightspeed API keys + Meta Pixel IDs)
- Shared codebase, isolated tracking per shop
- Easy scaling: add shop = add credentials

## 🎯 Functionaliteit
- **Multi-shop support**: Single Worker handles multiple webshops
- Purchase events van Lightspeed naar Meta CAPI sturen
- User data hashen (SHA-256) volgens Meta vereisten
- Event deduplication met Pixel (zelfde event_id)
- Per-shop credentials management
- GitHub-first deployment workflow
- Optionele logging naar R2 voor debugging

## 🔑 Vereiste API Keys & Tokens

### Per Shop (VikGinChoice + Retoertje):
- **Lightspeed**: API Key, API Secret, Shop ID
- **Meta**: Access Token, Pixel ID (separate pixel per shop!)

### Shared:
- **Cloudflare**: Account ID, API Token
- **GitHub**: Token (for CI/CD)

**Total: 12 secrets** voor 2 shops (see `.env.example`)

## 📚 Officiële Documentatie

### 🟦 Cloudflare Workers
- **Workers Developer Docs**
  https://developers.cloudflare.com/workers/
  _(Overzicht: syntax, environment variables, fetch-API, secrets, deployen)_

- **Using fetch() in Workers**
  https://developers.cloudflare.com/workers/runtime-apis/fetch/
  _(Voor POST-requests naar Meta CAPI endpoint)_

- **Environment Variables & Secrets Binding**
  https://developers.cloudflare.com/workers/configuration/secrets/
  _(Veilig opslaan: META_ACCESS_TOKEN, PIXEL_ID, LS_API_KEY)_

- **Crypto API in Workers**
  https://developers.cloudflare.com/workers/runtime-apis/crypto/
  _(SHA-256 hashen van e-mail/telefoon voor Meta user_data)_

- **Workers R2 Storage (optioneel)**
  https://developers.cloudflare.com/r2/
  _(Logging van requests en debug events)_

### 🟩 Meta Conversions API
- **Conversions API Overview**
  https://developers.facebook.com/docs/marketing-api/conversions-api/

- **Events Reference — Fields and Structure**
  https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/

- **CAPI Best Practices & Deduplication**
  https://developers.facebook.com/docs/marketing-api/conversions-api/deduplicate-pixel-and-server-events/

- **Test Events Tool**
  https://www.facebook.com/events_manager2/list/test_events
  _(Voor debuggen zodra de Worker live is)_

- **Meta Event Examples (JSON)**
  https://developers.facebook.com/docs/marketing-api/conversions-api/examples/

- **Troubleshooting Guide & Match Quality**
  https://www.facebook.com/business/help/308855623839366

### 🟨 Lightspeed eCom C-Series API
- **Lightspeed eCom C-Series API Reference**
  https://developers.lightspeedhq.com/ecom/introduction/

- **Orders Endpoint**
  https://developers.lightspeedhq.com/ecom/endpoints/order/
  _(Voor ophalen van orderdetails → event payload bouwen)_

### 🧩 Aanvullend
- **Server-Side Tagging vs. Custom CAPI (vergelijking)**
  https://stape.io/blog/meta-conversions-api-gateway-versus-conversion-api/

## 🪄 Claude Taak Omschrijving

Bouw een Cloudflare Worker die Purchase-events uit de Lightspeed C-Series API stuurt naar Meta Conversions API.

**De Worker moet:**
1. Periodiek of bij trigger (order.created) orders ophalen van Lightspeed
2. Purchase events versturen met:
   - `event_name: "Purchase"`
   - `event_time` (Unix timestamp)
   - `event_id` (gelijk aan pixel voor deduplication)
   - `currency`, `value`
   - `user_data` (email, phone - SHA-256 gehasht)
3. API sleutels en tokens veilig bewaren via Environment Secrets
4. Optionele logging naar R2 voor debugging

## 🚀 Quick Start (GitHub-First Workflow)

### Initial Setup:
```bash
# 1. Clone/setup project
git clone https://github.com/famekran/lightspeed-meta-capi.git
cd lightspeed-meta-capi
npm install

# 2. Setup local environment
cp .env.example .env.local
# Edit .env.local with your credentials

# 3. Add ALL secrets to GitHub
# Go to: GitHub → Settings → Secrets → Actions
# Add all 12 secrets (see .env.example)

# 4. Push to deploy
git add .
git commit -m "Initial setup"
git push origin main
# → GitHub Actions automatically deploys to Cloudflare!
```

### Daily Development:
```bash
# 1. Make changes
# ... edit code ...

# 2. Test locally
npm run dev

# 3. Deploy (auto via GitHub)
git push origin main
```

## 📁 Project Structuur
```
lightspeed-meta-capi/
├── README.md              # Dit bestand
├── CLAUDE.md             # Claude development instructions
├── DEPLOYMENT.md         # Deployment guide
├── .env.example          # Multi-shop credential template
├── .env.local            # Local credentials (git ignored)
├── wrangler.toml         # Cloudflare Worker config
├── package.json          # Dependencies
├── deploy.sh             # Manual deployment script
├── .github/
│   └── workflows/
│       └── deploy.yml    # GitHub Actions CI/CD
└── src/                  # (To be created)
    ├── index.js          # Main worker (routing + shop detection)
    ├── config/
    │   └── shops.js      # Multi-tenant shop configuration
    ├── handlers/
    │   ├── webhook.js    # Multi-tenant webhook handler
    │   └── cron.js       # Scheduled sync (all shops)
    ├── services/
    │   ├── lightspeed.js # Lightspeed API client (shop-aware)
    │   ├── meta-capi.js  # Meta CAPI client (shop-aware)
    │   └── logger.js     # R2 logging (per shop)
    └── utils/
        ├── hash.js       # SHA-256 hashing
        ├── validator.js  # Request validation
        ├── retry.js      # Retry logic
        └── shop-resolver.js  # Shop detection from request
```

## 🔐 Security

### Three-Tier Secret Management:
```
1. LOCAL (.env.local)     → For: wrangler dev
2. GITHUB SECRETS         → For: GitHub Actions CI/CD
3. CLOUDFLARE SECRETS     → For: Production runtime
```

### Best Practices:
- **NOOIT** `.env.local` committen naar Git
- **Store ALL credentials** in GitHub Secrets
- **Use separate Meta pixels** per shop
- **Hash altijd user data** (email/phone) voor Meta CAPI
- **Rotate tokens** every 90 days

## 🧪 Testing
1. **Lokaal testen**: `wrangler dev` + Postman/curl
2. **Meta Test Events Tool**: Valideer events in Facebook Events Manager
3. **Lightspeed Sandbox**: Test met sandbox API keys eerst

## 📊 Monitoring
- Cloudflare Workers Analytics voor request metrics
- Meta Events Manager voor conversion tracking
- R2 logs voor debugging (optioneel)

## 🔄 Deployment Workflow (GitHub-First)

### Automated (Recommended):
```bash
# Edit code → commit → push → auto-deploy!
git add .
git commit -m "Add feature X"
git push origin main
# → GitHub Actions deploys to Cloudflare automatically
```

### Manual (Fallback):
```bash
# If GitHub Actions fails
./deploy.sh
```

### Adding a New Shop:
```bash
# 1. Add 5 secrets to GitHub Secrets UI
# 2. Add shop config to src/config/shops.js
# 3. Commit & push → auto-deploy
# 4. Configure webhook in Lightspeed with ?shop=newshop
```

## 📝 Implementation Roadmap

### Phase 0: Infrastructure (PLANNING - Current)
- [x] Multi-tenant architecture design
- [x] Documentation updates (CLAUDE.md, README.md, .env.example)
- [ ] DEPLOYMENT.md update
- [ ] GitHub Actions workflow documentation
- [ ] deploy.sh script documentation

### Phase 1: Core Setup (Implementation)
- [ ] Shop resolver utility
- [ ] Shop config mapper
- [ ] Worker routing with shop detection
- [ ] Multi-tenant secrets binding
- [ ] Error handling per shop

### Phase 2: Lightspeed Integration
- [ ] Shop-aware Lightspeed API client
- [ ] Order data parser
- [ ] Webhook signature verification
- [ ] Test with VikGinChoice, then Retoertje

### Phase 3: Meta CAPI Integration
- [ ] SHA-256 hasher
- [ ] Shop-aware Meta CAPI client
- [ ] Event payload builder
- [ ] Event deduplication logic

### Phase 4: Testing & Production
- [ ] Local testing (wrangler dev)
- [ ] Meta Test Events Tool validation
- [ ] GitHub Actions deployment
- [ ] Lightspeed webhook configuration
- [ ] Production monitoring

## 🆘 Support
- **Cloudflare Workers**: https://discord.gg/cloudflaredev
- **Meta Developer**: https://developers.facebook.com/support/
- **Lightspeed**: https://www.lightspeedhq.com/support/

---

**Status**: 🔴 Setup fase - Ready voor Claude implementatie
