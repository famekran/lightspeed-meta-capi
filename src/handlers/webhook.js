/**
 * Webhook Handler
 * Processes Lightspeed order.created webhook and sends to Meta CAPI
 */

import { getShopConfig } from '../config/shops.js';
import { resolveShopFromRequest } from '../utils/shop-resolver.js';
import { sendPurchaseEvent } from '../services/meta-capi.js';

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
    } catch (error) {
      return jsonResponse({
        error: 'Invalid shop or missing credentials',
        message: error.message
      }, 400);
    }

    // 3. Parse webhook payload
    let rawPayload;
    try {
      rawPayload = await request.json();
    } catch (error) {
      return jsonResponse({
        error: 'Invalid JSON payload',
        message: error.message
      }, 400);
    }

    // Extract order data - Lightspeed may send {order: {...}} or just {...}
    const payload = rawPayload.order || rawPayload;

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

    // 5. Send to Meta CAPI
    try {
      const result = await sendPurchaseEvent(payload, shopConfig);

      return jsonResponse({
        success: true,
        shop: shopConfig.name,
        orderId: payload.number,
        eventId: `purchase_${payload.number}`,
        metaResponse: {
          eventsReceived: result.events_received,
          fbtrace_id: result.fbtrace_id
        }
      }, 200);
    } catch (error) {
      console.error('Meta CAPI Error:', error);

      return jsonResponse({
        error: 'Failed to send event to Meta',
        message: error.message,
        orderId: payload.number
      }, 500);
    }
  } catch (error) {
    console.error('Webhook handler error:', error);

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
