/**
 * Webhook Handler
 * Processes Lightspeed order.created webhook and sends to Meta CAPI
 */

import { getShopConfig } from '../config/shops.js';
import { resolveShopFromRequest } from '../utils/shop-resolver.js';
import { sendPurchaseEvent } from '../services/meta-capi.js';
import { sendGA4PurchaseEvent } from '../services/ga4-api.js';

/**
 * Handle Lightspeed webhook POST request
 * @param {Request} request - Incoming webhook request
 * @param {Object} env - Worker environment with secrets
 * @returns {Response} JSON response
 */
export async function handleWebhook(request, env) {
  try {
    // 1. Resolve which shop this webhook is for
    const shopId = resolveShopFromRequest(request);

    if (!shopId) {
      return jsonResponse({
        error: 'Missing shop parameter',
        message: 'Please specify shop in URL: ?shop=vikginchoice or ?shop=retoertje'
      }, 400);
    }

    console.log(`Webhook received for shop: ${shopId}`);

    // 2. Get shop configuration
    let shopConfig;
    try {
      shopConfig = getShopConfig(shopId, env);
      console.log(`Shop config loaded for: ${shopConfig.name}`);
    } catch (error) {
      console.error('Shop config error:', error);
      return jsonResponse({
        error: 'Invalid shop or missing credentials',
        message: error.message
      }, 400);
    }

    // 3. Parse webhook payload
    let rawPayload;
    try {
      rawPayload = await request.json();
      console.log(`Webhook payload parsed, order number: ${rawPayload.order?.number || rawPayload.number || 'unknown'}`);
    } catch (error) {
      console.error('JSON parse error:', error);
      return jsonResponse({
        error: 'Invalid JSON payload',
        message: error.message
      }, 400);
    }

    // Extract order data - Lightspeed may send {order: {...}} or just {...}
    const payload = rawPayload.order || rawPayload;

    // Try to retrieve pixel data from KV (stored by browser)
    let pixelData = {};
    if (payload.number && env.PIXEL_DATA_KV) {
      const kvKey = `pixel_data_${shopConfig.id}_${payload.number}`;
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
        console.log(`No pixel data found in KV for order ${payload.number} (may not have loaded yet)`);
      }
    }

    // Fallback: extract from payload if sent directly (legacy support)
    if (!pixelData.fbc && rawPayload.fbc) pixelData.fbc = rawPayload.fbc;
    if (!pixelData.fbp && rawPayload.fbp) pixelData.fbp = rawPayload.fbp;
    if (!pixelData.client_user_agent) {
      pixelData.client_user_agent = rawPayload.client_user_agent || request.headers.get('User-Agent') || null;
    }
    if (!pixelData.client_ip_address) {
      pixelData.client_ip_address = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || null;
    }
    if (!pixelData.event_source_url && rawPayload.event_source_url) {
      pixelData.event_source_url = rawPayload.event_source_url;
    }

    console.log(`Webhook payload:`, {
      orderId: payload.number,
      currency: payload.currency,
      total: payload.priceIncl
    });

    // 4. Validate order data
    if (!payload.number) {
      return jsonResponse({
        error: 'Missing order number',
        message: 'Webhook payload must contain order.number'
      }, 400);
    }

    // 5. Check deduplication (prevent duplicate webhooks)
    const dedupKey = `order_${shopConfig.id}_${payload.number}`;

    if (env.ORDER_DEDUP) {
      const alreadySent = await env.ORDER_DEDUP.get(dedupKey);
      if (alreadySent) {
        console.log(`Order ${payload.number} already sent, skipping duplicate webhook`);
        return jsonResponse({
          success: true,
          duplicate: true,
          shop: shopConfig.name,
          orderId: payload.number,
          message: 'Order already processed (deduplication)'
        }, 200);
      }
    }

    // 6. Send to BOTH Meta CAPI and GA4 (parallel)
    try {
      console.log(`Sending purchase event to both Meta and GA4 for order ${payload.number}`);

      // Send to both platforms in parallel using Promise.allSettled
      // This ensures one platform failure doesn't block the other
      const [metaResult, ga4Result] = await Promise.allSettled([
        sendPurchaseEvent(payload, shopConfig, pixelData),
        sendGA4PurchaseEvent(payload, shopConfig, pixelData)
      ]);

      // Log results for each platform
      const metaSuccess = metaResult.status === 'fulfilled';
      const ga4Success = ga4Result.status === 'fulfilled';

      console.log('Platform sending results:', {
        meta: metaSuccess ? '✅ Success' : '❌ Failed',
        ga4: ga4Success ? '✅ Success' : ga4Result.reason?.skipped ? '⊘ Skipped' : '❌ Failed'
      });

      // Log detailed error if Meta failed
      if (!metaSuccess) {
        console.error('❌ Meta CAPI failed:', {
          error: metaResult.reason?.message || 'Unknown error',
          orderId: payload.number,
          stack: metaResult.reason?.stack
        });
      }

      // Log detailed error if GA4 failed (and not skipped)
      if (!ga4Success && !ga4Result.reason?.skipped) {
        console.error('❌ GA4 failed:', {
          error: ga4Result.reason?.message || 'Unknown error',
          orderId: payload.number,
          stack: ga4Result.reason?.stack
        });
      }

      // Mark as sent (24h TTL) - even if one platform failed
      if (env.ORDER_DEDUP) {
        await env.ORDER_DEDUP.put(dedupKey, JSON.stringify({
          timestamp: new Date().toISOString(),
          orderId: payload.number,
          shop: shopConfig.name,
          platforms: {
            meta: metaSuccess,
            ga4: ga4Success || ga4Result.reason?.skipped
          }
        }), { expirationTtl: 86400 }); // 24 hours
      }

      // Build response with both platform results
      const response = {
        success: metaSuccess || ga4Success, // At least one succeeded
        shop: shopConfig.name,
        orderId: payload.number,
        eventId: `purchase_${payload.number}`,
        platforms: {
          meta: metaSuccess ? {
            success: true,
            eventsReceived: metaResult.value.events_received,
            fbtrace_id: metaResult.value.fbtrace_id
          } : {
            success: false,
            error: metaResult.reason?.message
          },
          ga4: ga4Success ? {
            success: true
          } : ga4Result.reason?.skipped ? {
            success: false,
            skipped: true,
            reason: ga4Result.reason.reason
          } : {
            success: false,
            error: ga4Result.reason?.message
          }
        }
      };

      // Return 200 if at least one platform succeeded, 500 if both failed
      const statusCode = (metaSuccess || ga4Success) ? 200 : 500;

      return jsonResponse(response, statusCode);

    } catch (error) {
      console.error('Webhook processing error:', error.message);
      console.error('Error stack:', error.stack);

      return jsonResponse({
        error: 'Failed to process webhook',
        message: error.message,
        orderId: payload?.number || 'unknown'
      }, 500);
    }
  } catch (error) {
    console.error('Webhook handler error:', error.message);
    console.error('Error stack:', error.stack);

    return jsonResponse({
      error: 'Internal server error',
      message: error.message
    }, 500);
  }
}

/**
 * Helper to create JSON response
 */
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*' // Allow CORS for testing
    }
  });
}
