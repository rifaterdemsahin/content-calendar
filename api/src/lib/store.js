const CONTAINER = process.env.NOTES_CONTAINER || 'notes';
const QUEUE = 'cc-jobs';
const conn = () => process.env.NOTES_STORAGE_CONNECTION || process.env.AzureWebJobsStorage;

let _container;
async function container() {
  if (!_container) {
    const { BlobServiceClient } = require('@azure/storage-blob');
    _container = BlobServiceClient.fromConnectionString(conn()).getContainerClient(CONTAINER);
    await _container.createIfNotExists();
  }
  return _container;
}

const CONTENT_CONTAINER = process.env.CONTENT_CONTAINER || 'content';
let _contentContainer;
async function contentContainer() {
  if (!_contentContainer) {
    _contentContainer = BlobServiceClient.fromConnectionString(conn()).getContainerClient(CONTENT_CONTAINER);
    await _contentContainer.createIfNotExists();
  }
  return _contentContainer;
}

async function readJson(name) {
  const c = await container();
  try {
    const buf = await c.getBlockBlobClient(name).downloadToBuffer();
    return JSON.parse(buf.toString('utf8'));
  } catch (e) {
    if (e.statusCode === 404) return null;
    throw e;
  }
}

async function writeJson(name, obj) {
  const c = await container();
  const data = Buffer.from(JSON.stringify(obj, null, 2));
  await c.getBlockBlobClient(name).upload(data, data.length, {
    blobHTTPHeaders: { blobContentType: 'application/json' },
  });
}

async function remove(name) {
  const c = await container();
  const r = await c.getBlockBlobClient(name).deleteIfExists();
  return r.succeeded;
}

async function listJson(prefix) {
  const c = await container();
  const items = [];
  for await (const b of c.listBlobsFlat({ prefix })) items.push(await readJson(b.name));
  return items.filter(Boolean);
}

async function enqueue(msg) {
  const { QueueClient } = require('@azure/storage-queue');
  const q = new QueueClient(conn(), QUEUE);
  await q.createIfNotExists();
  await q.sendMessage(Buffer.from(JSON.stringify(msg)).toString('base64'));
}

/** Write a plain-text blob (Markdown content) to the content container. */
async function writeText(name, text) {
  const c = await contentContainer();
  const data = Buffer.from(String(text), 'utf8');
  await c.getBlockBlobClient(name).upload(data, data.length, {
    blobHTTPHeaders: { blobContentType: 'text/markdown; charset=utf-8' },
  });
}

/** Read a plain-text blob (e.g. Markdown content) from the content container; null when missing. */
async function readText(name) {
  const c = await contentContainer();
  try {
    const buf = await c.getBlockBlobClient(name).downloadToBuffer();
    return buf.toString('utf8');
  } catch (e) {
    if (e.statusCode === 404) return null;
    throw e;
  }
}

module.exports = { readJson, writeJson, remove, listJson, enqueue, readText, writeText };
