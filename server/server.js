const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { sign, verify, parseCookies, checkIdToken } = require('./session');

const env = process.env;
const PORT = env.PORT || 8080;
const SITE = path.resolve(env.SITE_DIR || '/site');
const PUBLIC_URL = (env.PUBLIC_URL || '').replace(/\/$/, '');
const AUTH = `https://login.microsoftonline.com/${env.TENANT_ID}/oauth2/v2.0`;
const REDIRECT = `${PUBLIC_URL}/auth/callback`;
const UPSTREAM = (env.API_UPSTREAM || '').replace(/\/$/, '');
const API_ALLOWED = /^\/api\/(notes(\/[0-9a-f-]{36})?|export|chat|jobs\/[0-9a-f-]{36}|content\/[a-z0-9-]{1,80})$/;
const BLOCKED = /^\/(api|server|\.git|\.github|node_modules|fly\.toml|Dockerfile)(\/|$)|\/\./;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.md': 'text/markdown; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.txt': 'text/plain' };

const secureCookie = (name, val, maxAge) =>
  `${name}=${encodeURIComponent(val)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
const session = (req) => verify(env.SESSION_SECRET, parseCookies(req.headers.cookie).cc_session);
const json = (res, code, obj, headers = {}) => { res.writeHead(code, { 'content-type': 'application/json', ...headers }); res.end(JSON.stringify(obj)); };

async function handleLogin(req, res) {
  const state = crypto.randomBytes(16).toString('base64url'), nonce = crypto.randomBytes(16).toString('base64url');
  const url = new URL(`${AUTH}/authorize`);
  Object.entries({ client_id: env.CLIENT_ID, response_type: 'code', redirect_uri: REDIRECT, response_mode: 'query',
    scope: 'openid profile email', state, nonce, prompt: 'select_account', login_hint: env.ALLOWED_EMAIL }).forEach(([k, v]) => url.searchParams.set(k, v));
  res.writeHead(302, { location: url, 'set-cookie': secureCookie('cc_oidc', sign(env.SESSION_SECRET, { state, nonce }, 600), 600) });
  res.end();
}

async function handleCallback(req, res, q) {
  const flow = verify(env.SESSION_SECRET, parseCookies(req.headers.cookie).cc_oidc);
  if (!flow || !q.get('code') || q.get('state') !== flow.state) return json(res, 400, { error: 'invalid sign-in state' });
  const r = await fetch(`${AUTH}/token`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: env.CLIENT_ID, client_secret: env.CLIENT_SECRET, grant_type: 'authorization_code',
      code: q.get('code'), redirect_uri: REDIRECT }) });
  const tok = await r.json();
  if (!tok.id_token) return json(res, 401, { error: 'sign-in failed', detail: tok.error });
  let email;
  try { email = checkIdToken(tok.id_token, { tenant: env.TENANT_ID, clientId: env.CLIENT_ID, nonce: flow.nonce, allowedEmail: env.ALLOWED_EMAIL }); }
  catch (e) { return json(res, 403, { error: `access denied: ${e.message}` }); }
  res.writeHead(302, { location: '/', 'set-cookie': [secureCookie('cc_session', sign(env.SESSION_SECRET, { email }, 43200), 43200), secureCookie('cc_oidc', '', 0)] });
  res.end();
}

async function handleApi(req, res, url) {
  if (!session(req)) return json(res, 401, { error: 'unauthorized', login: '/auth/login' });
  if (!API_ALLOWED.test(url.pathname)) return json(res, 404, { error: 'not found' });
  if (req.method !== 'GET' && req.headers.origin && req.headers.origin !== PUBLIC_URL) return json(res, 403, { error: 'bad origin' });
  const chunks = []; for await (const c of req) { chunks.push(c); if (chunks.reduce((n, b) => n + b.length, 0) > 64_000) return json(res, 413, { error: 'too large' }); }
  const up = await fetch(UPSTREAM + url.pathname.slice(4) + url.search, { method: req.method,
    headers: { 'x-cc-token': env.CC_ADMIN_TOKEN, 'content-type': req.headers['content-type'] || 'application/json' },
    body: ['GET', 'HEAD', 'DELETE'].includes(req.method) ? undefined : Buffer.concat(chunks) });
  res.writeHead(up.status, { 'content-type': up.headers.get('content-type') || 'application/json' });
  res.end(Buffer.from(await up.arrayBuffer()));
}

function serveStatic(req, res, url) {
  let p = decodeURIComponent(url.pathname); if (p.endsWith('/')) p += 'index.html';
  const file = path.resolve(SITE, '.' + p);
  if (!file.startsWith(SITE + path.sep) || BLOCKED.test(p)) { res.writeHead(404); return res.end('Not found'); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache' });
    res.end(data);
  });
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, PUBLIC_URL || 'http://localhost');
  try {
    if (url.pathname === '/healthz') return json(res, 200, { ok: true });
    if (url.pathname === '/auth/login') return await handleLogin(req, res);
    if (url.pathname === '/auth/callback') return await handleCallback(req, res, url.searchParams);
    if (url.pathname === '/auth/me') { const s = session(req); return json(res, 200, { signedIn: !!s, email: s?.email || null }); }
    if (url.pathname === '/auth/logout') { res.writeHead(302, { location: '/', 'set-cookie': secureCookie('cc_session', '', 0) }); return res.end(); }
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
    return serveStatic(req, res, url);
  } catch (e) { console.error(e); if (!res.headersSent) json(res, 500, { error: 'server error' }); }
}).listen(PORT, () => console.log(`listening on ${PORT}`));
