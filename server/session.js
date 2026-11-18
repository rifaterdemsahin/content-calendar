const crypto = require('node:crypto');

const b64u = (b) => Buffer.from(b).toString('base64url');
const hmac = (secret, data) => crypto.createHmac('sha256', secret).update(data).digest('base64url');

/** Sign a JSON payload into "<payload>.<mac>" with an expiry (seconds). */
function sign(secret, payload, ttlSec) {
  const body = b64u(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + ttlSec }));
  return `${body}.${hmac(secret, body)}`;
}

function verify(secret, token) {
  if (!token || !token.includes('.')) return null;
  const [body, mac] = token.split('.');
  const good = hmac(secret, body);
  if (mac.length !== good.length || !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(good))) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString());
    return p.exp > Date.now() / 1000 ? p : null;
  } catch { return null; }
}

function parseCookies(header = '') {
  return Object.fromEntries(header.split(';').map((c) => c.trim()).filter(Boolean).map((c) => {
    const i = c.indexOf('='); return [c.slice(0, i), decodeURIComponent(c.slice(i + 1))];
  }));
}

/** Validate claims of an id_token received directly from the token endpoint over TLS. */
function checkIdToken(idToken, { tenant, clientId, nonce, allowedEmail }) {
  const claims = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64url').toString());
  if (claims.aud !== clientId) throw new Error('bad audience');
  if (claims.tid !== tenant) throw new Error('wrong tenant');
  if (claims.iss !== `https://login.microsoftonline.com/${tenant}/v2.0`) throw new Error('bad issuer');
  if (claims.nonce !== nonce) throw new Error('bad nonce');
  if (claims.exp * 1000 < Date.now()) throw new Error('expired');
  const email = String(claims.email || claims.preferred_username || '').toLowerCase();
  if (email !== allowedEmail.toLowerCase()) throw new Error('account not allowed');
  return email;
}

module.exports = { sign, verify, parseCookies, checkIdToken };
