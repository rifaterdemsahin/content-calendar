const { app } = require('@azure/functions');
const { checkAuth } = require('../lib/auth');
const store = require('../lib/store');
const { buildNote, toMarkdown } = require('../lib/notes');

const guard = (fn) => async (req, ctx) => {
  const denied = checkAuth(req);
  if (denied) return denied;
  try { return await fn(req, ctx); }
  catch (e) { ctx.error(e); return { status: e.message.includes('required') ? 400 : 500, jsonBody: { error: e.message } }; }
};

app.http('notesList', {
  route: 'notes', methods: ['GET'], authLevel: 'anonymous',
  handler: guard(async (req) => {
    const page = req.query.get('page');
    let notes = await store.listJson('notes/');
    if (page) notes = notes.filter((n) => n.page === page);
    return { jsonBody: notes.sort((a, b) => b.updated.localeCompare(a.updated)) };
  }),
});

app.http('notesCreate', {
  route: 'notes', methods: ['POST'], authLevel: 'anonymous',
  handler: guard(async (req) => {
    const note = buildNote(await req.json());
    await store.writeJson(`notes/${note.id}.json`, note);
    return { status: 201, jsonBody: note };
  }),
});

app.http('notesUpdate', {
  route: 'notes/{id:guid}', methods: ['PUT'], authLevel: 'anonymous',
  handler: guard(async (req) => {
    const existing = await store.readJson(`notes/${req.params.id}.json`);
    if (!existing) return { status: 404, jsonBody: { error: 'not found' } };
    const note = buildNote(await req.json(), existing);
    await store.writeJson(`notes/${note.id}.json`, note);
    return { jsonBody: note };
  }),
});

app.http('notesDelete', {
  route: 'notes/{id:guid}', methods: ['DELETE'], authLevel: 'anonymous',
  handler: guard(async (req) => {
    const ok = await store.remove(`notes/${req.params.id}.json`);
    return ok ? { status: 204 } : { status: 404, jsonBody: { error: 'not found' } };
  }),
});

app.http('notesExport', {
  route: 'export', methods: ['GET'], authLevel: 'anonymous',
  handler: guard(async (req) => {
    const page = req.query.get('page');
    let notes = await store.listJson('notes/');
    if (page) notes = notes.filter((n) => n.page === page);
    if (req.query.get('format') === 'json') return { jsonBody: notes };
    return { headers: { 'content-type': 'text/markdown; charset=utf-8' }, body: toMarkdown(notes) };
  }),
});
