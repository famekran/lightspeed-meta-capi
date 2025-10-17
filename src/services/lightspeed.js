/**
 * Lightspeed eCom API Service
 * Fetches orders from Lightspeed API
 */

/**
 * Fetch recent orders from Lightspeed
 * @param {Object} shopConfig - Shop configuration with Lightspeed credentials
 * @param {number} sinceMinutes - Fetch orders created in last N minutes (default: 10)
 * @returns {Array} Array of orders
 */
export async function fetchRecentOrders(shopConfig, sinceMinutes = 10) {
  const { lightspeed } = shopConfig;

  // Calculate timestamp for filtering (ISO 8601 format)
  const sinceDate = new Date(Date.now() - sinceMinutes * 60 * 1000);
  const sinceTimestamp = sinceDate.toISOString();

  // Build Lightspeed API request
  // Note: EU cluster uses /nl/ and plural /orders.json
  const url = `${lightspeed.clusterUrl}/${lightspeed.language}/orders.json`;
  const params = new URLSearchParams({
    createdAtMin: sinceTimestamp, // Orders created after this timestamp
    limit: 50, // Max orders per request
    embed: 'customer' // Include customer data in response
  });

  const fullUrl = `${url}?${params}`;

  console.log(`Fetching orders from Lightspeed: ${shopConfig.name}`, {
    sinceTimestamp,
    url: fullUrl
  });

  try {
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(lightspeed.apiKey + ':' + lightspeed.apiSecret)}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lightspeed API Error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      throw new Error(`Lightspeed API failed: ${response.statusText}`);
    }

    const data = await response.json();
    const orders = data.orders || [];

    console.log(`Fetched ${orders.length} orders from ${shopConfig.name}`);

    return orders;
  } catch (error) {
    console.error('Failed to fetch orders from Lightspeed:', error);
    throw error;
  }
}

/**
 * Fetch products for an order from Lightspeed
 * @param {number} orderId - Order ID
 * @param {Object} shopConfig - Shop configuration
 * @returns {Array} Array of products
 */
export async function fetchOrderProducts(orderId, shopConfig) {
  const { lightspeed } = shopConfig;

  const url = `${lightspeed.clusterUrl}/${lightspeed.language}/orders/${orderId}/products.json`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(lightspeed.apiKey + ':' + lightspeed.apiSecret)}`
      }
    });

    if (!response.ok) {
      console.error(`Failed to fetch products for order ${orderId}:`, response.statusText);
      return []; // Return empty array if products can't be fetched
    }

    const data = await response.json();
    return data.orderProducts || [];
  } catch (error) {
    console.error(`Failed to fetch products for order ${orderId}:`, error);
    return []; // Return empty array on error
  }
}

/**
 * Fetch a single order by ID from Lightspeed
 * @param {string} orderId - Order ID
 * @param {Object} shopConfig - Shop configuration
 * @returns {Object} Order data
 */
export async function fetchOrderById(orderId, shopConfig) {
  const { lightspeed } = shopConfig;

  const url = `${lightspeed.clusterUrl}/${lightspeed.language}/orders/${orderId}.json`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(lightspeed.apiKey + ':' + lightspeed.apiSecret)}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch order ${orderId}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.order;
  } catch (error) {
    console.error(`Failed to fetch order ${orderId}:`, error);
    throw error;
  }
}
