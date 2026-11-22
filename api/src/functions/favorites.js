const { app } = require('@azure/functions');
const { checkAuth } = require('../lib/auth');
const store = require('../lib/store');
const { FILE, sanitize, ValidationError } = require('../lib/favorites');

const guard = (fn) => async (req, ctx) => {
  const denied = checkAuth(req);
  if (denied) return denied;
  try { return await fn(req); }
  catch (e) {
    if (e instanceof ValidationError) return { status: 400, jsonBody: { error: e.message } };
    ctx.error(e);
    return { status: 500, jsonBody: { error: e.message } };
  }
};

// Current favorites: { pages: [{ url, title, at }], updated }.
app.http('favoritesGet', {
  route: 'favorites', methods: ['GET'], authLevel: 'anonymous',
  handler: guard(async () => {
    const doc = await store.readJson(FILE);
    return { jsonBody: doc || { pages: [], updated: null } };
  }),
});

// Replace the whole list: body { pages: [{ url, title }] }.
app.http('favoritesPut', {
  route: 'favorites', methods: ['PUT'], authLevel: 'anonymous',
  handler: guard(async (req) => {
    let body;
    try { body = await req.json(); } catch { throw new ValidationError('body must be JSON'); }
    const doc = sanitize(body);
    await store.writeJson(FILE, doc);
    return { jsonBody: doc };
  }),
});
