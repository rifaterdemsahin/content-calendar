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
  const { sha } = await res.json();
  // Trunk-based: main stays the only branch, so the squash-merged chat branch is deleted right away.
  const branch = `chat/${job.id.slice(0, 8)}`;
  await fetch(`https://api.github.com/repos/${REPO}/git/refs/heads/${branch}`, { method: 'DELETE', headers: headers() }).catch(() => {});
  return sha;
}

const AUTH_ERR = /invalid api key|authenticat|oauth|unauthorized|expired|401/i;
const claudeCreds = () => [
  process.env.CLAUDE_CODE_OAUTH_TOKEN && { label: 'subscription', env: { CLAUDE_CODE_OAUTH_TOKEN: process.env.CLAUDE_CODE_OAUTH_TOKEN } },
  process.env.ANTHROPIC_API_KEY && { label: 'api-key', env: { ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY } },
].filter(Boolean);

// Fly.io Sprite runner: a persistent sandbox that already has the repo and Claude Code, so jobs start
// in seconds. Each job works in its own git worktree, and the worktree is removed afterwards.
async function runJobSprite(job, update, ctx) {
  const sprite = require('./sprite');
  let stepName = 'waking sprite';
  const retry = (n, max) => update({ step: `${stepName} (retry ${n}/${max - 1})` });
  let started = false; // true once the agent has begun: from then on, never fall back to another runner
  const id = job.id; const branch = `chat/${id.slice(0, 8)}`;
  const base = { REPO, BASE, BRANCH: branch, JOB: id, GH: process.env.GITHUB_PAT,
    HOME_CC: '/home/sprite/cc', WT: `/home/sprite/cc/jobs/${id}`, PATH_PREFIX: '/home/sprite/.local/bin' };
  const pre = 'export PATH="$PATH_PREFIX:$PATH"; mkdir -p "$HOME_CC/jobs"; R="$HOME_CC/repo"';
  try {
    await update({ status: 'running', step: 'waking sprite', runner: `sprite:${sprite.spriteName()}` });
    await sprite.ensureSprite(retry);

    stepName = 'syncing repo';
    await update({ step: stepName });
    await sprite.run(`${pre}
if [ ! -d "$R/.git" ]; then git clone -q "https://x-access-token:$GH@github.com/$REPO.git" "$R"; git -C "$R" remote set-url origin "https://github.com/$REPO.git"; fi
git -C "$R" fetch -q "https://x-access-token:$GH@github.com/$REPO.git" "+refs/heads/$BASE:refs/remotes/origin/$BASE"
git -C "$R" worktree prune
git -C "$R" worktree add -q -b "$BRANCH" "$WT" "origin/$BASE"`, base, retry);

    const notesMd = job.includeNotes ? toMarkdown(await store.listJson('notes/')) : '';
    const promptB64 = Buffer.from(buildPrompt(job, notesMd)).toString('base64');

    stepName = 'agent working'; started = true;
    await update({ step: stepName });
    let out, lastErr;
    for (const c of claudeCreds()) {
      try {
        // Claude prints only at the end, so a heartbeat on stderr keeps the HTTP stream alive.
        out = await sprite.run(`${pre}
echo "$PROMPT_B64" | base64 -d > "$HOME_CC/prompt-$JOB.txt"
cd "$WT"
( timeout 480 claude -p "$(cat "$HOME_CC/prompt-$JOB.txt")" --dangerously-skip-permissions --max-turns 25 > "$HOME_CC/out-$JOB.txt" 2>&1; echo $? > "$HOME_CC/rc-$JOB" ) &
pid=$!
while kill -0 $pid 2>/dev/null; do printf . 1>&2; sleep 20; done
cat "$HOME_CC/out-$JOB.txt"; exit "$(cat "$HOME_CC/rc-$JOB")"`, { ...base, ...c.env, PROMPT_B64: promptB64 }, retry);
        await update({ auth: c.label }); break;
      } catch (e) { lastErr = e; if (!AUTH_ERR.test(e.message)) throw e; }
    }
    if (out === undefined) throw lastErr || new Error('no Claude credentials configured');
    const summary = out.trim().slice(-1500);

    stepName = 'pushing branch';
    await update({ step: stepName });
    const pushed = await sprite.run(`${pre}
cd "$WT"
if [ -z "$(git status --porcelain -- . ':!api' ':!.github')" ]; then echo NOCHANGE; exit 0; fi
git add -A -- . ':!api' ':!.github'
git -c user.name=cc-agent -c user.email=cc-agent@users.noreply.github.com commit -q -m "$MSG"
git push -q "https://x-access-token:$GH@github.com/$REPO.git" "$BRANCH"
echo PUSHED`, { ...base, MSG: 'chat: ' + job.message.slice(0, 72) }, retry);
    if (/NOCHANGE/.test(pushed)) return await update({ status: 'done', step: 'finished', summary, changed: false });

    const pr = await githubPR(branch, job, summary);
    await update({ step: 'merging into main', pr: pr.url });
    const mergeSha = await githubMerge(pr.number, job);
    await update({ status: 'done', step: 'merged; publishing', summary, changed: true, branch, pr: pr.url,
      merged: true, mergeSha, mergedAt: new Date().toISOString(), published: 'pending' });
  } catch (e) {
    // The sprite never came up and no work started: hand the job to the Daytona runner instead of failing.
    if (!started && e instanceof sprite.SpriteUnavailable && process.env.DAYTONA_API_KEY) {
      ctx.warn(`sprite unavailable, falling back to Daytona: ${e.message}`);
      await update({ step: 'sprite unavailable, switching to Daytona', runner: 'daytona (fallback)' });
      return { fallback: true };
    }
    ctx.error(e);
    await update({ status: 'error', error: String(e.message).replace(process.env.GITHUB_PAT || '\0', '***').slice(0, 600) });
  } finally {
    if (started || !process.env.DAYTONA_API_KEY) await sprite.run(`${pre}
git -C "$R" worktree remove --force "$WT" 2>/dev/null || true
git -C "$R" branch -D "$BRANCH" 2>/dev/null || true
rm -f "$HOME_CC/prompt-$JOB.txt" "$HOME_CC/out-$JOB.txt" "$HOME_CC/rc-$JOB"`, base).catch((e) => ctx.warn(`sprite cleanup: ${e.message}`));
  }
}

async function runJob(id, ctx) {
  const job = await store.readJson(`jobs/${id}.json`);
  if (!job) return ctx.warn(`job ${id} missing`);
  const update = (patch) => store.writeJson(`jobs/${id}.json`, Object.assign(job, patch, { updated: new Date().toISOString() }));
  if (process.env.SPRITES_TOKEN) {
    const r = await runJobSprite(job, update, ctx);
    if (!r || !r.fallback) return;
  }
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
