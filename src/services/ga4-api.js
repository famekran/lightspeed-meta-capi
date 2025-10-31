/**
 * Google Analytics 4 Measurement Protocol API Service
 * Sends server-side purchase events to GA4
 */

/**
 * Send purchase event to GA4 via Measurement Protocol
 * @param {Object} orderData - Lightspeed order data
 * @param {Object} shopConfig - Shop configuration with GA4 credentials
 * @param {Object} pixelData - Pixel data from KV (includes ga_client_id)
 * @returns {Promise<Object>} GA4 API response
 */
export async function sendGA4PurchaseEvent(orderData, shopConfig, pixelData = {}) {
  const { ga4 } = shopConfig;

  // Check if GA4 is enabled and configured
  if (!ga4?.enabled || !ga4?.measurementId || !ga4?.apiSecret) {
    console.log(`GA4 not configured for ${shopConfig.name}, skipping`);
    return { success: false, skipped: true, reason: 'GA4 not configured' };
  }

  // Build endpoint URL
  const endpoint = `https://www.google-analytics.com/mp/collect?measurement_id=${ga4.measurementId}&api_secret=${ga4.apiSecret}`;

  // Build payload
  const payload = buildGA4Payload(orderData, shopConfig, pixelData);

  console.log(`Sending GA4 purchase event for ${shopConfig.name}:`, {
    orderId: orderData.number,
    client_id: payload.client_id,
    value: payload.events[0].params.value,
    currency: payload.events[0].params.currency
  });

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    // GA4 Measurement Protocol returns 204 No Content on success
    if (response.status === 204) {
      console.log('✅ GA4 purchase event sent successfully:', {
        shop: shopConfig.name,
        orderId: orderData.number,
        transaction_id: orderData.number,
        client_id: payload.client_id ? 'present' : 'generated'
      });

      return {
        success: true,
        status: 204,
        shop: shopConfig.name,
        orderId: orderData.number
      };
    } else {
      // Non-204 response (unexpected)
      const errorText = await response.text();
      console.error('GA4 API unexpected response:', {
        status: response.status,
        body: errorText
      });

      throw new Error(`GA4 API returned status ${response.status}: ${errorText}`);
    }
  } catch (error) {
    console.error('❌ GA4 API Error:', {
      shop: shopConfig.name,
      orderId: orderData.number,
      error: error.message
    });

    throw error;
  }
}

/**
 * Build GA4 Measurement Protocol payload
 * @param {Object} orderData - Lightspeed order data
 * @param {Object} shopConfig - Shop configuration
 * @param {Object} pixelData - Pixel data from browser (includes ga_client_id)
 * @returns {Object} GA4 payload
 */
function buildGA4Payload(orderData, shopConfig, pixelData) {
  // Client ID is CRITICAL for deduplication
  // Format: 1234567890.1234567890 (from _ga cookie)
  const clientId = pixelData.ga_client_id || generateFallbackClientId();

  // Use order creation time (important for deduplication!)
  const orderCreatedAt = orderData.createdAt || orderData.created_at || orderData.updatedAt;
  const eventTimestamp = orderCreatedAt
    ? Math.floor(new Date(orderCreatedAt).getTime())
    : Date.now();

  // Build purchase event
  const purchaseEvent = {
    name: 'purchase',
    params: {
      // Transaction details
      transaction_id: String(orderData.number), // MUST be string for dedup
      currency: orderData.currency || 'EUR',
      value: parseFloat(orderData.priceIncl || orderData.priceExcl || 0),

      // Optional transaction details
      tax: orderData.tax ? parseFloat(orderData.tax) : undefined,
      shipping: orderData.shippingCost ? parseFloat(orderData.shippingCost) : undefined,

      // Items array (products)
      items: buildGA4Items(orderData.products || []),

      // PERMANENT: Custom parameter to identify server-side events
      data_source: 'server'
    }
  };

  // Remove undefined values
  Object.keys(purchaseEvent.params).forEach(key => {
    if (purchaseEvent.params[key] === undefined) {
      delete purchaseEvent.params[key];
    }
  });

  const payload = {
    client_id: clientId,
    timestamp_micros: eventTimestamp * 1000, // Convert ms to microseconds
    events: [purchaseEvent]
  };

  // Add session_id if available (improves session tracking)
  if (pixelData.ga_session_id) {
    payload.user_properties = {
      session_id: { value: pixelData.ga_session_id }
    };
  }

  return payload;
}

/**
 * Build GA4 items array from Lightspeed products
 * @param {Array} products - Lightspeed order products
 * @returns {Array} GA4 items array
 */
function buildGA4Items(products) {
  if (!Array.isArray(products) || products.length === 0) {
    return [];
  }

  return products.map((product, index) => {
    const item = {
      item_id: String(product.articleCode || product.id || `product_${index}`),
      item_name: product.title || 'Unknown Product',
      quantity: parseInt(product.quantityOrdered || product.quantity || 1),
      price: parseFloat(product.priceIncl || product.price || 0)
    };

    // Optional fields
    if (product.brand) item.item_brand = product.brand;
    if (product.category) item.item_category = product.category;

    // Index in list
    item.index = index;

    return item;
  });
}

/**
 * Generate fallback client_id if not available from browser
 * Format: randomNumber.unixTimestamp (mimics GA4 format)
 *
 * WARNING: This reduces deduplication accuracy!
 * Events with generated client_id won't deduplicate with browser events.
 */
function generateFallbackClientId() {
  const randomId = Math.floor(Math.random() * 2147483647); // Max 32-bit int
  const timestamp = Math.floor(Date.now() / 1000);

  console.warn('⚠️ No ga_client_id from browser, generating fallback client_id. Deduplication may not work!');

  return `${randomId}.${timestamp}`;
}

/**
 * Send event to GA4 debug endpoint for validation
 * Use this for testing before going to production
 *
 * @param {Object} orderData - Lightspeed order data
 * @param {Object} shopConfig - Shop configuration
 * @param {Object} pixelData - Pixel data from browser
 * @returns {Promise<Object>} Debug response with validation messages
 */
export async function sendGA4DebugEvent(orderData, shopConfig, pixelData = {}) {
  const { ga4 } = shopConfig;

  if (!ga4?.measurementId || !ga4?.apiSecret) {
    throw new Error('GA4 not configured');
  }

  // Use debug endpoint
  const endpoint = `https://www.google-analytics.com/debug/mp/collect?measurement_id=${ga4.measurementId}&api_secret=${ga4.apiSecret}`;

  const payload = buildGA4Payload(orderData, shopConfig, pixelData);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const result = await response.json();

  console.log('GA4 Debug Response:', JSON.stringify(result, null, 2));

  return result;
}
