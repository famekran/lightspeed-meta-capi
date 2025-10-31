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
      // Meta CAPI parameters
      fbc: pixelData.fbc || null,
      fbp: pixelData.fbp || null,

      // GA4 Measurement Protocol parameters
      ga_client_id: pixelData.ga_client_id || null,
      ga_session_id: pixelData.ga_session_id || null,
      gclid: pixelData.gclid || null,

      // Attribution parameters
      utm: pixelData.utm || null,
      referrer: pixelData.referrer || null,

      // Shared parameters
      client_user_agent: pixelData.client_user_agent || request.headers.get('User-Agent') || null,
      client_ip_address: clientIp,
      event_source_url: pixelData.event_source_url || null,
      timestamp: new Date().toISOString()
    };

    // 6. Store in KV with order_id as key (TTL: 1 hour)
    // Key format: pixel_data_{shopId}_{orderId}
    const kvKey = `pixel_data_${shopId}_${pixelData.order_id}`;

    if (!env.PIXEL_DATA_KV) {
      console.error('❌ PIXEL_DATA_KV binding not found!');
      return jsonResponse({
        success: false,
        error: 'KV binding missing',
        message: 'PIXEL_DATA_KV binding not available in Worker environment'
      }, 500);
    }

    console.log('📝 Writing to KV:', kvKey);

    try {
      await env.PIXEL_DATA_KV.put(kvKey, JSON.stringify(completePixelData), {
        expirationTtl: 3600 // 1 hour TTL (webhook should arrive within minutes)
      });
      console.log('✅ KV write successful');
    } catch (kvError) {
      console.error('❌ KV write failed:', kvError);
      return jsonResponse({
        success: false,
        error: 'KV write failed',
        message: kvError.message
      }, 500);
    }

    console.log(`Pixel data stored for ${shopId} order ${pixelData.order_id}:`, {
      fbc: completePixelData.fbc ? 'present' : 'missing',
      fbp: completePixelData.fbp ? 'present' : 'missing',
      ga_client_id: completePixelData.ga_client_id ? 'present' : 'missing',
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
        ga_client_id: !!completePixelData.ga_client_id,
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
