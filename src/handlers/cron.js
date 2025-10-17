/**
 * Cron Handler for Polling Lightspeed Orders
 * Runs every 5 minutes to check for new orders and send to Meta CAPI
 */

import { listShops, getShopConfig } from '../config/shops.js';
import { fetchRecentOrders, fetchOrderProducts } from '../services/lightspeed.js';
import { sendPurchaseEvent } from '../services/meta-capi.js';

/**
 * Handle scheduled cron trigger
 * @param {Event} event - Scheduled event
 * @param {Object} env - Worker environment with secrets
 */
export async function handleCron(event, env) {
  console.log('🕐 Cron trigger started:', new Date().toISOString());

  const shops = listShops();
  const results = {
    timestamp: new Date().toISOString(),
    shops: []
  };

  // Process each shop in parallel
  await Promise.all(
    shops.map(async (shopId) => {
      try {
        console.log(`Processing shop: ${shopId}`);

        const shopConfig = getShopConfig(shopId, env);
        const shopResult = {
          shop: shopConfig.name,
          ordersChecked: 0,
          ordersSent: 0,
          errors: []
        };

        // Fetch orders from last 6 minutes (matches cron frequency with 1min overlap)
        const orders = await fetchRecentOrders(shopConfig, 6);
        shopResult.ordersChecked = orders.length;

        console.log(`Found ${orders.length} orders for ${shopConfig.name}`);

        // Process each order
        for (const order of orders) {
          try {
            // Check if order is complete (has customer data and payment)
            // Note: Lightspeed puts customer fields directly on order object
            if (!order.email) {
              console.log(`Skipping order ${order.number}: incomplete customer data`);
              continue;
            }

            // Check if order is paid (only send paid orders)
            if (order.paymentStatus !== 'paid') {
              console.log(`Skipping order ${order.number}: payment status is ${order.paymentStatus}`);
              continue;
            }

            // Fetch products for this order
            console.log(`Fetching products for order ${order.number}...`);
            const products = await fetchOrderProducts(order.id, shopConfig);

            // Add products to order object
            order.products = products;

            console.log(`Sending order ${order.number} to Meta CAPI (${products.length} products)...`);

            // Send to Meta CAPI
            const metaResponse = await sendPurchaseEvent(order, shopConfig);

            shopResult.ordersSent++;
            console.log(`✅ Order ${order.number} sent successfully`, {
              eventsReceived: metaResponse.events_received,
              fbtrace_id: metaResponse.fbtrace_id
            });

          } catch (orderError) {
            console.error(`Failed to process order ${order.number}:`, orderError);
            shopResult.errors.push({
              orderId: order.number,
              error: orderError.message
            });
          }
        }

        results.shops.push(shopResult);

      } catch (shopError) {
        console.error(`Failed to process shop ${shopId}:`, shopError);
        results.shops.push({
          shop: shopId,
          error: shopError.message
        });
      }
    })
  );

  console.log('✅ Cron job completed:', results);

  // Return results (visible in wrangler tail logs)
  return results;
}
