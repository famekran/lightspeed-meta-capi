/**
 * Lightspeed → Meta Conversions API Bridge
 * Multi-Tenant Cloudflare Worker
 *
 * Supports: VikGinChoice, Retoertje
 */

import { handleWebhook } from './handlers/webhook.js';
import { handleCron } from './handlers/cron.js';
import { handlePixelData } from './handlers/pixel-data.js';
import { listShops } from './config/shops.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    }

    // Debug endpoint - check env variables
    if (path === '/debug-env') {
      const envKeys = Object.keys(env).filter(k => !k.startsWith('_') && k !== 'ORDER_DEDUP' && k !== 'PIXEL_DATA_KV');
      const vikKeys = envKeys.filter(k => k.includes('VIKGINCHOICE'));
      return new Response(JSON.stringify({
        availableEnvKeys: envKeys,
        vikginchoiceKeys: vikKeys,
        vikginchoiceValues: {
          API_KEY: env.VIKGINCHOICE_LIGHTSPEED_API_KEY ? 'present (' + String(env.VIKGINCHOICE_LIGHTSPEED_API_KEY).length + ' chars)' : 'MISSING',
          API_SECRET: env.VIKGINCHOICE_LIGHTSPEED_API_SECRET ? 'present (' + String(env.VIKGINCHOICE_LIGHTSPEED_API_SECRET).length + ' chars)' : 'MISSING',
          SHOP_ID: env.VIKGINCHOICE_LIGHTSPEED_SHOP_ID ? 'present (' + String(env.VIKGINCHOICE_LIGHTSPEED_SHOP_ID).length + ' chars)' : 'MISSING',
          META_TOKEN: env.VIKGINCHOICE_META_ACCESS_TOKEN ? 'present (' + String(env.VIKGINCHOICE_META_ACCESS_TOKEN).length + ' chars)' : 'MISSING',
          META_PIXEL: env.VIKGINCHOICE_META_PIXEL_ID ? 'present (' + String(env.VIKGINCHOICE_META_PIXEL_ID).length + ' chars)' : 'MISSING'
        },
        retoertjeKeys: envKeys.filter(k => k.includes('RETOERTJE')),
        totalSecrets: envKeys.length
      }, null, 2), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Health check endpoint
    if (path === '/' || path === '/health') {
      return new Response(JSON.stringify({
        status: 'ok',
        service: 'Lightspeed Meta CAPI Bridge',
        version: '2.0.0',
        mode: 'webhook + backup polling',
        primaryMethod: 'Lightspeed webhooks (real-time)',
        backupMethod: 'Hourly cron polling',
        shops: listShops(),
        endpoints: {
          webhook: '/webhook?shop={shopId}',
          health: '/health'
        },
        features: [
          'Real-time webhook processing (primary)',
          'Hourly backup polling (catches missed events)',
          'Multi-tenant (VikGinChoice + Retoertje)',
          'SHA-256 user data hashing',
          'Event deduplication via KV'
        ],
        timestamp: new Date().toISOString()
      }, null, 2), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Webhook endpoint (Lightspeed order.created)
    if (path === '/webhook' && request.method === 'POST') {
      return await handleWebhook(request, env);
    }

    // Pixel data endpoint (browser sends fbc/fbp)
    if (path === '/pixel-data' && request.method === 'POST') {
      return await handlePixelData(request, env);
    }

    // 404 for unknown routes
    return new Response(JSON.stringify({
      error: 'Not Found',
      message: `Unknown endpoint: ${path}`,
      availableEndpoints: {
        health: 'GET /',
        webhook: 'POST /webhook?shop=vikginchoice'
      }
    }, null, 2), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  },

  // Cron trigger for polling Lightspeed orders
  async scheduled(event, env, ctx) {
    console.log('📅 Scheduled event triggered');

    // Execute cron handler with waitUntil to allow completion
    ctx.waitUntil(handleCron(event, env));
  }
};
