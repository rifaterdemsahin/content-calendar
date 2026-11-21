// Runs the chat agent's shell work inside a persistent Fly.io Sprite (https://sprites.dev).
// The sprite keeps the repo clone and Claude Code installed between jobs, so a job starts in seconds
// instead of building a fresh sandbox. Each job gets its own git worktree, so jobs never collide.
//
// HTTP exec (POST /v1/sprites/{name}/exec) streams binary frames: 0x01 + stdout bytes, 0x02 + stderr
// bytes, and finally 0x03 + one byte exit code. Secrets travel in the request body (stdin), never in the URL.

const API = process.env.SPRITES_API || 'https://api.sprites.dev';
const NAME = () => process.env.SPRITE_NAME || 'cc-agent';
const auth = () => ({ authorization: `Bearer ${process.env.SPRITES_TOKEN}` });

/** Decode an HTTP exec response body into { stdout, stderr, code }. */
function parseFrames(buf) {
  const bytes = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
  let code = null; let end = bytes.length;
  if (end >= 2 && bytes[end - 2] === 0x03) { code = bytes[end - 1]; end -= 2; }
  // Frames have no length prefix: a new frame starts with a 0x01/0x02 type byte. Text output never
  // contains these control bytes, so splitting on them is safe for the agent's logs.
  const out = []; const err = []; let cur = out;
  for (let i = 0; i < end; i++) {
    const b = bytes[i];
    if (b === 0x01) { cur = out; continue; }
    if (b === 0x02) { cur = err; continue; }
    cur.push(b);
  }
  return { stdout: Buffer.from(out).toString('utf8'), stderr: Buffer.from(err).toString('utf8'), code };
}

/** Make sure the sprite exists (create it on first use). */
async function ensureSprite() {
  const r = await fetch(`${API}/v1/sprites/${NAME()}`, { headers: auth() });
  if (r.ok) return;
  if (r.status !== 404) throw new Error(`sprite lookup failed: HTTP ${r.status}`);
  const c = await fetch(`${API}/v1/sprites`, { method: 'POST', headers: { ...auth(), 'content-type': 'application/json' }, body: JSON.stringify({ name: NAME() }) });
  if (!c.ok) throw new Error(`sprite create failed: HTTP ${c.status} ${(await c.text()).slice(0, 200)}`);
}

/**
 * Run a bash script in the sprite. `env` values are exported at the top of the script (sent in the
 * request body). Throws with the output tail when the script exits non-zero.
 */
async function run(script, env = {}) {
  const exports = Object.entries(env).filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `export ${k}=${JSON.stringify(String(v))}`).join('\n');
  const body = `set -eo pipefail\n${exports}\n${script}\n`;
  const r = await fetch(`${API}/v1/sprites/${NAME()}/exec?cmd=bash&cmd=-s&stdin=true`, {
    method: 'POST', headers: { ...auth(), 'content-type': 'application/octet-stream' }, body,
  });
  if (!r.ok) throw new Error(`sprite exec HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const res = parseFrames(Buffer.from(await r.arrayBuffer()));
  if (res.code !== 0) throw new Error(`sprite step failed (exit ${res.code}): ${(res.stderr || res.stdout).trim().slice(-400)}`);
  return res.stdout;
}

module.exports = { parseFrames, ensureSprite, run, spriteName: NAME };
