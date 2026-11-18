const crypto = require('node:crypto');

function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

/** Returns null when authorized, otherwise an HTTP response init. */
function checkAuth(request, expected = process.env.CC_ADMIN_TOKEN) {
  if (!expected) return { status: 503, jsonBody: { error: 'server auth not configured' } };
  const given = request.headers.get('x-cc-token') || '';
  if (!given || !safeEqual(given, expected)) return { status: 401, jsonBody: { error: 'unauthorized' } };
  return null;
}

module.exports = { checkAuth, safeEqual };
