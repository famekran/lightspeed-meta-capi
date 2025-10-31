# Deployment Guide - Lightspeed Meta CAPI
## Multi-Tenant GitHub-First Workflow

## 📋 Pre-Deployment Checklist

### 1. Credentials verzamelen (Per Shop!)

**VikGinChoice:**
- [ ] Lightspeed API Key + Secret + Shop ID
- [ ] Meta Access Token + Pixel ID

**Retoertje:**
- [ ] Lightspeed API Key + Secret + Shop ID
- [ ] Meta Access Token + Pixel ID

**Shared:**
- [ ] Cloudflare Account ID + API Token
- [ ] GitHub Token (optional)

### 2. GitHub Repository Setup
```bash
# Create GitHub repo first:
# https://github.com/new → famekran/lightspeed-meta-capi

# Clone/navigate to project
cd lightspeed-meta-capi
npm install

# Configure local environment
cp .env.example .env.local
# Edit .env.local with all credentials (12 secrets for 2 shops)
```

### 3. GitHub Secrets Configuration (REQUIRED!)
```
Go to: https://github.com/famekran/lightspeed-meta-capi/settings/secrets/actions
Click: "New repository secret"

Add these 12 secrets:
```

**Shared (2 secrets):**
- `CLOUDFLARE_API_TOKEN` = `sDlEOCgSrV_g3sP3wQYlwdiLFWT_4dBuYRW7BLuo`
- `CLOUDFLARE_ACCOUNT_ID` = `2febeaec7b825dc19b659d7e783cf622`

**VikGinChoice (5 secrets):**
- `VIKGINCHOICE_LIGHTSPEED_API_KEY` = (from Lightspeed admin)
- `VIKGINCHOICE_LIGHTSPEED_API_SECRET` = (from Lightspeed admin)
- `VIKGINCHOICE_LIGHTSPEED_SHOP_ID` = (from Lightspeed API)
- `VIKGINCHOICE_META_ACCESS_TOKEN` = (from Meta Business Manager)
- `VIKGINCHOICE_META_PIXEL_ID` = (from Meta Events Manager)

**Retoertje (5 secrets):**
- `RETOERTJE_LIGHTSPEED_API_KEY` = (from Lightspeed admin)
- `RETOERTJE_LIGHTSPEED_API_SECRET` = (from Lightspeed admin)
- `RETOERTJE_LIGHTSPEED_SHOP_ID` = (from Lightspeed API)
- `RETOERTJE_META_ACCESS_TOKEN` = (from Meta Business Manager)
- `RETOERTJE_META_PIXEL_ID` = (from Meta Events Manager)

## 🚀 Deployment Workflow

### PRIMARY: GitHub Actions (Automated)

**Initial Deploy:**
```bash
# 1. Ensure all 12 secrets are in GitHub Secrets
# 2. Initialize Git & push
git init
git add .
git commit -m "Initial commit: Multi-tenant Lightspeed Meta CAPI"
git branch -M main
git remote add origin https://github.com/famekran/lightspeed-meta-capi.git
git push -u origin main

# → GitHub Actions automatically:
#    - Installs dependencies
#    - Runs tests
#    - Deploys to Cloudflare
#    - Sets up Worker secrets
#    - Returns Worker URL
```

**Daily Workflow:**
```bash
# 1. Make code changes
# ... edit src/index.js ...

# 2. Test locally
npm run dev

# 3. Commit & push → auto-deploy!
git add .
git commit -m "Add feature X"
git push origin main

# → GitHub Actions deploys automatically
# → Check: https://github.com/famekran/lightspeed-meta-capi/actions
```

**Monitor:**
```bash
# Live logs from Worker
npm run tail  # = wrangler tail --format pretty

# GitHub Actions status
# https://github.com/famekran/lightspeed-meta-capi/actions

# Cloudflare Dashboard
# https://dash.cloudflare.com → Workers → lightspeed-meta-capi
```

### FALLBACK: Manual Deploy (deploy.sh)

**When to use:**
- GitHub Actions fails
- Quick hotfix needed
- Testing deployment locally

```bash
# Uses .env.local for credentials
./deploy.sh

# Output:
# ✅ Secrets updated
# 📦 Deploying to production...
# 🎉 Deployment complete!
# 🔗 Live URL: https://lightspeed-meta-capi.xxx.workers.dev
```

## 🔗 Webhook Setup (Per Shop)

### VikGinChoice Webhook
1. Login to Lightspeed Admin for VikGinChoice
2. Go to: Apps → Webhooks → Create Webhook
3. Configure:
   - **Event**: `order.created`
   - **URL**: `https://lightspeed-meta-capi.xxx.workers.dev/webhook?shop=vikginchoice`
   - **Method**: POST
   - **Format**: JSON
4. Save & test

### Retoertje Webhook
1. Login to Lightspeed Admin for Retoertje
2. Go to: Apps → Webhooks → Create Webhook
3. Configure:
   - **Event**: `order.created`
   - **URL**: `https://lightspeed-meta-capi.xxx.workers.dev/webhook?shop=retoertje`
   - **Method**: POST
   - **Format**: JSON
4. Save & test

**Important:** Note the `?shop=` parameter - this tells the Worker which shop's credentials to use!

## 🆕 Adding a New Shop

**Example: Adding "NewShop"**

### Step 1: Get Credentials
1. Get Lightspeed API Key, Secret, Shop ID for NewShop
2. Create separate Meta Pixel for NewShop
3. Get Meta Access Token with access to new pixel

### Step 2: Add to GitHub Secrets
Add 5 new secrets to GitHub:
- `NEWSHOP_LIGHTSPEED_API_KEY`
- `NEWSHOP_LIGHTSPEED_API_SECRET`
- `NEWSHOP_LIGHTSPEED_SHOP_ID`
- `NEWSHOP_META_ACCESS_TOKEN`
- `NEWSHOP_META_PIXEL_ID`

### Step 3: Update Code (when implementing)
Add to `src/config/shops.js`:
```javascript
newshop: {
  name: 'NewShop',
  domain: 'newshop.com',
  lightspeed: {
    apiKey: env.NEWSHOP_LIGHTSPEED_API_KEY,
    apiSecret: env.NEWSHOP_LIGHTSPEED_API_SECRET,
    shopId: env.NEWSHOP_LIGHTSPEED_SHOP_ID,
    clusterUrl: 'https://api.webshopapp.com'
  },
  meta: {
    accessToken: env.NEWSHOP_META_ACCESS_TOKEN,
    pixelId: env.NEWSHOP_META_PIXEL_ID
  }
}
```

### Step 4: Deploy
```bash
git add .
git commit -m "Add NewShop support"
git push origin main
# → Auto-deploys via GitHub Actions
```

### Step 5: Configure Webhook
URL: `https://lightspeed-meta-capi.xxx.workers.dev/webhook?shop=newshop`

**That's it!** The Worker now handles NewShop orders.

## 🔗 Webhook Setup (Lightspeed)

### 1. Get Worker URL
Na `wrangler deploy` krijg je URL:
```
https://lightspeed-meta-capi.your-subdomain.workers.dev
```

### 2. Configure Lightspeed Webhook
1. Login Lightspeed Admin
2. Apps → Webhooks → Create Webhook
3. Settings:
   - **Event**: `order.created`
   - **URL**: `https://your-worker-url/webhook/order-created`
   - **Method**: POST
   - **Format**: JSON

### 3. Test Webhook
```bash
# Trigger test order in Lightspeed
# Monitor Worker logs:
wrangler tail --format pretty

# Check Meta Test Events Tool:
# https://www.facebook.com/events_manager2/list/test_events
```

## 🧪 Testing in Production

### Meta Test Mode
1. Set `META_TEST_MODE=true` in Worker vars
2. Deploy: `wrangler deploy`
3. Trigger test order
4. Verify in Meta Test Events Tool
5. Disable test mode: `META_TEST_MODE=false` + redeploy

### Validation Checklist
- [ ] Webhook receives Lightspeed events
- [ ] SHA-256 hashing works correctly
- [ ] Meta CAPI accepts events (no errors)
- [ ] Event_id matches tussen pixel en CAPI
- [ ] Match quality > 5.0 in Events Manager
- [ ] No PII in logs (only hashed data)

## 📊 Monitoring & Debugging

### Cloudflare Analytics
```
Dashboard → Workers → lightspeed-meta-capi → Metrics
```
- Request count
- Error rate
- CPU time
- Response time

### Meta Events Manager
```
https://business.facebook.com/events_manager2
```
- Event count (last 24h)
- Match quality score
- Deduplicated events
- Error messages

### Live Logs
```bash
# Cloudflare Worker logs
wrangler tail --format pretty

# Filter errors only
wrangler tail --format pretty | grep ERROR
```

### R2 Debug Logs (indien enabled)
```bash
# List log files
wrangler r2 object list lightspeed-meta-logs

# Download log file
wrangler r2 object get lightspeed-meta-logs/2024-01-15.json
```

## 🔄 Update Workflow

### Code Updates
```bash
# 1. Pull latest
git pull origin main

# 2. Make changes
# ... code ...

# 3. Test locally
npm run dev

# 4. Deploy
git add .
git commit -m "description"
git push origin main
wrangler deploy
```

### Secret Rotation (elke 90 dagen)
```bash
# Update secret
wrangler secret put META_ACCESS_TOKEN
# Enter new token when prompted

# Verify (redeploy not needed)
wrangler tail
```

### Rollback (bij problemen)
```bash
# List recent deployments
wrangler deployments list

# Rollback to specific version
wrangler rollback --message "Rollback due to X"
```

## 🚨 Troubleshooting

### Issue: "Unauthorized" bij Meta CAPI
**Check:**
- Access Token nog geldig?
- Token heeft `ads_management` permission?
- Pixel ID correct?

**Fix:**
```bash
wrangler secret put META_ACCESS_TOKEN
# Enter new token
```

### Issue: "Invalid Signature" bij Lightspeed Webhook
**Check:**
- WEBHOOK_SECRET correct?
- Signature verification logic correct?

**Fix:**
```bash
wrangler secret put WEBHOOK_SECRET
# Enter correct secret from Lightspeed
```

### Issue: Lage Match Quality (<3.0)
**Oorzaken:**
- Email/phone niet correct gehasht
- Incomplete user_data
- Wrong country code

**Fix:**
- Verify SHA-256 hash format (lowercase hex)
- Add more user_data fields (ct, st, zp)
- Use ISO country codes (nl, de, us)

## 📝 Platform-Specific Notes

### Cloudflare Workers Limits (Free Tier)
- 100,000 requests/day
- 10ms CPU time per request
- 128MB memory

**Wanneer upgraden?**
- Bij > 3000 orders/dag → Paid plan ($5/month)

### Meta CAPI Rate Limits
- 200 requests/second per pixel
- Max 1000 events per request

**Best Practice:**
- Batch events (max 100 per request)
- Use rate limiting in Worker

### Lightspeed API Limits
- Rate limit: 2 requests/second
- Bucket size: 180 points

**Best Practice:**
- Cache order data
- Use webhooks ipv polling

## 🔐 Security Best Practices

1. **Secrets Management**
   - ✅ Use Cloudflare Secrets (not env vars)
   - ✅ Rotate tokens elke 90 dagen
   - ✅ Different credentials per environment

2. **Logging**
   - ✅ NOOIT PII loggen (emails, phones)
   - ✅ Only log hashed values
   - ✅ Use structured logging (JSON)

3. **Access Control**
   - ✅ Webhook signature verification
   - ✅ Rate limiting per IP
   - ✅ CORS configuration

## 📞 Support Resources

- **Cloudflare Workers**: https://discord.gg/cloudflaredev
- **Meta Developer**: https://developers.facebook.com/support/
- **Lightspeed**: https://www.lightspeedhq.com/support/

---

**Happy Deploying! 🚀**
