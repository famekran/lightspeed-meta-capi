# Meta Pixel Analysis - VikGinChoice & Retoertje
## Current Implementation Reference

**Date**: 2025-10-15
**Purpose**: Reference for CAPI implementation to match existing Pixel setup

---

## 🔍 Pixel IDs Found

### VikGinChoice
- **Pixel ID**: `2954295684696042`
- **Domain**: vikginchoice.nl

### Retoertje
- **Pixel ID**: `1286370709492511`
- **Domain**: retoertje.nl

---

## 📊 Current Event Tracking

### Both Shops Track:
1. **PageView** - All pages except thank-you
2. **ViewContent** - Product Detail Pages (once per session)
3. **AddToCart** - Add to cart clicks/submits
4. **InitiateCheckout** - Checkout start (once per session)
5. **Purchase** - Thank you page only (with deduplication guard)

---

## 🎯 Purchase Event Structure (Critical for CAPI)

### VikGinChoice Thank You Page:

```javascript
fbq('track','Purchase', {
  content_ids: CONTENT_IDS,        // Array of variant IDs
  content_type: 'product',
  contents: CONTENTS,              // Array of {id, quantity, item_price}
  currency: CURRENCY,              // 3-letter ISO (e.g., "EUR")
  value: VALUE,                    // Total price incl
  order_id: ORDER_ID               // Lightspeed order number
}, {
  eventID: "purchase_" + ORDER_ID  // ← CRITICAL: Must match in CAPI!
});
```

### Retoertje Thank You Page:

```javascript
fbq('track','Purchase', {
  content_ids: CONTENT_IDS,
  content_type: 'product',
  contents: CONTENTS,
  currency: CURRENCY,
  value: VALUE,
  order_id: ORDER_ID
}, {
  eventID: "purchase_" + ORDER_ID  // ← CRITICAL: Must match in CAPI!
});
```

**Both shops use identical structure!**

---

## 🔑 Event ID Pattern (Deduplication Key)

### Format:
```
eventID = "purchase_" + ORDER_ID
```

### Examples:
- Order #12345 → `eventID: "purchase_12345"`
- Order #67890 → `eventID: "purchase_67890"`

**CAPI Implementation MUST use this exact same pattern!**

---

## 📋 Data Mapping (Lightspeed → Meta)

### From Lightspeed Template Variables:

```javascript
// Order metadata
ORDER_ID  = "{{ order.information.number }}"           // e.g., "12345"
CURRENCY  = "{{ order.information.currency }}"         // e.g., "EUR"
VALUE     = "{{ order.information.price_incl }}"       // e.g., "99.95"

// Product arrays
{% for product in order.products %}
  variant_id:    "{{ product.variant_id }}"           // Product variant ID
  quantity:      {{ product.quantity }}               // Quantity ordered
  item_price:    "{{ product.base_price_incl }}"      // Price per item (incl VAT)
{% endfor %}
```

### Converted to Meta Format:

```javascript
{
  content_ids: ["variant_123", "variant_456"],        // All variant IDs
  content_type: "product",
  contents: [
    { id: "variant_123", quantity: 2, item_price: 29.95 },
    { id: "variant_456", quantity: 1, item_price: 39.95 }
  ],
  currency: "EUR",
  value: 99.85,                                       // Total order value
  order_id: "12345"
}
```

---

## 🛡️ Deduplication Guard (Both Shops)

### LocalStorage Guard:
```javascript
var GUARD_KEY = "fb_purchase_fired_" + ORDER_ID;
if (localStorage.getItem(GUARD_KEY)) return;  // Stop if already fired

// ... fire event ...

localStorage.setItem(GUARD_KEY, "1");  // Mark as fired
```

**Purpose**: Prevent duplicate events if user refreshes thank-you page

**CAPI Note**: This only protects Pixel side. CAPI needs its own guard (Lightspeed webhook fires once anyway).

---

## 💰 Price Parsing Logic

### Both shops use this helper:
```javascript
function toNumber(raw){
  // Handles: "€ 1.299,95", "1,299.95", "€1299.95", etc.
  var s = (raw==null?'':String(raw)).replace(/[^\d,.\-]/g,'').trim();
  if (!s) return 0;

  var lastDot = s.lastIndexOf('.'), lastCom = s.lastIndexOf(',');

  // Determine decimal separator
  if (lastCom > -1 && lastDot > -1){
    if (lastCom > lastDot){  // "1.299,95" → comma is decimal
      s = s.replace(/\./g,'').replace(',', '.');
    } else {  // "1,299.95" → dot is decimal
      s = s.replace(/,/g,'');
    }
  } else if (lastCom > -1){  // Only comma → assume decimal
    s = s.replace(/\./g,'').replace(',', '.');
  } else {  // Only dot or nothing → keep as-is
    s = s.replace(/,/g,'');
  }

  var n = Number(s);
  return isFinite(n) ? n : 0;
}
```

**Result**: Always returns clean float (e.g., `1299.95`)

---

## 🚀 CAPI Implementation Requirements

### Must Match:

1. **Event ID Format**:
   ```javascript
   eventID: "purchase_" + order.information.number
   ```

2. **Currency**:
   - 3-letter ISO code (e.g., "EUR", "USD")
   - Uppercase
   - From Lightspeed: `order.information.currency`

3. **Value**:
   - Total order value including VAT
   - Clean float (no currency symbols)
   - From Lightspeed: `order.information.price_incl`

4. **Content IDs**:
   - Array of variant IDs
   - From Lightspeed: `product.variant_id` for each product

5. **Contents**:
   - Array of objects with `id`, `quantity`, `item_price`
   - `item_price` must be clean float (use toNumber logic)

---

## 📝 CAPI Event Payload Structure

### Meta CAPI POST to:
```
https://graph.facebook.com/v18.0/{PIXEL_ID}/events
```

### Headers:
```
Content-Type: application/json
```

### Body Example (for VikGinChoice):
```json
{
  "data": [
    {
      "event_name": "Purchase",
      "event_time": 1729012345,
      "event_id": "purchase_12345",
      "event_source_url": "https://www.vikginchoice.nl/checkout/thankyou",
      "action_source": "website",
      "user_data": {
        "em": ["7d5d..."],  // SHA-256 of email
        "ph": ["3f8a..."],  // SHA-256 of phone
        "country": ["nl"]
      },
      "custom_data": {
        "content_ids": ["variant_123", "variant_456"],
        "content_type": "product",
        "contents": [
          { "id": "variant_123", "quantity": 2, "item_price": 29.95 },
          { "id": "variant_456", "quantity": 1, "item_price": 39.95 }
        ],
        "currency": "EUR",
        "value": 99.85,
        "order_id": "12345"
      }
    }
  ],
  "access_token": "YOUR_ACCESS_TOKEN"
}
```

---

## 🔐 User Data for CAPI (Not in Pixel)

### Available from Lightspeed Webhook:
```javascript
// Customer data (must be SHA-256 hashed!)
email:      order.customer.email
phone:      order.customer.phone
first_name: order.customer.firstname
last_name:  order.customer.lastname
city:       order.addressBilling.city
zip:        order.addressBilling.zipcode
country:    order.addressBilling.country.code  // ISO 2-letter
```

### Hash Before Sending:
```javascript
// CAPI requires SHA-256 hashed + lowercase
user_data: {
  em: [sha256(email.toLowerCase().trim())],
  ph: [sha256(phone.replace(/\D/g, ''))],  // digits only
  fn: [sha256(firstName.toLowerCase().trim())],
  ln: [sha256(lastName.toLowerCase().trim())],
  ct: [sha256(city.toLowerCase().trim())],
  zp: [sha256(zip.toLowerCase().trim())],
  country: [countryCode.toLowerCase()]  // NOT hashed
}
```

---

## ✅ Validation Checklist

### Before Going Live:

**Pixel Side (Already Working):**
- [x] PageView tracked
- [x] ViewContent tracked (PDP)
- [x] AddToCart tracked
- [x] InitiateCheckout tracked
- [x] Purchase tracked on thank-you
- [x] Event ID included in Purchase
- [x] LocalStorage guard prevents duplicates

**CAPI Side (To Implement):**
- [ ] Worker receives Lightspeed webhook
- [ ] Correct shop detected from `?shop=` parameter
- [ ] Order data parsed correctly
- [ ] Event ID matches Pixel: `"purchase_" + order_id`
- [ ] User data SHA-256 hashed
- [ ] Currency is 3-letter ISO uppercase
- [ ] Value is clean float
- [ ] Content IDs array populated
- [ ] Contents array with id/quantity/item_price
- [ ] Correct Pixel ID used per shop
- [ ] Event sent to Meta CAPI endpoint
- [ ] Response validated (200 OK)
- [ ] Test Events Tool shows matched events

---

## 🧪 Testing Strategy

### Phase 1: Test Events (VikGinChoice)
1. Set `META_TEST_MODE=true`
2. Create test order in Lightspeed
3. Webhook triggers Worker
4. Check Meta Test Events Tool
5. Verify event_id matches Pixel
6. Verify user data hashed correctly

### Phase 2: Test Events (Retoertje)
1. Repeat Phase 1 for Retoertje
2. Verify correct Pixel ID used

### Phase 3: Production
1. Disable test mode
2. Monitor Meta Events Manager
3. Check Match Quality Score (target: > 5.0)
4. Verify deduplicated events appear
5. Monitor Cloudflare Worker logs

---

## 📊 Expected Results

### In Meta Events Manager:

**Before CAPI (Pixel Only):**
- Event Source: Browser
- Match Quality: ~3-5
- Lost events: ~20-30% (ad blockers)

**After CAPI (Pixel + Server):**
- Event Source: Browser + Server
- Match Quality: 6-8 (better with hashed user data)
- Lost events: <5% (deduplication working)
- **Higher ROAS** due to better tracking

---

## 🔗 Shop-Specific Configuration

### VikGinChoice:
```javascript
{
  pixelId: "2954295684696042",
  domain: "vikginchoice.nl",
  eventIdPrefix: "purchase_",
  currency: "EUR"
}
```

### Retoertje:
```javascript
{
  pixelId: "1286370709492511",
  domain: "retoertje.nl",
  eventIdPrefix: "purchase_",
  currency: "EUR"
}
```

---

## 📝 Implementation Notes

1. **Event ID is Critical**: CAPI must use `"purchase_" + order_id` exactly
2. **Both shops use identical structure**: Single Worker code can handle both
3. **Shop detection via webhook**: Use `?shop=vikginchoice` or `?shop=retoertje`
4. **User data from webhook**: Not available in Pixel, only in server-side
5. **Deduplication**: Meta handles automatically if event_id matches
6. **Price parsing**: Use same `toNumber` logic or parse from Lightspeed API
7. **Guard not needed**: Lightspeed webhook fires once per order

---

## 🚨 Common Pitfalls to Avoid

1. ❌ Different event_id format → no deduplication
2. ❌ User data not hashed → rejected by Meta
3. ❌ Wrong Pixel ID → events go to wrong account
4. ❌ Currency not 3-letter ISO → validation error
5. ❌ Value as string with symbols → validation error
6. ❌ Missing user_data fields → low match quality
7. ❌ event_time not Unix timestamp → validation error

---

**Status**: ✅ Analysis Complete
**Next**: Get Access Tokens → Implement Worker → Test with Test Events Tool

