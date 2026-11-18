const { app } = require('@azure/functions');
const crypto = require('node:crypto');
const { checkAuth } = require('../lib/auth');
const store = require('../lib/store');
const { runJob } = require('../lib/runAgent');

app.http('chatStart', {
  route: 'chat', methods: ['POST'], authLevel: 'anonymous',
  handler: async (req, ctx) => {
    const denied = checkAuth(req);
    if (denied) return denied;
    const body = await req.json().catch(() => ({}));
    const message = String(body.message || '').trim().slice(0, 4000);
    if (!message) return { status: 400, jsonBody: { error: 'message is required' } };
    try {
    const id = crypto.randomUUID();
    const job = { id, status: 'queued', message, page: String(body.page || '/').slice(0, 300),
      includeNotes: !!body.includeNotes, created: new Date().toISOString() };
    await store.writeJson(`jobs/${id}.json`, job);
    await store.enqueue({ id });
    return { status: 202, jsonBody: { id, status: 'queued' } };
    } catch (e) { ctx.error(e); return { status: 500, jsonBody: { error: e.message } }; }
  },
});

app.http('jobGet', {
  route: 'jobs/{id:guid}', methods: ['GET'], authLevel: 'anonymous',
  handler: async (req) => {
    const denied = checkAuth(req);
    if (denied) return denied;
    const job = await store.readJson(`jobs/${req.params.id}.json`);
    return job ? { jsonBody: job } : { status: 404, jsonBody: { error: 'not found' } };
  },
});

app.storageQueue('jobRunner', {
  queueName: 'cc-jobs',
  connection: 'AzureWebJobsStorage',
  handler: async (item, ctx) => {
    const { id } = typeof item === 'string' ? JSON.parse(item) : item;
    await runJob(id, ctx);
  },
});
