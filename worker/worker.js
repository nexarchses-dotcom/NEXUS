/*************************************************************************************************
 * NEXUS Trade & Enterprise — Cloudflare Worker (CORS proxy)
 * Powered by CYRABELL
 *
 * The browser talks JSON to this Worker. The Worker is the only thing that talks to Apps Script.
 * It translates the request into the Apps Script envelope { path, method, token, query, body }
 * and posts it to the /exec URL, then returns the Apps Script JSON with CORS headers.
 *
 * Deploy: wrangler deploy. Set the two constants below.
 *************************************************************************************************/

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzvwwwIhH6BVlG1P8ZqCrCHOSDb_B1l14GCC9-G5_JtjsLOVfF1LoczyH04-mgfjDyP6w/exec';
const ALLOWED_ORIGIN  = 'https://nexarchses-dotcom.github.io';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, Idempotency-Key',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };
}

export default {
  async fetch(request) {
    // Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    try {
      const url = new URL(request.url);
      // Path after the worker root, e.g. /api/products -> api/products
      const path = url.pathname.replace(/^\/+/, '');

      // Bearer token passthrough
      const authHeader = request.headers.get('Authorization') || '';
      const token = authHeader.replace(/^Bearer\s+/i, '').trim();

      // Query params -> object (idempotencyKey also rides here)
      const query = {};
      url.searchParams.forEach((v, k) => { query[k] = v; });
      const idemKey = request.headers.get('Idempotency-Key');
      if (idemKey) query.idempotencyKey = idemKey;

      // Body for mutations
      let body = {};
      if (request.method === 'POST' || request.method === 'PUT' || request.method === 'DELETE') {
        const text = await request.text();
        if (text) { try { body = JSON.parse(text); } catch (_) { body = {}; } }
      }

      const envelope = { path, method: request.method, token, query, body };

      // Apps Script only accepts GET/POST on a web app; always POST the envelope.
      const upstream = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // avoid CORS preflight upstream
        body: JSON.stringify(envelope),
        redirect: 'follow'
      });

      const respText = await upstream.text();
      return new Response(respText, { status: 200, headers: corsHeaders() });
    } catch (err) {
      return new Response(
        JSON.stringify({ success: false, data: null,
          error: { code: 'INTERNAL', message: 'Proxy error: ' + err.message }, meta: null }),
        { status: 200, headers: corsHeaders() });
    }
  }
};
