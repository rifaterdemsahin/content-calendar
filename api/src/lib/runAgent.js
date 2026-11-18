const store = require('./store');
const { toMarkdown } = require('./notes');

const REPO = process.env.GITHUB_REPO || 'rifaterdemsahin/content-calendar';
const BASE = process.env.GITHUB_BASE_BRANCH || 'main';

function buildPrompt(job, notesMd) {
  return `You are the content-calendar editor agent. The repository is checked out in the current directory
(a YouTube + Skool content calendar and OKR dashboard; index.html is the live GitHub Pages dashboard,
data/ holds generated JSON/Markdown, scripts/ regenerates it).

Rules:
- Make the change the user asks for by editing content files (index.html, calendar/, okrs/, strategy/, data/, etc.).
- You may run scripts in scripts/ if the request needs fresh data.
- NEVER modify api/, .github/, or anything containing credentials.
- Keep edits minimal and consistent with existing style.
- Do NOT run git commit, git push, gh, or fly. The harness commits, opens a pull request, merges it into main
  automatically, and publishes to the live site. Your edits are the whole job.
- Finish with a 2-4 sentence plain summary of exactly what you changed (or why you changed nothing).

The user was viewing page: ${job.page}
${notesMd ? `\nThe user's saved notes (context, may be relevant):\n${notesMd}\n` : ''}
User request:
${job.message}
`;
}

const headers = () => ({ authorization: `Bearer ${process.env.GITHUB_PAT}`, accept: 'application/vnd.github+json',
  'content-type': 'application/json', 'user-agent': 'cc-agent' });

const prTitle = (job) => `chat: ${job.message.slice(0, 70)}`;

async function githubPR(branch, job, summary) {
  const res = await fetch(`https://api.github.com/repos/${REPO}/pulls`, {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.GITHUB_PAT}`, accept: 'application/vnd.github+json',
      'content-type': 'application/json', 'user-agent': 'cc-agent' },
    body: JSON.stringify({ title: `chat: ${job.message.slice(0, 70)}`, head: branch, base: BASE,
      body: `Requested from the dashboard chat.\n\n**Request:** ${job.message}\n\n**Agent summary:** ${summary}` }),
  });
  if (!res.ok) throw new Error(`PR creation failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
  const pr = await res.json();
  return { url: pr.html_url, number: pr.number };
}

// Squash-merge the pull request into main. Returns the merge commit sha.
async function githubMerge(number, job) {
  const res = await fetch(`https://api.github.com/repos/${REPO}/pulls/${number}/merge`, {
    method: 'PUT', headers: headers(),
    body: JSON.stringify({ merge_method: 'squash', commit_title: prTitle(job) }),
  });
  if (!res.ok) throw new Error(`merge failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
  return (await res.json()).sha;
}

async function runJob(id, ctx) {
  const job = await store.readJson(`jobs/${id}.json`);
  if (!job) return ctx.warn(`job ${id} missing`);
  const update = (patch) => store.writeJson(`jobs/${id}.json`, Object.assign(job, patch, { updated: new Date().toISOString() }));
  let sandbox;
  const { Daytona } = require('@daytonaio/sdk');
  const daytona = new Daytona({ apiKey: process.env.DAYTONA_API_KEY });
  try {
    await update({ status: 'running', step: 'starting sandbox' });
    sandbox = await daytona.create({ autoStopInterval: 15, labels: { app: 'cc-agent' } });

    await update({ step: 'cloning repo' });
    const branch = `chat/${id.slice(0, 8)}`;
    await sandbox.git.clone(`https://github.com/${REPO}.git`, 'repo', BASE, undefined, 'x-access-token', process.env.GITHUB_PAT);
    const sh = async (cmd, cwd, timeout = 120, env) => {
      const r = await sandbox.process.executeCommand(cmd, cwd, env, timeout);
      if (r.exitCode !== 0) throw new Error(`\`${cmd.slice(0, 60)}\` failed: ${(r.result || '').slice(-400)}`);
      return r.result || '';
    };
    await sh(`git checkout -b ${branch}`, 'repo');

    await update({ step: 'installing agent' });
    await sh('npm install --prefix ~/.cc --silent @anthropic-ai/claude-code', undefined, 300);

    const notesMd = job.includeNotes ? toMarkdown(await store.listJson('notes/')) : '';
    await sandbox.fs.uploadFile(Buffer.from(buildPrompt(job, notesMd)), 'prompt.txt');

    await update({ step: 'agent working' });
    const claude = `~/.cc/node_modules/.bin/claude -p "$(cat ~/prompt.txt)" --dangerously-skip-permissions --max-turns 25`;
    // Credential order: Claude subscription token, then API key. Each gets a clean env so a stale one can't shadow the other.
    const creds = [
      process.env.CLAUDE_CODE_OAUTH_TOKEN && { label: 'subscription', env: { CLAUDE_CODE_OAUTH_TOKEN: process.env.CLAUDE_CODE_OAUTH_TOKEN } },
      process.env.ANTHROPIC_API_KEY && { label: 'api-key', env: { ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY } },
    ].filter(Boolean);
    let out, lastErr;
    for (const c of creds) {
      try { out = await sh(claude, 'repo', 480, c.env); await update({ auth: c.label }); break; }
      catch (e) { lastErr = e; if (!/invalid api key|authenticat|oauth|unauthorized|expired|401/i.test(e.message)) throw e; }
    }
    if (out === undefined) throw lastErr || new Error('no Claude credentials configured');
    const summary = out.trim().slice(-1500);

    const changed = (await sh('git status --porcelain -- . ":!api" ":!.github"', 'repo')).trim();
    if (!changed) return await update({ status: 'done', step: 'finished', summary, changed: false });

    await update({ step: 'pushing branch' });
    await sh('git config user.name "cc-agent" && git config user.email "cc-agent@users.noreply.github.com"', 'repo');
    await sh(`git add -A -- . ":!api" ":!.github" && git commit -m ${JSON.stringify('chat: ' + job.message.slice(0, 72))}`, 'repo');
    await sh(`git push https://x-access-token:${process.env.GITHUB_PAT}@github.com/${REPO}.git ${branch}`, 'repo', 120);
    const pr = await githubPR(branch, job, summary);
    await update({ step: 'merging into main', pr: pr.url });
    const mergeSha = await githubMerge(pr.number, job);
    await update({ status: 'done', step: 'merged; publishing', summary, changed: true, branch, pr: pr.url,
      merged: true, mergeSha, mergedAt: new Date().toISOString(), published: 'pending' });
  } catch (e) {
    ctx.error(e);
    await update({ status: 'error', error: String(e.message).replace(process.env.GITHUB_PAT || '\0', '***').slice(0, 600) });
  } finally {
    if (sandbox) await sandbox.delete().catch((e) => ctx.warn(`sandbox cleanup: ${e.message}`));
  }
}

// Checks the "Deploy to Fly.io" workflow run for the merge commit. Called by the job endpoint while a
// merged job is still publishing. Persists the result on the job.
async function publishStatus(job) {
  if (!job.merged || !job.mergeSha || job.published === 'success' || job.published === 'failed') return job;
  const res = await fetch(`https://api.github.com/repos/${REPO}/actions/runs?head_sha=${job.mergeSha}&per_page=20`, { headers: headers() });
  if (!res.ok) return job;
  const run = ((await res.json()).workflow_runs || []).find((r) => r.name.startsWith('Deploy to Fly.io'));
  let next = null;
  if (!run) {
    if (Date.now() - Date.parse(job.mergedAt) > 5 * 60 * 1000) next = { published: 'failed', publishError: 'the deploy workflow did not start' };
  } else if (run.status === 'completed') {
    next = run.conclusion === 'success'
      ? { published: 'success', publishError: null, publishedAt: new Date().toISOString() }
      : { published: 'failed', publishError: `deploy ${run.conclusion}` };
  }
  if (!next) return job;
  const updated = Object.assign(job, next, { updated: new Date().toISOString(), step: next.published === 'success' ? 'live' : 'publish failed' });
  await store.writeJson(`jobs/${job.id}.json`, updated);
  return updated;
}

module.exports = { runJob, buildPrompt, publishStatus };
