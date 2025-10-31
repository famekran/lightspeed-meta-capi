# Planning Summary - Lightspeed Meta CAPI
## Multi-Tenant Architecture - Ready for Implementation

**Status**: ✅ Planning Phase Complete
**Date**: 2025-10-15
**Architecture**: Multi-tenant, GitHub-first deployment

---

## 📋 What We Accomplished

### 1. Architecture Design
- **Multi-tenant pattern**: Single Worker handles multiple webshops
- **Shop identification**: Via URL parameter `?shop=vikginchoice`
- **Scalability**: Add new shop = 5 environment variables
- **Isolation**: Per-shop credentials, tracking, and logging

### 2. Documentation Updates

**CLAUDE.md:**
- Multi-tenant architecture overview
- GitHub-first workflow documentation
- Per-shop credentials management
- Implementation checklist (Phase 0-5)

**README.md:**
- Multi-shop support explanation
- Updated Quick Start with GitHub Actions
- Three-tier secret management strategy
- Implementation roadmap

**DEPLOYMENT.md:**
- GitHub Actions as primary deployment method
- Manual deploy.sh as fallback
- Per-shop webhook setup instructions
- Step-by-step guide for adding new shops

**.env.example:**
- Multi-shop credential template
- VikGinChoice + Retoertje sections
- GitHub Secrets setup checklist
- 12 required secrets documented

---

## 🏪 Shops Configuration

### Currently Planned:
1. **VikGinChoice** (vikginchoice.nl)
2. **Retoertje**

### Credentials Required Per Shop (5 each):
```
SHOPNAME_LIGHTSPEED_API_KEY
SHOPNAME_LIGHTSPEED_API_SECRET
SHOPNAME_LIGHTSPEED_SHOP_ID
SHOPNAME_META_ACCESS_TOKEN
SHOPNAME_META_PIXEL_ID
```

### Shared Credentials (2):
```
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
```

**Total**: 12 secrets for 2 shops

---

## 🔑 Credentials Status

### ✅ Already Have:
- `CLOUDFLARE_API_TOKEN` = `sDlEOCgSrV_g3sP3wQYlwdiLFWT_4dBuYRW7BLuo`
- `CLOUDFLARE_ACCOUNT_ID` = `2febeaec7b825dc19b659d7e783cf622`
- `LIGHTSPEED_API_KEY` = `86d1160f58d16e09224b8f3351a96e90` (which shop?)
- `LIGHTSPEED_API_SECRET` = `764ecf6433ea31f0637affd77dcb03aa` (which shop?)

### ❌ Still Need:
**VikGinChoice:**
- `VIKGINCHOICE_LIGHTSPEED_SHOP_ID` - Get from Lightspeed API
- `VIKGINCHOICE_META_ACCESS_TOKEN` - Get from Meta Business Manager
- `VIKGINCHOICE_META_PIXEL_ID` - Get from Meta Events Manager

**Retoertje:**
- `RETOERTJE_LIGHTSPEED_API_KEY` - Get from Lightspeed Admin
- `RETOERTJE_LIGHTSPEED_API_SECRET` - Get from Lightspeed Admin
- `RETOERTJE_LIGHTSPEED_SHOP_ID` - Get from Lightspeed API
- `RETOERTJE_META_ACCESS_TOKEN` - Get from Meta Business Manager
- `RETOERTJE_META_PIXEL_ID` - Get from Meta Events Manager

---

## 🚀 Deployment Strategy: GitHub-First

### Workflow:
```
1. Developer commits code
   ↓
2. git push origin main
   ↓
3. GitHub Actions triggers
   ↓
4. Reads GitHub Secrets
   ↓
5. Deploys to Cloudflare
   ↓
6. Sets Worker secrets
   ↓
7. Worker live!
```

### Advantages:
- ✅ Fully automated (no manual wrangler commands)
- ✅ Secure (GitHub encrypts secrets)
- ✅ Auditable (GitHub logs all deployments)
- ✅ Consistent (same process every time)
- ✅ Team-friendly (anyone can deploy)

### Fallback:
- Manual `deploy.sh` script for emergencies
- Uses local `.env.local` credentials

---

## 📁 File Structure (To Be Created)

```
src/
├── index.js              # Main worker (routing + shop detection)
├── config/
│   └── shops.js          # Multi-tenant shop configuration
├── handlers/
│   ├── webhook.js        # Multi-tenant webhook handler
│   └── cron.js           # Scheduled sync (all shops)
├── services/
│   ├── lightspeed.js     # Lightspeed API client (shop-aware)
│   ├── meta-capi.js      # Meta CAPI client (shop-aware)
│   └── logger.js         # R2 logging (per shop)
└── utils/
    ├── hash.js           # SHA-256 hashing
    ├── validator.js      # Request validation
    ├── retry.js          # Retry logic
    └── shop-resolver.js  # Shop detection from request

.github/
└── workflows/
    └── deploy.yml        # GitHub Actions CI/CD

deploy.sh                 # Manual deployment script
```

---

## 📝 Implementation Roadmap

### ✅ Phase 0: Infrastructure (COMPLETE)
- [x] Multi-tenant architecture design
- [x] CLAUDE.md documentation
- [x] README.md documentation
- [x] DEPLOYMENT.md documentation
- [x] .env.example template

### 🔜 Phase 1: Setup Files (NEXT)
- [ ] Create `.env.local` with known credentials
- [ ] Create `.github/workflows/deploy.yml`
- [ ] Create `deploy.sh` script
- [ ] Update `wrangler.toml` with account ID
- [ ] Initialize Git repository
- [ ] Create GitHub repository

### 🔜 Phase 2: Get Missing Credentials
**User Action Required:**
- [ ] Identify which shop has existing Lightspeed keys
- [ ] Get Lightspeed Shop IDs for both shops
- [ ] Get Meta credentials for VikGinChoice
- [ ] Get Meta credentials for Retoertje
- [ ] Add all 12 secrets to GitHub Secrets

### 🔜 Phase 3: Core Implementation
- [ ] Shop resolver utility
- [ ] Shop config mapper
- [ ] Worker routing with shop detection
- [ ] Multi-tenant secrets binding
- [ ] Error handling per shop

### 🔜 Phase 4: Lightspeed Integration
- [ ] Shop-aware Lightspeed API client
- [ ] Order data parser
- [ ] Webhook signature verification
- [ ] Test with VikGinChoice
- [ ] Test with Retoertje

### 🔜 Phase 5: Meta CAPI Integration
- [ ] SHA-256 hasher
- [ ] Shop-aware Meta CAPI client
- [ ] Event payload builder
- [ ] Event deduplication logic

### 🔜 Phase 6: Testing & Production
- [ ] Local testing (wrangler dev)
- [ ] Meta Test Events Tool validation
- [ ] Deploy via GitHub Actions
- [ ] Configure Lightspeed webhooks
- [ ] Production monitoring

---

## 🎯 Next Steps (When Ready to Implement)

### Immediate:
1. **Clarify existing credentials**:
   - Which shop do the existing Lightspeed keys belong to?
   - VikGinChoice or Retoertje?

2. **Get Meta credentials**:
   - VikGinChoice Meta Pixel ID + Access Token
   - Retoertje Meta Pixel ID + Access Token

3. **Get Lightspeed credentials for second shop**:
   - If existing keys are VikGinChoice → get Retoertje keys
   - If existing keys are Retoertje → get VikGinChoice keys

### Then:
4. Create `.env.local` with all 12 credentials
5. Add all 12 credentials to GitHub Secrets
6. Create GitHub repository
7. Create `.github/workflows/deploy.yml`
8. Create `deploy.sh` script
9. Push to GitHub → auto-deploy infrastructure

### Finally:
10. Start implementing Worker code (Phase 3-6)

---

## 📊 Success Criteria

### Infrastructure:
- [x] Multi-tenant architecture documented
- [ ] GitHub repository created
- [ ] GitHub Secrets configured (12 secrets)
- [ ] GitHub Actions workflow ready
- [ ] Manual deploy script ready

### Implementation:
- [ ] Worker handles multiple shops via `?shop=` parameter
- [ ] Shop-specific credentials loaded correctly
- [ ] Lightspeed orders fetched per shop
- [ ] Meta CAPI events sent to correct pixel per shop
- [ ] SHA-256 hashing working
- [ ] Event deduplication working

### Testing:
- [ ] Local testing successful (wrangler dev)
- [ ] VikGinChoice orders → Meta Test Events Tool
- [ ] Retoertje orders → Meta Test Events Tool
- [ ] Match quality > 5.0 in Meta Events Manager
- [ ] No PII in logs

### Production:
- [ ] GitHub Actions deploys successfully
- [ ] Both shop webhooks configured in Lightspeed
- [ ] Events flowing to both Meta pixels
- [ ] Monitoring dashboards set up
- [ ] Error handling tested

---

## 💡 Key Design Decisions

1. **Single Worker, Multiple Shops**
   - Why: Easier to maintain, cost-effective
   - Alternative rejected: One Worker per shop (more complex)

2. **GitHub-First Deployment**
   - Why: Automated, secure, auditable
   - Alternative rejected: Manual wrangler commands (error-prone)

3. **Shop ID via URL Parameter**
   - Why: Simple, explicit, debuggable
   - Alternative rejected: Detect from webhook payload (more fragile)

4. **Separate Meta Pixels per Shop**
   - Why: Proper attribution, separate analytics
   - Alternative rejected: Single pixel (can't separate shop performance)

5. **Three-Tier Secret Management**
   - Why: Local dev + CI/CD + production all covered
   - Tiers: .env.local → GitHub Secrets → Cloudflare Secrets

---

## 🔒 Security Considerations

- **PII Handling**: Always SHA-256 hash email/phone before sending to Meta
- **Secret Storage**: GitHub Secrets (encrypted) → Cloudflare Secrets (encrypted)
- **Webhook Verification**: Validate Lightspeed signatures (when implemented)
- **Rate Limiting**: Max 60 req/min to Meta CAPI
- **Error Logging**: Never log unhashed PII
- **Token Rotation**: Rotate all tokens every 90 days

---

## 📚 References

### Documentation Created:
- `CLAUDE.md` - Claude development instructions
- `README.md` - Project overview and quick start
- `DEPLOYMENT.md` - Deployment guide with GitHub Actions
- `.env.example` - Multi-shop credential template
- `PLANNING-SUMMARY.md` - This file

### Official Documentation:
- Cloudflare Workers: https://developers.cloudflare.com/workers/
- Meta Conversions API: https://developers.facebook.com/docs/marketing-api/conversions-api/
- Lightspeed eCom API: https://developers.lightspeedhq.com/ecom/

---

**Planning Phase**: ✅ COMPLETE
**Next**: Get missing credentials → Create setup files → Start implementation

