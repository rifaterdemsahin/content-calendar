// Publish status: a merged chat change is "success" only when its Fly deploy run succeeds.
const { test } = require('node:test');
const assert = require('node:assert');

process.env.GITHUB_PAT = 'test-token';
const store = require('../src/lib/store');
store.writeJson = async () => {}; // no Azure writes in tests
const { publishStatus, buildPrompt } = require('../src/lib/runAgent');

const realFetch = global.fetch;
const stubRuns = (runs) => { global.fetch = async () => ({ ok: true, json: async () => ({ workflow_runs: runs }) }); };
const base = () => ({ id: 'j1', merged: true, mergeSha: 'abc123', published: 'pending', mergedAt: new Date().toISOString() });

test.after(() => { global.fetch = realFetch; });

test('successful deploy run marks the job live', async () => {
  stubRuns([{ name: 'Deploy to Fly.io & Azure Function', status: 'completed', conclusion: 'success' }]);
  const j = await publishStatus(base());
  assert.strictEqual(j.published, 'success');
  assert.strictEqual(j.step, 'live');
});

test('failed deploy run marks the job failed with the reason', async () => {
  stubRuns([{ name: 'Deploy to Fly.io', status: 'completed', conclusion: 'failure' }]);
  const j = await publishStatus(base());
  assert.strictEqual(j.published, 'failed');
  assert.match(j.publishError, /failure/);
});

test('a deploy still running keeps the job pending', async () => {
  stubRuns([{ name: 'Deploy to Fly.io', status: 'in_progress', conclusion: null }]);
  const j = await publishStatus(base());
  assert.strictEqual(j.published, 'pending');
});

test('no deploy run for five minutes counts as failed', async () => {
  stubRuns([]);
  const old = { ...base(), mergedAt: new Date(Date.now() - 6 * 60 * 1000).toISOString() };
  const j = await publishStatus(old);
  assert.strictEqual(j.published, 'failed');
});

test('a job that was never merged is left alone', async () => {
  const j = await publishStatus({ id: 'j2', merged: false });
  assert.strictEqual(j.merged, false);
});

test('agent prompt tells the agent not to commit, push or merge', () => {
  const p = buildPrompt({ page: '/', message: 'x' }, '');
  assert.match(p, /Do NOT run git commit/);
  assert.match(p, /merges it into main\s+automatically/);
});
