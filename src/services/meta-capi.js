/**
 * Meta Conversions API Service
 * Sends server-side Purchase events to Meta
 */

import { hashUserData } from '../utils/hash.js';

/**
 * Send Purchase event to Meta Conversions API
 * @param {Object} orderData - Order data from Lightspeed webhook
 * @param {Object} shopConfig - Shop configuration with Meta credentials
 * @returns {Object} Response from Meta CAPI
 */
export async function sendPurchaseEvent(orderData, shopConfig) {
  const { meta } = shopConfig;

  // Build event payload
  const event = {
    event_name: 'Purchase',
    event_time: Math.floor(Date.now() / 1000), // Unix timestamp
    event_id: `purchase_${orderData.number}`, // CRITICAL: Must match Pixel event_id!
    event_source_url: `https://${shopConfig.domain}/checkout/thankyou`,
    action_source: 'website',
    user_data: await buildUserData(orderData),
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
      eventsReceived: result.events_received,
      messagesReceived: result.messages?.length || 0
    });

    return result;
  } catch (error) {
    console.error('Meta CAPI Request Failed:', error);
    throw error;
  }
}

/**
 * Build user_data object with SHA-256 hashed PII
 * @param {Object} orderData - Order data from Lightspeed
 * @returns {Object} Hashed user data for Meta CAPI
 */
async function buildUserData(orderData) {
  const customer = orderData.customer || {};
  const billing = orderData.addressBilling || {};

  const rawUserData = {
    email: customer.email,
    phone: customer.phone || billing.phone,
    firstName: customer.firstname,
    lastName: customer.lastname,
    city: billing.city,
    zipcode: billing.zipcode,
    country: billing.country?.code || 'nl' // ISO 2-letter code
  };

  // Hash all PII data
  return await hashUserData(rawUserData);
}

/**
 * Build custom_data object with order details
 * @param {Object} orderData - Order data from Lightspeed
 * @returns {Object} Custom data for Meta CAPI
 */
function buildCustomData(orderData) {
  // Extract product data
  const products = orderData.products || [];
  const contentIds = products.map(p => String(p.variantId || p.productId));
  const contents = products.map(p => ({
    id: String(p.variantId || p.productId),
    quantity: p.quantity || 1,
    item_price: parseFloat(p.basePriceIncl || p.price || 0)
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
