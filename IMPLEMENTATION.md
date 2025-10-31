# Technical Implementation Guide - Lightspeed Meta CAPI

## 📋 Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Data Flow Diagram](#data-flow-diagram)
3. [Component Deep-Dive](#component-deep-dive)
4. [KV Storage Strategy](#kv-storage-strategy)
5. [Meta CAPI Integration](#meta-capi-integration)
6. [Event Deduplication Logic](#event-deduplication-logic)
7. [Troubleshooting Guide](#troubleshooting-guide)
8. [Performance Optimization](#performance-optimization)

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    BROWSER (Customer)                        │
│  ┌──────────────┐         ┌──────────────┐                 │
│  │ Meta Pixel   │         │ Thank-you    │                 │
│  │ (PageView +  │         │ Page Script  │                 │
│  │  Purchase)   │         │ (POST pixel  │                 │
│  └──────┬───────┘         │  data)       │                 │
│         │                 └──────┬───────┘                 │
└─────────┼────────────────────────┼─────────────────────────┘
          │                        │
          ▼                        ▼
    ┌─────────────┐        ┌──────────────────┐
    │  Meta Pixel │        │ Cloudflare Worker│
    │   Endpoint  │        │   /pixel-data    │
    └─────────────┘        └────────┬─────────┘
                                    │
                                    ▼
                            ┌────────────────┐
                            │ KV Storage     │
                            │ (1 hour TTL)   │
                            └────────┬───────┘
                                    │
┌───────────────────────────────────┼─────────────────┐
│              LIGHTSPEED           │                  │
│  ┌──────────────┐                │                  │
│  │ Webhook      │────────────────┘                  │
│  │ (order.      │                                    │
│  │  created)    │                                    │
│  └──────┬───────┘                                    │
└─────────┼──────────────────────────────────────────┘
          │
          ▼
  ┌───────────────────┐
  │ Cloudflare Worker │
  │   /webhook        │
  └────────┬──────────┘
           │
           ├─→ 1. Lookup KV (pixel data)
           ├─→ 2. Merge order + pixel data
           ├─→ 3. Hash PII (SHA-256)
           │
           ▼
   ┌─────────────────┐
   │  Meta CAPI      │
   │  /events        │
   └─────────────────┘
```

### Key Design Decisions

1. **Why KV Storage?**
   - Browser and webhook are asynchronous
   - Need temporary storage to bridge the gap
   - 1 hour TTL sufficient (webhooks arrive within minutes)
   - Low cost, high performance

2. **Why Two Endpoints?**
   - `/pixel-data`: Browser can POST immediately after order
   - `/webhook`: Lightspeed fires later (1-5 minutes)
   - Separation allows independent failure handling

3. **Why Multi-Tenant?**
   - Single deployment for all shops
   - Easier maintenance
   - Shared infrastructure cost
   - Isolated data per shop

---

## Data Flow Diagram

### Happy Path (Complete Flow)

```
TIME: T=0 seconds
Customer completes purchase on thank-you page
↓
┌────────────────────────────────────────────┐
│ BROWSER EXECUTES                            │
│                                             │
│ 1. Meta Pixel fires:                        │
│    fbq('track', 'Purchase', {...}, {        │
│      eventID: 'purchase_RTR16873'           │
│    });                                      │
│                                             │
│ 2. Extract cookies:                         │
│    _fbc = document.cookie.match(/_fbc/)     │
│    _fbp = document.cookie.match(/_fbp/)     │
│                                             │
│ 3. POST to Worker:                          │
│    fetch('/pixel-data?shop=retoertje', {    │
│      method: 'POST',                        │
│      body: JSON.stringify({                 │
│        order_id: 'RTR16873',                │
│        fbc: 'fb.1.1752832754445.IwY2...',   │
│        fbp: 'fb.1.1752832686956.559349...'  │
│      })                                     │
│    });                                      │
└────────────────────────────────────────────┘
↓
TIME: T=1 second
Worker receives pixel data POST
↓
┌────────────────────────────────────────────┐
│ WORKER /pixel-data HANDLER                  │
│                                             │
│ 1. Resolve shop: 'retoertje'                │
│                                             │
│ 2. Build KV key:                            │
│    key = 'pixel_data_retoertje_RTR16873'    │
│                                             │
│ 3. Store in KV:                             │
│    KV.put(key, {                            │
│      fbc, fbp, client_ip_address,           │
│      client_user_agent, timestamp           │
│    }, { expirationTtl: 3600 })              │
│                                             │
│ 4. Return success to browser                │
└────────────────────────────────────────────┘
↓
TIME: T=120 seconds (2 minutes later)
Lightspeed fires webhook
↓
┌────────────────────────────────────────────┐
│ LIGHTSPEED WEBHOOK                          │
│                                             │
│ POST /webhook?shop=retoertje                │
│ {                                           │
│   "order": {                                │
│     "number": "RTR16873",                   │
│     "priceIncl": 51.14,                     │
│     "currency": "EUR",                      │
│     "customer": {                           │
│       "email": "customer@example.com"       │
│     }                                       │
│   }                                         │
│ }                                           │
└────────────────────────────────────────────┘
↓
┌────────────────────────────────────────────┐
│ WORKER /webhook HANDLER                     │
│                                             │
│ 1. Resolve shop: 'retoertje'                │
│ 2. Get shop config (credentials)            │
│                                             │
│ 3. Check deduplication:                     │
│    dedupKey = 'order_retoertje_RTR16873'    │
│    if (KV.get(dedupKey)) {                  │
│      return 'already processed';            │
│    }                                        │
│                                             │
│ 4. Lookup pixel data:                       │
│    pixelKey = 'pixel_data_retoertje_...'    │
│    pixelData = KV.get(pixelKey)             │
│    // ✅ Found: fbc, fbp, IP, user-agent    │
│                                             │
│ 5. Build Meta event:                        │
│    event = {                                │
│      event_name: 'Purchase',                │
│      event_id: 'purchase_RTR16873',         │
│      event_time: order.createdAt,           │
│      user_data: {                           │
│        em: [SHA256(email)],                 │
│        fbc: pixelData.fbc,  // ← From KV!   │
│        fbp: pixelData.fbp,  // ← From KV!   │
│        client_ip_address: pixelData.ip,     │
│        client_user_agent: pixelData.ua,     │
│        external_id: 'RTR16873'              │
│      },                                     │
│      custom_data: {                         │
│        currency: 'EUR',                     │
│        value: 51.14                         │
│      }                                      │
│    }                                        │
│                                             │
│ 6. POST to Meta CAPI:                       │
│    POST /v18.0/1286370709492511/events      │
│                                             │
│ 7. Mark as processed (deduplication):       │
│    KV.put(dedupKey, {...}, {ttl: 86400})    │
│                                             │
│ 8. Return success                           │
└────────────────────────────────────────────┘
↓
TIME: T=122 seconds
Meta receives complete event with fbc+fbp
↓
┌────────────────────────────────────────────┐
│ META DEDUPLICATION ENGINE                   │
│                                             │
│ Compares:                                   │
│ - Pixel event (T=0): eventID=purchase_..    │
│ - CAPI event (T=122): event_id=purchase_..  │
│                                             │
│ Match keys:                                 │
│ ✅ event_name: "Purchase" = "Purchase"      │
│ ✅ event_id: match                          │
│ ✅ fbp: match (same browser)                │
│ ✅ external_id: "RTR16873"                  │
│                                             │
│ Decision: DEDUPLICATED                      │
│ Count as: 1 conversion (not 2)              │
│                                             │
│ Event Match Quality: 8/10 ✅                │
│ (All 6 parameters present)                  │
└────────────────────────────────────────────┘
```

---

## Component Deep-Dive

### 1. Shop Resolver (`src/utils/shop-resolver.js`)

**Purpose**: Extract shop identifier from request

**Code**:
```javascript
export function resolveShopFromRequest(request) {
  const url = new URL(request.url);

  // Try URL parameter first
  const shopParam = url.searchParams.get('shop');
  if (shopParam) {
    return shopParam.toLowerCase().trim();
  }

  // Fallback to header
  const shopHeader = request.headers.get('x-shop-id');
  if (shopHeader) {
    return shopHeader.toLowerCase().trim();
  }

  return null;
}
```

**Critical Note**: Returns URL parameter string ('vikginchoice', 'retoertje'), NOT Lightspeed store number!

### 2. Shop Config (`src/config/shops.js`)

**Purpose**: Map shop identifiers to credentials

**Structure**:
```javascript
export function getShopConfig(shopId, env) {
  const shops = {
    vikginchoice: {
      id: 'vikginchoice',  // ⚠️ MUST MATCH shopId parameter!
      name: 'VikGinChoice',
      domain: 'vikginchoice.nl',
      lightspeed: {
        apiKey: env.VIKGINCHOICE_LIGHTSPEED_API_KEY,
        apiSecret: env.VIKGINCHOICE_LIGHTSPEED_API_SECRET,
        shopId: env.VIKGINCHOICE_LIGHTSPEED_SHOP_ID,  // Store number
        clusterUrl: 'https://api.webshopapp.com',
        language: 'nl'
      },
      meta: {
        accessToken: env.VIKGINCHOICE_META_ACCESS_TOKEN,
        pixelId: env.VIKGINCHOICE_META_PIXEL_ID,
        apiVersion: 'v18.0',
        testMode: false
      }
    },
    retoertje: {
      // Same structure
    }
  };

  const config = shops[shopId?.toLowerCase()];
  if (!config) {
    throw new Error(`Unknown shop: ${shopId}`);
  }

  // Validate required credentials
  const missing = [];
  if (!config.lightspeed.apiKey) missing.push('LIGHTSPEED_API_KEY');
  // ... more validation

  if (missing.length > 0) {
    throw new Error(`Missing credentials for ${shopId}: ${missing.join(', ')}`);
  }

  return config;
}
```

**Why `id` property is critical**:
```javascript
// In webhook.js
const kvKey = `pixel_data_${shopConfig.id}_${payload.number}`;
//                            ^^^^^^^^^^^^^^^^
//                            Must match what pixel-data.js used!

// In pixel-data.js
const kvKey = `pixel_data_${shopId}_${pixelData.order_id}`;
//                          ^^^^^^^^
//                          From resolveShopFromRequest()
```

If `shopConfig.id` doesn't exist or doesn't match `shopId`, KV lookup fails!

### 3. Pixel Data Handler (`src/handlers/pixel-data.js`)

**Purpose**: Store browser cookie data (fbc, fbp) for later merge

**Key Logic**:
```javascript
export async function handlePixelData(request, env) {
  // 1. Resolve shop
  const shopId = resolveShopFromRequest(request);

  // 2. Parse payload
  const pixelData = await request.json();
  // Expected: {order_id, fbc, fbp, client_user_agent, event_source_url}

  // 3. Validate
  if (!pixelData.order_id) {
    return jsonResponse({error: 'Missing order_id'}, 400);
  }

  // 4. Extract IP from Cloudflare headers
  const clientIp = request.headers.get('CF-Connecting-IP') ||
                   request.headers.get('X-Forwarded-For') ||
                   null;

  // 5. Build complete data object
  const completePixelData = {
    fbc: pixelData.fbc || null,
    fbp: pixelData.fbp || null,
    client_user_agent: pixelData.client_user_agent ||
                       request.headers.get('User-Agent') ||
                       null,
    client_ip_address: clientIp,
    event_source_url: pixelData.event_source_url || null,
    timestamp: new Date().toISOString()
  };

  // 6. Store in KV with 1 hour TTL
  const kvKey = `pixel_data_${shopId}_${pixelData.order_id}`;
  //                          ^^^^^^^^   ^^^^^^^^^^^^^^^^^^^
  //                          URL param  Order number from browser

  await env.PIXEL_DATA_KV.put(
    kvKey,
    JSON.stringify(completePixelData),
    { expirationTtl: 3600 }  // 1 hour
  );

  return jsonResponse({success: true, orderId: pixelData.order_id}, 200);
}
```

**TTL Strategy**: 1 hour is sufficient because:
- Lightspeed webhooks typically arrive within 1-5 minutes
- Hourly cron serves as backup
- Longer TTL = unnecessary KV storage cost

### 4. Webhook Handler (`src/handlers/webhook.js`)

**Purpose**: Merge order data with pixel data and send to Meta CAPI

**Key Logic**:
```javascript
export async function handleWebhook(request, env) {
  // 1. Resolve shop and get config
  const shopId = resolveShopFromRequest(request);
  const shopConfig = getShopConfig(shopId, env);

  // 2. Parse webhook payload
  const rawPayload = await request.json();
  const payload = rawPayload.order || rawPayload;

  // 3. Check deduplication FIRST (before doing any work)
  const dedupKey = `order_${shopConfig.id}_${payload.number}`;
  if (env.ORDER_DEDUP) {
    const alreadySent = await env.ORDER_DEDUP.get(dedupKey);
    if (alreadySent) {
      console.log(`Order ${payload.number} already sent, skipping`);
      return jsonResponse({
        success: true,
        duplicate: true,
        message: 'Order already processed'
      }, 200);
    }
  }

  // 4. Lookup pixel data from KV
  let pixelData = {};
  if (payload.number && env.PIXEL_DATA_KV) {
    const kvKey = `pixel_data_${shopConfig.id}_${payload.number}`;
    //                          ^^^^^^^^^^^^^^^^
    //                          Uses shopConfig.id (must match pixel-data.js!)

    const storedPixelData = await env.PIXEL_DATA_KV.get(kvKey);

    if (storedPixelData) {
      try {
        pixelData = JSON.parse(storedPixelData);
        console.log(`Retrieved pixel data from KV for order ${payload.number}:`, {
          fbc: pixelData.fbc ? 'present' : 'missing',
          fbp: pixelData.fbp ? 'present' : 'missing',
          client_ip_address: pixelData.client_ip_address ? 'present' : 'missing'
        });
      } catch (e) {
        console.warn('Failed to parse pixel data from KV:', e);
      }
    } else {
      console.log(`No pixel data found in KV for order ${payload.number}`);
    }
  }

  // 5. Fallback: extract from webhook payload if available (legacy)
  if (!pixelData.fbc && rawPayload.fbc) pixelData.fbc = rawPayload.fbc;
  if (!pixelData.fbp && rawPayload.fbp) pixelData.fbp = rawPayload.fbp;

  // 6. Send to Meta CAPI
  try {
    const result = await sendPurchaseEvent(payload, shopConfig, pixelData);

    // 7. Mark as processed (24h TTL for deduplication)
    if (env.ORDER_DEDUP) {
      await env.ORDER_DEDUP.put(dedupKey, JSON.stringify({
        timestamp: new Date().toISOString(),
        orderId: payload.number,
        shop: shopConfig.name
      }), { expirationTtl: 86400 });
    }

    return jsonResponse({
      success: true,
      shop: shopConfig.name,
      orderId: payload.number,
      eventId: `purchase_${payload.number}`,
      metaResponse: result
    }, 200);
  } catch (error) {
    console.error('Meta CAPI Error:', error);
    return jsonResponse({
      error: 'Failed to send event to Meta',
      message: error.message
    }, 500);
  }
}
```

### 5. Meta CAPI Service (`src/services/meta-capi.js`)

**Purpose**: Build and send events to Meta

**Key Logic**:
```javascript
export async function sendPurchaseEvent(orderData, shopConfig, pixelData = {}) {
  const { meta } = shopConfig;

  // CRITICAL: Use order creation time, not current time!
  // This ensures deduplication works (Pixel event_time ≈ CAPI event_time)
  const orderCreatedAt = orderData.createdAt || orderData.created_at || orderData.updatedAt;
  const eventTime = orderCreatedAt
    ? Math.floor(new Date(orderCreatedAt).getTime() / 1000)
    : Math.floor(Date.now() / 1000);

  const event = {
    event_name: 'Purchase',
    event_time: eventTime,
    event_id: `purchase_${orderData.number}`,  // MUST match Pixel eventID!
    event_source_url: pixelData.event_source_url ||
                      `https://${shopConfig.domain}/checkout/thankyou`,
    action_source: 'website',
    user_data: await buildUserData(orderData, pixelData),
    custom_data: buildCustomData(orderData)
  };

  const url = `https://graph.facebook.com/${meta.apiVersion}/${meta.pixelId}/events`;
  const payload = {
    data: [event],
    access_token: meta.accessToken
  };

  // Test mode support
  if (meta.testMode && meta.testEventCode) {
    payload.test_event_code = meta.testEventCode;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const result = await response.json();

  if (!response.ok) {
    console.error('Meta CAPI Error:', result);
    throw new Error(`Meta CAPI failed: ${result.error?.message || response.statusText}`);
  }

  console.log('Meta CAPI Success:', {
    shop: shopConfig.name,
    orderId: orderData.number,
    eventId: event.event_id,
    eventsReceived: result.events_received,
    fbtrace_id: result.fbtrace_id
  });

  return result;
}

async function buildUserData(orderData, pixelData = {}) {
  const rawUserData = {
    email: orderData.customer?.email,
    phone: orderData.customer?.phone || orderData.customer?.mobile,
    firstname: orderData.customer?.firstname,
    lastname: orderData.customer?.lastname,
    city: orderData.customer?.city,
    state: orderData.customer?.state,
    zipcode: orderData.customer?.zipcode,
    country: orderData.customer?.country || 'nl'
  };

  // Hash PII fields
  const hashedData = await hashUserData(rawUserData);

  // Add UNHASHED parameters (Meta needs exact values!)
  if (pixelData.fbc) hashedData.fbc = pixelData.fbc;  // +56.59% EMQ
  if (pixelData.fbp) hashedData.fbp = pixelData.fbp;  // +2.06% EMQ
  if (pixelData.client_ip_address) hashedData.client_ip_address = pixelData.client_ip_address;  // +23.46%
  if (pixelData.client_user_agent) hashedData.client_user_agent = pixelData.client_user_agent;  // +23.46%
  if (orderData.number) hashedData.external_id = String(orderData.number);  // +2.06%

  return hashedData;
}
```

**Critical Notes**:
1. `fbc`, `fbp`, `client_ip_address`, `client_user_agent` are **NOT hashed**
2. `event_id` must **exactly match** Pixel's `eventID`
3. `event_time` should be order creation time, not webhook processing time

---

## KV Storage Strategy

### Namespace: PIXEL_DATA_KV
- **ID**: `12eed91ee98246308b01517ba9bd677f`
- **Purpose**: Store browser pixel data temporarily
- **TTL**: 1 hour (3600 seconds)

### Key Format:
```
pixel_data_{shopId}_{orderId}

Examples:
- pixel_data_retoertje_RTR16873
- pixel_data_vikginchoice_VKNG187418
```

### Value Format (JSON):
```json
{
  "fbc": "fb.1.1752832754445.IwY2xjawLm-kJ...",
  "fbp": "fb.1.1752832686956.559349522818458445",
  "client_user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
  "client_ip_address": "2a02:a45a:f585:0:b6d5:5ac0:2a90:99d4",
  "event_source_url": "https://www.retoertje.nl/checkout/thankyou/",
  "timestamp": "2025-10-28T17:12:36.357Z"
}
```

### Namespace: ORDER_DEDUP
- **ID**: `c261da492df0431d8ca4e74e71cb046e`
- **Purpose**: Prevent duplicate webhook processing
- **TTL**: 24 hours (86400 seconds)

### Key Format:
```
order_{shopId}_{orderId}

Examples:
- order_retoertje_RTR16873
- order_vikginchoice_VKNG187418
```

### Value Format (JSON):
```json
{
  "timestamp": "2025-10-28T17:14:22.123Z",
  "orderId": "RTR16873",
  "shop": "Retoertje"
}
```

---

## Meta CAPI Integration

### Endpoint Structure
```
POST https://graph.facebook.com/{api_version}/{pixel_id}/events

Headers:
- Content-Type: application/json

Body:
{
  "data": [
    {
      "event_name": "Purchase",
      "event_time": 1761672500,
      "event_id": "purchase_RTR16873",
      "event_source_url": "https://www.retoertje.nl/checkout/thankyou/",
      "action_source": "website",
      "user_data": {
        "em": ["7b17fb0bd173f625b58636fb796407c2..."],  // Hashed
        "ph": ["e5c1dbeb58f285d0c4bdb297805c7ee6..."],  // Hashed
        "fbc": "fb.1.1752832754445.IwY2xjawLm...",      // NOT hashed
        "fbp": "fb.1.1752832686956.5593495228...",      // NOT hashed
        "client_ip_address": "2a02:a45a:f585:0...",     // NOT hashed
        "client_user_agent": "Mozilla/5.0 ...",         // NOT hashed
        "external_id": "RTR16873"                       // NOT hashed
      },
      "custom_data": {
        "currency": "EUR",
        "value": 51.14,
        "content_ids": ["product_123"],
        "content_type": "product"
      }
    }
  ],
  "access_token": "EAAX0dbtssvMBPu...",
  "test_event_code": "TEST12345"  // Optional, for testing
}
```

### Response Format (Success)
```json
{
  "events_received": 1,
  "messages": [],
  "fbtrace_id": "AJ2iSWNaEQmW4iEov4EJFGY"
}
```

### Response Format (Error)
```json
{
  "error": {
    "message": "(#100) Invalid parameter",
    "type": "OAuthException",
    "code": 100,
    "fbtrace_id": "AXvfk15EiXjMVWvtP46h0yP"
  }
}
```

---

## Event Deduplication Logic

### Meta's Deduplication Algorithm

Meta uses **FOUR keys** to identify duplicate events:

1. **event_name** (e.g., "Purchase")
2. **event_id** (e.g., "purchase_RTR16873")
3. **_fbp** (Facebook Browser ID from user_data.fbp)
4. **external_id** (from user_data.external_id)

**Matching Logic**:
```python
# Pseudo-code for Meta's deduplication
def are_events_duplicate(pixel_event, capi_event):
    return (
        pixel_event.event_name == capi_event.event_name AND
        pixel_event.eventID == capi_event.event_id AND
        (pixel_event._fbp == capi_event.user_data.fbp OR
         pixel_event.external_id == capi_event.user_data.external_id)
    )
```

**Time Window**: Events must arrive within 48 hours of each other to be deduplicated.

### Our Implementation

**Pixel Side** (Thank-you page):
```javascript
// Generate unique event ID
var eventID = 'purchase_' + ORDER_ID;

// Fire pixel with eventID
fbq('track', 'Purchase', {
  value: 51.14,
  currency: 'EUR',
  content_ids: ['product_123']
}, {
  eventID: eventID  // 4th parameter!
});
```

**CAPI Side** (Worker):
```javascript
const event = {
  event_name: 'Purchase',          // Matches Pixel
  event_id: `purchase_${orderId}`, // Matches Pixel eventID
  user_data: {
    fbp: pixelData.fbp,            // Same as Pixel _fbp cookie
    external_id: orderId            // Order number
  }
};
```

**Result**: Meta recognizes these as the same event → counts as 1 conversion

---

## Troubleshooting Guide

### Debugging Commands

```bash
# 1. Check if pixel data was stored
export CLOUDFLARE_API_TOKEN="xxx"
export CLOUDFLARE_ACCOUNT_ID="xxx"

ORDER_ID="RTR16873"
npx wrangler kv key get --namespace-id=12eed91ee98246308b01517ba9bd677f --remote "pixel_data_retoertje_$ORDER_ID"

# 2. Check if order was processed
npx wrangler kv key get --namespace-id=c261da492df0431d8ca4e74e71cb046e --remote "order_retoertje_$ORDER_ID"

# 3. List all recent pixel data
npx wrangler kv key list --namespace-id=12eed91ee98246308b01517ba9bd677f --remote | grep "pixel_data_retoertje"

# 4. Watch live logs
npx wrangler tail lightspeed-meta-capi --format pretty

# 5. Test health
curl https://lightspeed-meta-capi.f-amekran.workers.dev/health

# 6. Manual webhook trigger
curl -X POST "https://lightspeed-meta-capi.f-amekran.workers.dev/webhook?shop=retoertje" \
  -H "Content-Type: application/json" \
  -d '{"order": {"number": "RTR16873", "priceIncl": 51.14, "currency": "EUR"}}'
```

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `Missing shop parameter` | No `?shop=` in URL | Add `?shop=retoertje` or `?shop=vikginchoice` |
| `Unknown shop: xxx` | Shop not in config | Add shop to `src/config/shops.js` |
| `Missing credentials for shop` | Env vars not set | Check `npx wrangler secret list` |
| `No pixel data found in KV` | Browser didn't POST or KV key mismatch | Check `shopConfig.id` matches URL param |
| `Order already processed` | Duplicate webhook | This is normal, deduplication working |
| `Meta CAPI failed: (#100)` | Invalid token or pixel ID | Test token with curl |
| `error code: 1001` | Cloudflare/network issue | Retry, check Worker status |

### Diagnostic Checklist

When an order doesn't have fbc/fbp in Meta:

- [ ] Check browser POST succeeded: `/pixel-data` returned `{success: true}`
- [ ] Verify KV storage: `npx wrangler kv key get...` shows data
- [ ] Check shop config has `id` property matching URL parameter
- [ ] Verify webhook arrived: check Worker logs or dedup KV
- [ ] Confirm KV lookup log: "Retrieved pixel data from KV for order XXX"
- [ ] Check Meta Events Manager: fbc and fbp in Sleutels van gebruikersgegevens

---

## Performance Optimization

### Current Performance

- **Pixel data write**: ~50-100ms (KV write + response)
- **Webhook processing**: ~200-500ms (KV read + Meta CAPI POST)
- **KV read latency**: ~10-50ms (global distribution)
- **Meta CAPI latency**: ~100-300ms (depends on region)

### Optimization Opportunities

1. **Batch Meta CAPI Requests** (Future)
   - Current: 1 event per webhook
   - Optimized: Buffer events, send in batches of 1000
   - Benefit: Lower Meta CAPI overhead

2. **Use Durable Objects for Hot Data** (Future)
   - Current: KV for all temporary storage
   - Optimized: Durable Objects for frequently accessed orders
   - Benefit: Lower latency, stronger consistency

3. **Implement Retry Logic** (Planned)
   - Current: Single attempt to Meta CAPI
   - Optimized: Exponential backoff retry (3 attempts)
   - Benefit: Better reliability during Meta API issues

4. **Cache Shop Configs** (Future)
   - Current: Rebuild config on every request
   - Optimized: Cache in Worker global scope
   - Benefit: Slightly faster request processing

### Monitoring Metrics to Track

- **KV write success rate**: Should be >99.9%
- **KV read hit rate**: Percentage of webhooks that find pixel data
- **Meta CAPI success rate**: Should be >99%
- **Event deduplication rate**: Should be 70-80% (overlap between Pixel + CAPI)
- **Average webhook processing time**: Target <500ms

---

**Last Updated**: 28 October 2025
**Version**: 2.0.0
