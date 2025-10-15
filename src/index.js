/**
 * Lightspeed → Meta Conversions API Bridge
 * Multi-Tenant Cloudflare Worker
 *
 * Supports: VikGinChoice, Retoertje
 */

import { handleWebhook } from './handlers/webhook.js';
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

    // Health check endpoint
    if (path === '/' || path === '/health') {
      return new Response(JSON.stringify({
        status: 'ok',
        service: 'Lightspeed Meta CAPI Bridge',
        version: '1.0.0',
        shops: listShops(),
        endpoints: {
          webhook: '/webhook?shop={shopId}',
          health: '/health'
        },
        timestamp: new Date().toISOString()
      }, null, 2), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Webhook endpoint
    if (path === '/webhook' && request.method === 'POST') {
      return await handleWebhook(request, env);
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
  }
};
