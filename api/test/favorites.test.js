const { test } = require('node:test');
const assert = require('node:assert');
const { sanitize, ValidationError, MAX } = require('../src/lib/favorites');

test('keeps well-formed page entries and fills in defaults', () => {
  const doc = sanitize({ pages: [{ url: 'index.html', title: '🏠 Dashboard', at: '2026-11-22T10:00:00Z' }, { url: 'videos.html' }] });
  assert.deepStrictEqual(doc.pages.map((p) => p.url), ['index.html', 'videos.html']);
  assert.strictEqual(doc.pages[1].title, 'videos.html');
  assert.ok(!Number.isNaN(Date.parse(doc.pages[1].at)));
  assert.ok(doc.updated);
});

test('drops paths that are not plain page names, and duplicates', () => {
  const doc = sanitize({ pages: [
    { url: '../secret.html' }, { url: 'api/notes.js' }, { url: 'https://evil.example/x.html' },
    { url: 'videos.html' }, { url: 'videos.html' }, null,
  ] });
  assert.deepStrictEqual(doc.pages.map((p) => p.url), ['videos.html']);
});

test('caps titles at 120 characters and replaces a bad timestamp', () => {
  const doc = sanitize({ pages: [{ url: 'a-b.html', title: 'x'.repeat(500), at: 'not a date' }] });
  assert.strictEqual(doc.pages[0].title.length, 120);
  assert.ok(!Number.isNaN(Date.parse(doc.pages[0].at)));
});

test('rejects a missing pages array and too many favorites', () => {
  assert.throws(() => sanitize({}), ValidationError);
  assert.throws(() => sanitize({ pages: 'index.html' }), ValidationError);
  const many = Array.from({ length: MAX + 1 }, (_, i) => ({ url: `p${i}.html` }));
  assert.throws(() => sanitize({ pages: many }), ValidationError);
});
