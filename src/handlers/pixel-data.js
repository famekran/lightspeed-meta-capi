/**
 * Pixel Data Handler
 * Stores fbc/fbp from browser in KV for later merge with Lightspeed order data
 */

import { resolveShopFromRequest } from '../utils/shop-resolver.js';

/**
 * Handle browser POST request with pixel data (fbc, fbp, user-agent)
 * @param {Request} request - Incoming request from thank-you page
 * @param {Object} env - Worker environment with KV bindings
 * @returns {Response} JSON response
 */
export async function handlePixelData(request, env) {
  try {
    // 1. Resolve which shop this is for
    const shopId = resolveShopFromRequest(request);

    if (!shopId) {
      return jsonResponse({
        error: 'Missing shop parameter',
        message: 'Please specify shop in URL: ?shop=vikginchoice or ?shop=retoertje'
      }, 400);
    }

    // 2. Parse pixel data from browser
    let pixelData;
    try {
      pixelData = await request.json();
    } catch (error) {
      return jsonResponse({
        error: 'Invalid JSON payload',
        message: error.message
      }, 400);
    }

    // 3. Validate required fields
    if (!pixelData.order_id) {
      return jsonResponse({
        error: 'Missing order_id',
        message: 'Pixel data must contain order_id'
      }, 400);
    }

    // 4. Extract client IP from headers (Cloudflare provides this)
    const clientIp = request.headers.get('CF-Connecting-IP') ||
                     request.headers.get('X-Forwarded-For') ||
                     null;

    // 5. Build complete pixel data object
    const completePixelData = {
      fbc: pixelData.fbc || null,
      fbp: pixelData.fbp || null,
      client_user_agent: pixelData.client_user_agent || request.headers.get('User-Agent') || null,
      client_ip_address: clientIp,
      event_source_url: pixelData.event_source_url || null,
      timestamp: new Date().toISOString()
    };

    // 6. Store in KV with order_id as key (TTL: 1 hour)
    // Key format: pixel_data_{shopId}_{orderId}
    const kvKey = `pixel_data_${shopId}_${pixelData.order_id}`;

    if (!env.PIXEL_DATA_KV) {
      console.warn('PIXEL_DATA_KV binding not found, pixel data will not be stored');
      return jsonResponse({
        success: true,
        warning: 'KV not configured',
        message: 'Pixel data received but not stored (KV binding missing)'
      }, 200);
    }

    await env.PIXEL_DATA_KV.put(kvKey, JSON.stringify(completePixelData), {
      expirationTtl: 3600 // 1 hour TTL (webhook should arrive within minutes)
    });

    console.log(`Pixel data stored for ${shopId} order ${pixelData.order_id}:`, {
      fbc: completePixelData.fbc ? 'present' : 'missing',
      fbp: completePixelData.fbp ? 'present' : 'missing',
      client_ip_address: completePixelData.client_ip_address ? 'present' : 'missing',
      client_user_agent: completePixelData.client_user_agent ? 'present' : 'missing'
    });

    return jsonResponse({
      success: true,
      shop: shopId,
      orderId: pixelData.order_id,
      message: 'Pixel data stored successfully',
      stored: {
        fbc: !!completePixelData.fbc,
        fbp: !!completePixelData.fbp,
        client_ip_address: !!completePixelData.client_ip_address,
        client_user_agent: !!completePixelData.client_user_agent
      }
    }, 200);

  } catch (error) {
    console.error('Pixel data handler error:', error);

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
      'Access-Control-Allow-Origin': '*' // Allow CORS for browser requests
    }
  });
}
