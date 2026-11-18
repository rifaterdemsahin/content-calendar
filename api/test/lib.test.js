const test = require('node:test');
const assert = require('node:assert');
const { buildNote, toMarkdown } = require('../src/lib/notes');
const { checkAuth } = require('../src/lib/auth');
const { buildPrompt } = require('../src/lib/runAgent');

const req = (tok) => ({ headers: { get: (k) => (k === 'x-cc-token' ? tok : null) } });

test('buildNote requires text and clips fields', () => {
  assert.throws(() => buildNote({ text: '  ' }), /required/);
  const n = buildNote({ text: 'hi', page: '/', concept: 'x'.repeat(999) });
  assert.equal(n.concept.length, 300);
  assert.ok(n.id && n.created);
});

test('buildNote update keeps id/created', () => {
  const a = buildNote({ text: 'one' });
  const b = buildNote({ text: 'two' }, a);
  assert.equal(b.id, a.id); assert.equal(b.created, a.created); assert.equal(b.text, 'two');
});

test('toMarkdown groups by page and handles multiline', () => {
  const md = toMarkdown([
    { id: '1', page: '/', anchor: 'okrs', concept: 'Q1', text: 'a\nb', created: '2026-01-01', updated: '' },
    { id: '2', page: '/x', anchor: '', concept: '', text: 'c', created: '2026-01-02', updated: '' },
  ]);
  assert.match(md, /## \/\n- \*\*#okrs · “Q1”\*\* — a\n  b/);
  assert.match(md, /## \/x\n- c/);
  assert.equal(toMarkdown([]), '_No notes._\n');
});

test('checkAuth', () => {
  assert.equal(checkAuth(req('s3cret'), 's3cret'), null);
  assert.equal(checkAuth(req('nope'), 's3cret').status, 401);
  assert.equal(checkAuth(req(''), 's3cret').status, 401);
  assert.equal(checkAuth(req('x'), '').status, 503);
});

test('buildPrompt includes request, page and notes', () => {
  const p = buildPrompt({ page: '/p', message: 'move video to Friday' }, '- note');
  assert.match(p, /move video to Friday/); assert.match(p, /\/p/); assert.match(p, /- note/);
});
