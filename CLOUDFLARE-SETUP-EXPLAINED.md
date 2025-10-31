# Cloudflare Setup Explained: Why 2 Projects?

**TL;DR**: You have **4 KV namespaces** (2 production + 2 preview), NOT 2 separate projects. This is normal and intentional.

---

## 🤔 What You're Seeing in Cloudflare Dashboard

When you look at your Cloudflare Workers KV dashboard, you see **4 KV namespaces**:

### Production Namespaces (KEEP - CRITICAL!)
1. **ORDER_DEDUP**
   - ID: `c261da492df0431d8ca4e71cb046e`
   - Used by: **Live production worker**
   - Contains: Real order deduplication data
   - Status: ✅ **ACTIVE - DO NOT DELETE**

2. **PIXEL_DATA_KV**
   - ID: `12eed91ee98246308b01517ba9bd677f`
   - Used by: **Live production worker**
   - Contains: Real customer pixel data (fbc, fbp, ga_client_id)
   - Status: ✅ **ACTIVE - DO NOT DELETE**

### Preview Namespaces (Optional - for local dev)
3. **ORDER_DEDUP (preview)**
   - ID: `b7e3dee45ea84127b70a7d563425f041`
   - Used by: **`wrangler dev` (local development)**
   - Contains: Test data from local development
   - Status: ⚪ Optional - can keep or delete

4. **PIXEL_DATA_KV (preview)**
   - ID: `95434db769cb4823a955d9d48db9173d`
   - Used by: **`wrangler dev` (local development)**
   - Contains: Test pixel data from local testing
   - Status: ⚪ Optional - can keep or delete

---

## 🎯 Why This Setup Exists

### The Problem Cloudflare Solves
When you run `wrangler dev` (local development), you don't want to:
- ❌ Mix test data with production data
- ❌ Accidentally delete production orders
- ❌ Send test events to real Meta pixels

### The Solution: Separate Namespaces
Cloudflare automatically uses **different KV namespaces** based on environment:

```javascript
// wrangler.toml
[[kv_namespaces]]
binding = "ORDER_DEDUP"
id = "c261da492..."              // ← Production (deployed worker)
preview_id = "b7e3dee4..."       // ← Preview (wrangler dev)
```

**When you run**:
- `wrangler deploy` → Uses production IDs (`id`)
- `wrangler dev` → Uses preview IDs (`preview_id`)

---

## 📊 What Each Environment Does

### Production Environment
```
URL: https://lightspeed-meta-capi.f-amekran.workers.dev

Uses:
- ORDER_DEDUP: c261da492df0431d8ca4e74e71cb046e
- PIXEL_DATA_KV: 12eed91ee98246308b01517ba9bd677f

Receives:
- Real webhooks from Lightspeed
- Real browser pixel data from customers
- Real orders → Real Meta CAPI events

Status: ✅ LIVE and processing real transactions
```

### Preview/Dev Environment
```
URL: http://localhost:8787 (when running wrangler dev)

Uses:
- ORDER_DEDUP: b7e3dee45ea84127b70a7d563425f041
- PIXEL_DATA_KV: 95434db769cb4823a955d9d48db9173d

Receives:
- Test webhooks (manual curl commands)
- Test pixel data (from test scripts)
- Test orders → Test Meta CAPI events

Status: ⚪ Only active when you run `npm run dev`
```

---

## 🧹 What Can You Delete?

### ✅ Safe to Delete (Preview/Dev Namespaces)
You can delete these **IF** you never plan to run `wrangler dev` locally:

1. ORDER_DEDUP (preview) - `b7e3dee45ea84127b70a7d563425f041`
2. PIXEL_DATA_KV (preview) - `95434db769cb4823a955d9d48db9173d`

**What happens if deleted?**
- Local development (`wrangler dev`) will fail
- Production worker continues working fine
- You can recreate them anytime with `wrangler dev` (auto-creates)

### ❌ NEVER Delete (Production Namespaces)
**DO NOT delete these** - they contain live production data:

1. ORDER_DEDUP - `c261da492df0431d8ca4e71cb046e`
   - Contains: Deduplication records for real orders
   - If deleted: Duplicate events will be sent to Meta!

2. PIXEL_DATA_KV - `12eed91ee98246308b01517ba9bd677f`
   - Contains: Live pixel data waiting for webhooks
   - If deleted: No fbc/fbp in events → Event Match Quality drops!

---

## 🔍 How to Verify Which is Which

### Method 1: Check Data Content
```bash
export CLOUDFLARE_API_TOKEN="sDlEOCgSrV_g3sP3wQYlwdiLFWT_4dBuYRW7BLuo"
export CLOUDFLARE_ACCOUNT_ID="2febeaec7b825dc19b659d7e783cf622"

# Production namespaces (should have real order data)
npx wrangler kv key list --namespace-id=c261da492df0431d8ca4e74e71cb046e --remote

# Preview namespaces (likely empty or test data)
npx wrangler kv key list --namespace-id=b7e3dee45ea84127b70a7d563425f041 --remote
```

### Method 2: Check wrangler.toml
```toml
[[kv_namespaces]]
binding = "ORDER_DEDUP"
id = "c261da492..."          # ← This is PRODUCTION
preview_id = "b7e3dee4..."   # ← This is PREVIEW/DEV
```

### Method 3: Check Last Access Time
In Cloudflare dashboard:
- **Production**: Last accessed recently (today/yesterday)
- **Preview**: Last accessed when you last ran `wrangler dev`

---

## 💡 Recommendation

### Option 1: Keep Preview Namespaces (Recommended)
**Why**:
- Useful for local development and testing
- No cost (KV is free for low usage)
- Prevents accidents (test data separate from production)

**Do this**:
- Nothing! Current setup is correct

### Option 2: Delete Preview Namespaces
**Why**:
- You never use `wrangler dev` locally
- Cleaner Cloudflare dashboard
- Slightly less complexity

**Do this**:
1. Verify no recent activity in preview namespaces
2. Delete from Cloudflare dashboard:
   - ORDER_DEDUP (preview) - `b7e3dee45ea84127b70a7d563425f041`
   - PIXEL_DATA_KV (preview) - `95434db769cb4823a955d9d48db9173d`
3. Remove `preview_id` lines from `wrangler.toml`

**After deletion**:
```toml
# wrangler.toml (simplified)
[[kv_namespaces]]
binding = "ORDER_DEDUP"
id = "c261da492df0431d8ca4e74e71cb046e"
# preview_id removed

[[kv_namespaces]]
binding = "PIXEL_DATA_KV"
id = "12eed91ee98246308b01517ba9bd677f"
# preview_id removed
```

---

## 🎯 Summary

**You don't have "2 projects" - you have 1 project with 2 environments:**

```
┌─────────────────────────────────────────────────┐
│         Single Cloudflare Worker Project        │
├─────────────────────────────────────────────────┤
│                                                  │
│  Production Environment (deployed)               │
│  - URL: lightspeed-meta-capi.f-amekran.workers.dev
│  - KV: Production IDs                            │
│  - Handles: Real orders                          │
│                                                  │
│  ─────────────────────────────────────────────  │
│                                                  │
│  Preview/Dev Environment (local only)            │
│  - URL: localhost:8787 (wrangler dev)            │
│  - KV: Preview IDs                               │
│  - Handles: Test orders                          │
│                                                  │
└─────────────────────────────────────────────────┘
```

**Decision**:
- **Keep both** if you develop/test locally → Recommended ✅
- **Delete preview** if you only deploy to production → Also fine ✅

**Critical**: NEVER delete production namespaces (the ones with `id`, not `preview_id`)!

---

**Created**: 2025-10-31
**Author**: Claude Code
**Status**: ✅ Explained
