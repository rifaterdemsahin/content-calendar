const { app } = require('@azure/functions');
const { checkAuth } = require('../lib/auth');
const store = require('../lib/store');

// Sprint card content (Markdown) lives in the Azure "content" container as <card-id>.md.
const ID = /^[a-z0-9-]{1,80}$/;

app.http('contentGet', {
  route: 'content/{id}', methods: ['GET'], authLevel: 'anonymous',
  handler: async (req, ctx) => {
    const denied = checkAuth(req);
    if (denied) return denied;
    const id = req.params.id;
    if (!ID.test(id)) return { status: 400, jsonBody: { error: 'bad id' } };
    try {
      const markdown = await store.readText(`${id}.md`);
      if (markdown == null) return { status: 404, jsonBody: { error: 'no content for this item yet' } };
      return { jsonBody: { id, markdown } };
    } catch (e) {
      ctx.error(e);
      return { status: 500, jsonBody: { error: e.message } };
    }
  },
});

// Save edited Markdown back to the Azure content container.
app.http('contentPut', {
  route: 'content/{id}', methods: ['PUT'], authLevel: 'anonymous',
  handler: async (req, ctx) => {
    const denied = checkAuth(req);
    if (denied) return denied;
    const id = req.params.id;
    if (!ID.test(id)) return { status: 400, jsonBody: { error: 'bad id' } };
    let body;
    try { body = await req.json(); } catch { return { status: 400, jsonBody: { error: 'body must be JSON' } }; }
    const markdown = typeof body?.markdown === 'string' ? body.markdown : null;
    if (markdown == null) return { status: 400, jsonBody: { error: 'markdown is required' } };
    if (markdown.length > 60000) return { status: 413, jsonBody: { error: 'content too large' } };
    try {
      await store.writeText(`${id}.md`, markdown);
      return { jsonBody: { id, saved: true, savedAt: new Date().toISOString(), bytes: Buffer.byteLength(markdown) } };
    } catch (e) {
      ctx.error(e);
      return { status: 500, jsonBody: { error: e.message } };
    }
  },
});

// Channel stats written by the scheduled Fly job (scripts/cron_stats.py) to content/stats/stats.json.
app.http('statsGet', {
  route: 'stats', methods: ['GET'], authLevel: 'anonymous',
  handler: async (req, ctx) => {
    const denied = checkAuth(req);
    if (denied) return denied;
    try {
      const text = await store.readText('stats/stats.json');
      if (text == null) return { status: 404, jsonBody: { error: 'no stats yet: the scheduled job has not run' } };
      return { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-cache' }, body: text };
    } catch (e) {
      ctx.error(e);
      return { status: 500, jsonBody: { error: e.message } };
    }
  },
});

// Live status of the scheduled stats job (stats/job-status.json): current run and recent runs.
app.http('jobStatusGet', {
  route: 'job-status', methods: ['GET'], authLevel: 'anonymous',
  handler: async (req, ctx) => {
    const denied = checkAuth(req);
    if (denied) return denied;
    try {
      const text = await store.readText('stats/job-status.json');
      if (text == null) return { jsonBody: { current: null, runs: [] } };
      return { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-cache' }, body: text };
    } catch (e) {
      ctx.error(e);
      return { status: 500, jsonBody: { error: e.message } };
    }
  },
});
