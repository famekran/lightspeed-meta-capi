/**
 * Meta Conversions API Service
 * Sends server-side Purchase events to Meta
 */

import { hashUserData } from '../utils/hash.js';

/**
 * Send Purchase event to Meta Conversions API
 * @param {Object} orderData - Order data from Lightspeed webhook
 * @param {Object} shopConfig - Shop configuration with Meta credentials
 * @param {Object} pixelData - Optional data from pixel (fbc, fbp, user_agent, ip)
 * @returns {Object} Response from Meta CAPI
 */
export async function sendPurchaseEvent(orderData, shopConfig, pixelData = {}) {
  const { meta } = shopConfig;

  // Build event payload
  // CRITICAL: Use order creation time (when customer was on thank-you page)
  // NOT the current time (when webhook is processed)
  // This ensures proper deduplication with Pixel event
  const orderCreatedAt = orderData.createdAt || orderData.created_at || orderData.updatedAt;
  const eventTime = orderCreatedAt
    ? Math.floor(new Date(orderCreatedAt).getTime() / 1000)
    : Math.floor(Date.now() / 1000); // Fallback to now if no timestamp

  const event = {
    event_name: 'Purchase',
    event_time: eventTime,
    event_id: `purchase_${orderData.number}`, // CRITICAL: Must match Pixel event_id!
    event_source_url: pixelData.event_source_url || `https://${shopConfig.domain}/checkout/thankyou`,
    action_source: 'website',
    user_data: await buildUserData(orderData, pixelData),
    custom_data: buildCustomData(orderData)
  };

  // Build API request
  const url = `https://graph.facebook.com/${meta.apiVersion}/${meta.pixelId}/events`;
  const payload = {
    data: [event],
    access_token: meta.accessToken
  };

  // Add test event code if in test mode
  if (meta.testMode && meta.testEventCode) {
    payload.test_event_code = meta.testEventCode;
  }

  // Send to Meta CAPI
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
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
      eventTime: new Date(event.event_time * 1000).toISOString(), // Show human-readable time
      eventTimeUnix: event.event_time,
      eventsReceived: result.events_received,
      messagesReceived: result.messages?.length || 0,
      fbtrace_id: result.fbtrace_id
    });

    return result;
  } catch (error) {
    console.error('Meta CAPI Request Failed:', error);
    throw error;
  }
}

/**
 * Build user_data object with SHA-256 hashed PII + CAPI-matching parameters
 * @param {Object} orderData - Order data from Lightspeed
 * @param {Object} pixelData - Optional pixel data (fbc, fbp, user_agent, ip)
 * @returns {Object} Hashed user data for Meta CAPI
 */
async function buildUserData(orderData, pixelData = {}) {
  // Note: Lightspeed puts customer fields directly on order object
  // addressBilling contains the billing address
  const billing = orderData.addressBillingCountry || orderData.addressBilling || {};

  const rawUserData = {
    email: orderData.email,
    phone: orderData.phone || orderData.mobile,
    firstName: orderData.firstname,
    lastName: orderData.lastname,
    city: orderData.addressBillingCity,
    zipcode: orderData.addressBillingZipcode,
    country: orderData.addressBillingCountry?.code || 'nl' // ISO 2-letter code
  };

  // Hash all PII data
  const hashedData = await hashUserData(rawUserData);

  // Add CRITICAL CAPI-matching parameters (NOT hashed!)
  // These dramatically improve gebeurtenisdekking (event coverage)

  // 1. Click ID (fbc) - 56.59% improvement in match rate
  if (pixelData.fbc) {
    hashedData.fbc = pixelData.fbc;
  }

  // 2. Browser ID (fbp) - 2.06% improvement
  if (pixelData.fbp) {
    hashedData.fbp = pixelData.fbp;
  }

  // 3. Client IP Address - 23.46% improvement
  // Note: This should come from request headers in webhook handler
  if (pixelData.client_ip_address) {
    hashedData.client_ip_address = pixelData.client_ip_address;
  }

  // 4. Client User Agent - 23.46% improvement
  if (pixelData.client_user_agent) {
    hashedData.client_user_agent = pixelData.client_user_agent;
  }

  // 5. External ID (optional) - 2.06% improvement
  // Use order number as external ID for cross-platform tracking
  if (orderData.number) {
    hashedData.external_id = String(orderData.number);
  }

  return hashedData;
}

/**
 * Build custom_data object with order details
 * @param {Object} orderData - Order data from Lightspeed
 * @returns {Object} Custom data for Meta CAPI
 */
function buildCustomData(orderData) {
  // Extract product data (fetched separately via /orders/{id}/products.json)
  // IMPORTANT: Ensure products is always an array, even if undefined/null/not-an-array
  const products = Array.isArray(orderData.products) ? orderData.products : [];

  // Extract variant IDs or product IDs from the orderProduct objects
  // Note: variant is a resource object, we need to extract the ID from it
  const contentIds = products.map(p => {
    if (p.variant && p.variant.resource && p.variant.resource.id) {
      return String(p.variant.resource.id);
    }
    // Fallback to product ID if variant not available
    if (p.product && p.product.resource && p.product.resource.id) {
      return String(p.product.resource.id);
    }
    return String(p.id); // Last resort: use orderProduct ID
  });

  const contents = products.map(p => ({
    id: (p.variant?.resource?.id || p.product?.resource?.id || p.id).toString(),
    quantity: p.quantityOrdered || 1,
    item_price: parseFloat(p.basePriceIncl || 0)
  }));

  return {
    content_ids: contentIds,
    content_type: 'product',
    contents: contents,
    currency: (orderData.currency || 'EUR').toUpperCase().slice(0, 3), // ISO 4217
    value: parseFloat(orderData.priceIncl || orderData.total || 0),
    order_id: String(orderData.number)
  };
}
