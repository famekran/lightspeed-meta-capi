# Check GA4 Purchase Event Tracking in Lightspeed

## Problem
We moeten verifiëren of Lightspeed's Admin UI gtag.js configuratie automatisch purchase events stuurt naar GA4.

Zo niet, dan hebben we **geen deduplicatie** want er is geen browser event om mee te dedupliceren!

---

## Hoe Te Checken

### Methode 1: Browser Developer Tools

1. Ga naar Retoertje thank-you page na order
2. Open Chrome DevTools (F12)
3. Ga naar **Network** tab
4. Filter op: `collect` of `google-analytics.com`
5. Zoek naar request met deze parameters:
   ```
   en=purchase              ← Event name
   tid=G-NBZL3D7WK8        ← Tracking ID
   ti=RTR16873             ← Transaction ID
   tr=99.99                ← Transaction value
   ```

**Als je dit ZIET:** ✅ Lightspeed stuurt al purchase events
**Als je dit NIET ziet:** ❌ We moeten browser purchase event toevoegen aan ons script

---

### Methode 2: GA4 Realtime Report

1. Ga naar GA4: https://analytics.google.com/
2. Select Retoertje property (G-NBZL3D7WK8)
3. Klik **Realtime**
4. Plaats test order
5. Check binnen 1 minuut:
   - Zie je `purchase` event? ✅
   - Staat er "2 events" bij purchase? ✅ (browser + server deduplicated)
   - Staat er "1 event"? ⚠️ (Mogelijk geen browser event!)

---

### Methode 3: GA4 DebugView

1. Installeer [Google Analytics Debugger Chrome Extension](https://chrome.google.com/webstore/detail/google-analytics-debugger/jnkmfdileelhofjcijamephohjechhna)
2. Enable debugger
3. Plaats test order
4. Ga naar GA4 → **Configure** → **DebugView**
5. Zie je `purchase` event van browser? ✅

---

## Scenario's

### Scenario A: Lightspeed Stuurt AL Purchase Events ✅

**Wat gebeurt er:**
```
1. Browser gtag.js → purchase event (via Lightspeed config)
2. Ons script → POST pixel data naar Worker
3. Lightspeed webhook → Worker → Server-side purchase event
4. GA4 dedupliceert beide events → Telt als 1
```

**Action:** Niets doen, werkt perfect!

---

### Scenario B: Lightspeed Stuurt GEEN Purchase Events ❌

**Wat gebeurt er:**
```
1. Browser gtag.js → alleen PageView
2. Ons script → POST pixel data naar Worker
3. Lightspeed webhook → Worker → Server-side purchase event
4. GA4 ziet alleen server event → Geen deduplicatie nodig
```

**Probleem:** Als browser WEL werkt, maar ad blocker blokkeert, hebben we dubbeling!

**Solution:** We moeten browser purchase event toevoegen aan ons script:

```javascript
// In thank-you script, NA pixel data POST:
gtag('event', 'purchase', {
  transaction_id: ORDER_ID,
  value: {{order.total}},
  currency: 'EUR',
  tax: {{order.tax}},
  shipping: {{order.shipping}},
  items: [
    // Product array
  ]
});
```

---

## Recommendation

**JE MOET DIT CHECKEN VOORDAT JE LIVE GAAT!**

Als Lightspeed GEEN purchase events stuurt:
1. ❌ Deduplicatie werkt niet
2. ❌ Je telt mogelijk dubbel
3. ❌ Attribution is incorrect

**Test:**
1. Plaats test order op Retoertje
2. Check Network tab voor `en=purchase`
3. Als NIET aanwezig → update ons script met browser purchase event

---

## Updated Script (If Lightspeed Doesn't Track Purchase)

```javascript
<script>
  (function() {
    'use strict';
    const WORKER_URL = 'https://lightspeed-meta-capi.f-amekran.workers.dev/pixel-data?shop=retoertje';
    const ORDER_ID = '{{order.number}}';

    // Cookie extraction functions...

    // 1. Send pixel data to Worker (same as before)
    fetch(WORKER_URL, { /* ... */ });

    // 2. ALSO send browser purchase event (ONLY if Lightspeed doesn't!)
    gtag('event', 'purchase', {
      transaction_id: ORDER_ID,
      value: parseFloat('{{order.total}}'),
      currency: '{{order.currency}}',
      tax: parseFloat('{{order.tax}}' || '0'),
      shipping: parseFloat('{{order.shipping}}' || '0'),
      items: [
        {% for product in order.products %}
        {
          item_id: '{{product.sku}}',
          item_name: '{{product.title}}',
          price: parseFloat('{{product.price}}'),
          quantity: parseInt('{{product.quantity}}')
        }{% if not forloop.last %},{% endif %}
        {% endfor %}
      ]
    });
  })();
</script>
```

---

**Status:** ⏳ NEEDS VERIFICATION
**Priority:** 🔴 HIGH (affects deduplication!)
