const test = require('node:test');
const assert = require('node:assert');
const { buildNote, toMarkdown } = require('../src/lib/notes');
const { checkAuth } = require('../src/lib/auth');
const { buildPrompt } = require('../src/lib/runAgent');

const req = (tok) => ({ headers: { get: (k) => (k === 'x-cc-token' ? tok : null) } });

test('buildNote requires text and clips fields', () => {
  assert.throws(() => buildNote({ text: '  ' }), /required/);
  const n = buildNote({ text: 'hi', page: '/', concept: 'x'.repeat(999), rationale: 'reason why' });
  assert.equal(n.concept.length, 300);
  assert.equal(n.rationale, 'reason why');
  assert.ok(n.id && n.created);
});

test('buildNote update keeps id/created and updates rationale', () => {
  const a = buildNote({ text: 'one', rationale: 'old reason' });
  const b = buildNote({ text: 'two', rationale: 'new reason' }, a);
  assert.equal(b.id, a.id); assert.equal(b.created, a.created); assert.equal(b.text, 'two');
  assert.equal(b.rationale, 'new reason');
});

test('toMarkdown groups by page and handles multiline', () => {
  const md = toMarkdown([
    { id: '1', page: '/', anchor: 'okrs', concept: 'Q1', rationale: 'Q1 target alignment', text: 'a\nb', created: '2026-01-01', updated: '' },
    { id: '2', page: '/x', anchor: '', concept: '', text: 'c', created: '2026-01-02', updated: '' },
  ]);
  assert.match(md, /## \/\n- \*\*#okrs · “Q1”\*\* \[Rationale: Q1 target alignment\] — a\n  b/);
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

test('sprite parseFrames splits stdout, stderr and the exit code', () => {
  const { parseFrames } = require('../src/lib/sprite');
  // Real bytes from POST /v1/sprites/cc-agent/exec running: echo out-line; echo err-line 1>&2; exit 7
  const raw = Buffer.from('0265 7272 2d6c 696e 650a 016f 7574 2d6c 696e 650a 0307'.replace(/ /g, ''), 'hex');
  assert.deepStrictEqual(parseFrames(raw), { stdout: 'out-line\n', stderr: 'err-line\n', code: 7 });
  assert.equal(parseFrames(Buffer.from([0x01, 0x68, 0x69, 0x03, 0x00])).code, 0);
  assert.equal(parseFrames(Buffer.from([0x01, 0x68, 0x69])).code, null);
});
