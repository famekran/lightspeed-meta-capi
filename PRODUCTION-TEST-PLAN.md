# Production Test Plan - Real Order Testing
**Date**: 2025-10-31
**Purpose**: Verify production deployment with real order data
**Scope**: Webhook processing + Cron job backup

---

## 🎯 **Test Objectives**

1. Verify webhook processes real Lightspeed orders correctly
2. Confirm both Meta CAPI and GA4 receive events
3. Validate pixel data merging from KV storage
4. Test cron job backup mechanism
5. Verify deduplication prevents duplicate events
6. Confirm Event Match Quality parameters present

---

## 📋 **Test Plan Sequence**

### Phase 1: Preparation
- [ ] Load environment credentials
- [ ] Identify last real order from Lightspeed
- [ ] Check if pixel data exists in KV for that order
- [ ] Document baseline state

### Phase 2: Webhook Testing (Real Order)
- [ ] Fetch complete order data from Lightspeed API
- [ ] Send order to webhook endpoint
- [ ] Verify Meta CAPI response
- [ ] Verify GA4 response
- [ ] Check deduplication storage
- [ ] Validate all parameters sent correctly

### Phase 3: Verification
- [ ] Check Meta Events Manager for event
- [ ] Verify Event Match Quality parameters
- [ ] Check GA4 Realtime for event
- [ ] Validate transaction details match

### Phase 4: Cron Job Testing
- [ ] Manually trigger cron handler
- [ ] Verify it fetches recent orders
- [ ] Confirm deduplication prevents re-sending
- [ ] Test with order outside dedup window

### Phase 5: Edge Cases
- [ ] Test order without pixel data (backup flow)
- [ ] Test duplicate webhook (deduplication)
- [ ] Verify error handling

---

## 🔧 **Test Environment**

**Production Worker**: https://lightspeed-meta-capi.f-amekran.workers.dev
**Cloudflare Version**: 1ba5ded4-eae6-4083-b776-87c1d0c819e7
**Git Commit**: db9b23f

**KV Namespaces**:
- ORDER_DEDUP (Production): c261da492df0431d8ca4e74e71cb046e
- PIXEL_DATA_KV (Production): 12eed91ee98246308b01517ba9bd677f

**Shops**:
- VikGinChoice (Shop ID: 307649)
- Retoertje (Shop ID: 351609)

---

## 📝 **Test Cases**

### Test 1: Fetch Last Real Order
**Objective**: Get actual order data from Lightspeed

**Steps**:
1. Call Lightspeed API: `GET /orders.json?limit=1&sort=createdAt:desc`
2. Extract order details (number, email, products, etc.)
3. Record order information for testing

**Expected Result**:
- Valid order returned
- Order has customer data
- Order has products
- Order is paid/complete

**Success Criteria**:
- ✅ Order data retrieved successfully
- ✅ Order number format matches shop pattern (RTR* or VKNG*)

---

### Test 2: Check KV Storage for Pixel Data
**Objective**: Verify if pixel data exists for recent order

**Steps**:
1. Use order number from Test 1
2. Check KV key: `pixel_data_{shop}_{orderNumber}`
3. If exists, verify fbc, fbp, ga_client_id present

**Expected Result**:
- Pixel data found (if order placed after script installation)
- OR no pixel data (if order placed before)

**Success Criteria**:
- ✅ KV lookup executes without error
- ✅ Data format validated if present

---

### Test 3: Webhook Processing (Real Order)
**Objective**: Process real order through webhook

**Steps**:
1. Use complete order data from Test 1
2. POST to `/webhook?shop={shopId}`
3. Verify response shows both platforms succeeded
4. Check response for fbtrace_id (Meta) and GA4 success

**Expected Result**:
```json
{
  "success": true,
  "shop": "...",
  "orderId": "...",
  "platforms": {
    "meta": {
      "success": true,
      "eventsReceived": 1,
      "fbtrace_id": "..."
    },
    "ga4": {
      "success": true
    }
  }
}
```

**Success Criteria**:
- ✅ HTTP 200 response
- ✅ Both platforms return success
- ✅ Event ID matches order number
- ✅ No errors in response

---

### Test 4: Meta CAPI Verification
**Objective**: Confirm event received by Meta

**Steps**:
1. Note fbtrace_id from Test 3
2. Go to Meta Events Manager
3. Look for Purchase event with matching order number
4. Verify parameters present

**Expected Parameters**:
- ✅ E-mailadres (em)
- ✅ Externe ID (external_id)
- ✅ Klik-ID (fbc) - if pixel data exists
- ✅ Browser-ID (fbp) - if pixel data exists
- ✅ IP-adres (client_ip_address)
- ✅ User-agent (client_user_agent)

**Success Criteria**:
- ✅ Event visible in Events Manager (within 5 minutes)
- ✅ Event Match Quality shows improvements
- ✅ Status: Gededupliceerd or Verwerkt

---

### Test 5: GA4 Verification
**Objective**: Confirm event received by GA4

**Steps**:
1. Go to GA4 property (G-NBZL3D7WK8 or G-P6152QHNZ6)
2. Click Realtime report
3. Look for purchase event
4. Verify transaction_id matches order number

**Expected Result**:
- Purchase event visible in Realtime
- Transaction ID matches order number
- Value matches order total
- Currency is EUR

**Success Criteria**:
- ✅ Event visible in GA4 Realtime (within 1 minute)
- ✅ Transaction details correct
- ✅ No errors in DebugView

---

### Test 6: Deduplication Test
**Objective**: Verify duplicate webhooks are rejected

**Steps**:
1. Send same order webhook again (from Test 3)
2. Verify response shows duplicate=true
3. Check that no new event sent to Meta/GA4

**Expected Result**:
```json
{
  "success": true,
  "duplicate": true,
  "message": "Order already processed (deduplication)"
}
```

**Success Criteria**:
- ✅ HTTP 200 response
- ✅ duplicate flag is true
- ✅ No additional events sent
- ✅ Response within 100ms (no API calls)

---

### Test 7: Cron Job Manual Trigger
**Objective**: Test backup polling mechanism

**Steps**:
1. Trigger cron handler manually (via test script)
2. Verify it fetches recent orders
3. Check deduplication prevents re-processing
4. Validate logs show correct behavior

**Expected Result**:
```json
{
  "timestamp": "...",
  "shops": [
    {
      "shop": "VikGinChoice",
      "ordersChecked": 5,
      "ordersSent": 0,
      "errors": []
    },
    {
      "shop": "Retoertje",
      "ordersChecked": 3,
      "ordersSent": 0,
      "errors": []
    }
  ]
}
```

**Success Criteria**:
- ✅ Cron executes without errors
- ✅ Orders are fetched from API
- ✅ Deduplication prevents re-sending
- ✅ No duplicate events created

---

### Test 8: Order Without Pixel Data
**Objective**: Test backup flow when KV data missing

**Steps**:
1. Find older order (before pixel script installation)
2. Send via webhook
3. Verify event still sent to Meta/GA4
4. Check that event has lower EMQ (no fbc/fbp)

**Expected Result**:
- Event sent successfully
- Meta CAPI succeeds (without fbc/fbp)
- GA4 succeeds (with fallback client_id)
- EMQ lower than events with pixel data

**Success Criteria**:
- ✅ Event sends despite missing pixel data
- ✅ Both platforms succeed
- ✅ Worker doesn't crash on missing data

---

## 🎯 **Success Criteria Summary**

### Critical (Must Pass):
- ✅ Webhook processes real orders
- ✅ Both Meta and GA4 receive events
- ✅ No errors in production worker
- ✅ Deduplication prevents duplicates

### Important (Should Pass):
- ✅ Pixel data merges correctly when available
- ✅ Event Match Quality parameters present
- ✅ Cron job functions as backup
- ✅ Error handling works for edge cases

### Nice to Have:
- ✅ Events visible in real-time dashboards
- ✅ All parameters correctly formatted
- ✅ Performance under 500ms per webhook

---

## 📊 **Test Execution Log**

### Test Execution: [Date/Time]

| Test | Status | Duration | Notes |
|------|--------|----------|-------|
| 1. Fetch Last Order | ⏳ Pending | - | - |
| 2. Check KV Storage | ⏳ Pending | - | - |
| 3. Webhook Processing | ⏳ Pending | - | - |
| 4. Meta Verification | ⏳ Pending | - | - |
| 5. GA4 Verification | ⏳ Pending | - | - |
| 6. Deduplication | ⏳ Pending | - | - |
| 7. Cron Job | ⏳ Pending | - | - |
| 8. No Pixel Data | ⏳ Pending | - | - |

**Overall Result**: ⏳ In Progress

---

## 🔍 **Test Data**

### Order Information:
```
Shop: [To be determined]
Order Number: [To be determined]
Order Date: [To be determined]
Customer Email: [To be determined]
Order Total: [To be determined]
Products: [To be determined]
```

### Pixel Data (if available):
```
fbc: [To be determined]
fbp: [To be determined]
ga_client_id: [To be determined]
```

### Platform Responses:
```
Meta fbtrace_id: [To be determined]
GA4 Status: [To be determined]
```

---

## 📝 **Notes**

### Before Testing:
- Ensure .env.local is loaded
- Verify worker is live and responding
- Check Cloudflare KV namespaces accessible
- Backup any important data

### During Testing:
- Monitor worker logs: `npx wrangler tail`
- Take screenshots of Meta Events Manager
- Record GA4 Realtime events
- Note any unexpected behavior

### After Testing:
- Document all results
- Update TEST-RESULTS.md
- Commit findings to git
- Plan any necessary fixes

---

**Test Plan Created**: 2025-10-31T17:30:00Z
**Created By**: Claude Code
**Status**: ⏳ Ready to Execute
