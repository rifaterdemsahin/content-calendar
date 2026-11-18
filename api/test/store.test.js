// Guards against the "BlobServiceClient is not defined" bug: each storage helper must reach the
// network layer, so any failure here must be a connection error, never a ReferenceError.
const { test } = require('node:test');
const assert = require('node:assert');

process.env.AzureWebJobsStorage = 'DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=AAAA;BlobEndpoint=http://127.0.0.1:1/devstoreaccount1;';

const store = require('../src/lib/store');

for (const [name, call] of [
  ['readText', () => store.readText('x.md')],
  ['writeText', () => store.writeText('x.md', 'hello')],
  ['readJson', () => store.readJson('x.json')],
]) {
  test(`${name} reaches the storage client (no ReferenceError)`, async () => {
    await assert.rejects(call(), (err) => {
      assert.notStrictEqual(err.name, 'ReferenceError', `${name} threw: ${err.message}`);
      return true;
    });
  });
}
