/**
 * Multi-Tenant Shop Configuration
 * Maps shop identifiers to their credentials and settings
 */

export function getShopConfig(shopId, env) {
  const shops = {
    vikginchoice: {
      name: 'VikGinChoice',
      domain: 'vikginchoice.nl',
      lightspeed: {
        apiKey: env.VIKGINCHOICE_LIGHTSPEED_API_KEY,
        apiSecret: env.VIKGINCHOICE_LIGHTSPEED_API_SECRET,
        shopId: env.VIKGINCHOICE_LIGHTSPEED_SHOP_ID,
        clusterUrl: 'https://api.webshopapp.com',
        language: 'nl'
      },
      meta: {
        accessToken: env.VIKGINCHOICE_META_ACCESS_TOKEN,
        pixelId: env.VIKGINCHOICE_META_PIXEL_ID,
        apiVersion: 'v18.0',
        testMode: false
      }
    },
    retoertje: {
      name: 'Retoertje',
      domain: 'retoertje.nl',
      lightspeed: {
        apiKey: env.RETOERTJE_LIGHTSPEED_API_KEY,
        apiSecret: env.RETOERTJE_LIGHTSPEED_API_SECRET,
        shopId: env.RETOERTJE_LIGHTSPEED_SHOP_ID,
        clusterUrl: 'https://api.webshopapp.com',
        language: 'nl'
      },
      meta: {
        accessToken: env.RETOERTJE_META_ACCESS_TOKEN,
        pixelId: env.RETOERTJE_META_PIXEL_ID,
        apiVersion: 'v18.0',
        testMode: false
      }
    }
  };

  const config = shops[shopId?.toLowerCase()];

  if (!config) {
    throw new Error(`Unknown shop: ${shopId}. Valid shops: ${Object.keys(shops).join(', ')}`);
  }

  // Validate required credentials
  const missing = [];
  if (!config.lightspeed.apiKey) missing.push('LIGHTSPEED_API_KEY');
  if (!config.lightspeed.apiSecret) missing.push('LIGHTSPEED_API_SECRET');
  if (!config.lightspeed.shopId) missing.push('LIGHTSPEED_SHOP_ID');
  if (!config.meta.accessToken) missing.push('META_ACCESS_TOKEN');
  if (!config.meta.pixelId) missing.push('META_PIXEL_ID');

  if (missing.length > 0) {
    throw new Error(`Missing credentials for ${shopId}: ${missing.join(', ')}`);
  }

  return config;
}

export function listShops() {
  return ['vikginchoice', 'retoertje'];
}
