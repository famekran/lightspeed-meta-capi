# Archive Folder

**Purpose**: Historical files that are no longer actively used in production but preserved for reference.

**Date Archived**: 2025-10-31

---

## 📚 Archived Documentation

### DEPLOYMENT.md
- **Archived**: Content duplicated in main README.md
- **Reason**: Consolidated deployment instructions into single source of truth

### PLANNING-SUMMARY.md
- **Archived**: Historical planning document from initial development phase
- **Reason**: Project is now in production; planning phase complete

### PIXEL-ANALYSIS.md
- **Archived**: Pixel implementation analysis
- **Reason**: Key information moved to IMPLEMENTATION.md

### CHECK_GA4_PURCHASE_TRACKING.md
- **Archived**: One-time GA4 verification guide
- **Reason**: GA4 integration now complete and verified in production

---

## 🔧 Archived Scripts

### deploy-with-secrets.sh
- **Archived**: Alternative deployment script
- **Reason**: Superseded by `deploy.sh` (in root)
- **Use**: Credentials now in wrangler.toml

### setup-secrets.sh
- **Archived**: Old secrets setup method
- **Reason**: Credentials moved to wrangler.toml [vars]
- **Future**: Should migrate to Cloudflare Secrets API

### setup-webhooks.sh
- **Archived**: Old webhook setup script
- **Reason**: Superseded by `register-webhooks.sh` (in root)
- **Difference**: New script has better error handling

### test-both-webhooks.sh
- **Archived**: Combined test for both shops
- **Reason**: Superseded by individual shop tests
- **Use instead**: `test-vikginchoice.sh` and `test-meta-direct.sh`

### test-fix.sh
- **Archived**: Debug script from development
- **Reason**: One-off debugging; not part of standard workflow

### test-ga4.sh
- **Archived**: GA4-specific test script
- **Reason**: GA4 testing now integrated into main test scripts
- **Note**: Can still be useful for isolated GA4 debugging

### test-webhook.sh
- **Archived**: Generic webhook test
- **Reason**: Superseded by shop-specific tests with better data

---

## 🔄 Active Scripts (Not in Archive)

Located in project root:
- ✅ `deploy.sh` - Main deployment script
- ✅ `register-webhooks.sh` - Webhook registration for both shops
- ✅ `test-vikginchoice.sh` - Test VikGinChoice integration
- ✅ `test-meta-direct.sh` - Test Retoertje integration
- ✅ `verify-rtr16873.sh` - Verify specific order by ID

---

## 📖 Active Documentation (Not in Archive)

Located in project root:
- ✅ `CLAUDE.md` - AI assistant instructions
- ✅ `README.md` - Main user guide
- ✅ `IMPLEMENTATION.md` - Technical deep-dive
- ✅ `ARCHITECTURE-OVERVIEW.md` - System architecture
- ✅ `PRODUCTION-SNAPSHOT.md` - Current deployment snapshot
- ✅ `CLOUDFLARE-SETUP-EXPLAINED.md` - Cloudflare resources explanation
- ✅ `GA4_REFERENCE.md` - GA4 credentials
- ✅ `FINAL-INSTALL-SCRIPTS.md` - Production installation
- ✅ `LIGHTSPEED_VARIABLES.md` - Template variables
- ✅ `TEST-RESULTS.md` - Latest test results

---

## 🗑️ When to Delete Archive

This archive can be safely deleted if:
1. Production has been stable for 3+ months
2. No need to reference old planning/implementation decisions
3. Git history provides sufficient historical context

**Recommendation**: Keep for 6 months, then delete if not needed

---

**Archived**: 2025-10-31
**Archived By**: Claude Code
**Status**: Reference only - not used in production
