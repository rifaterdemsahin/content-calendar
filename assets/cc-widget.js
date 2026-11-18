/* Notes + Claude chat widget. Include on any page:
 *   <script src="assets/cc-widget.js" data-api="https://<function-app>.azurewebsites.net/api"></script>
 * Alt/Option-click any element to attach a note to that concept. */
(() => {
  const API = (document.currentScript?.dataset.api || '/api').replace(/\/$/, '');
  const PAGE = location.pathname;

  // Auth is a Microsoft sign-in handled by the server (/auth/*); the session cookie is HttpOnly.
  async function api(path, opts = {}) {
    const res = await fetch(API + path, { ...opts, credentials: 'same-origin', headers: { 'content-type': 'application/json', ...(opts.headers || {}) } });
    if (res.status === 401) { gate(); throw new Error('Please sign in with Microsoft'); }
    if (!res.ok && res.status !== 204) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
    return res;
  }

  // ---- UI ---------------------------------------------------------------
  const css = `
  #ccw *{box-sizing:border-box;font-family:system-ui,sans-serif}
  #ccw-btn{position:fixed;right:18px;bottom:18px;z-index:99998;width:52px;height:52px;border-radius:50%;border:0;background:#6366f1;color:#fff;font-size:22px;cursor:pointer;box-shadow:0 4px 16px #0008}
  #ccw-panel{position:fixed;right:18px;bottom:80px;z-index:99999;width:min(400px,calc(100vw - 36px));height:min(560px,calc(100vh - 110px));display:none;flex-direction:column;background:#0f172a;color:#e2e8f0;border:1px solid #334155;border-radius:14px;box-shadow:0 10px 40px #000a;overflow:hidden}
  #ccw-panel.open{display:flex}
  #ccw .tabs{display:flex;border-bottom:1px solid #334155}
  #ccw .tabs button{flex:1;padding:10px;background:none;border:0;color:#94a3b8;cursor:pointer;font-size:14px}
  #ccw .tabs button.on{color:#fff;border-bottom:2px solid #6366f1}
  #ccw .tabs button.max-btn{flex:0 0 42px;font-size:16px}
  #ccw-panel.max{right:12px;bottom:12px;width:calc(100vw - 24px);height:calc(100vh - 24px)}
  #ccw .body{flex:1;overflow:auto;padding:12px;display:flex;flex-direction:column;gap:8px}
  #ccw textarea,#ccw input[type=text]{width:100%;background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-radius:8px;padding:8px;font-size:14px}
  #ccw .row{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
  #ccw .btn{background:#6366f1;color:#fff;border:0;border-radius:8px;padding:7px 12px;cursor:pointer;font-size:13px}
  #ccw .btn.alt{background:#334155}
  #ccw .btn.del{background:#7f1d1d}
  #ccw .card{background:#1e293b;border:1px solid #334155;border-radius:8px;padding:8px;font-size:13px;white-space:pre-wrap}
  #ccw .meta{color:#94a3b8;font-size:11px;margin-bottom:4px}
  #ccw .msg.user{align-self:flex-end;background:#4338ca}
  #ccw .hint{color:#94a3b8;font-size:12px}
  #ccw a{color:#a5b4fc}
  .ccw-hl{outline:2px dashed #6366f1!important;outline-offset:2px}
  `;
  const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);

  const el = (tag, props = {}, ...kids) => {
    const n = Object.assign(document.createElement(tag), props);
    kids.flat().forEach((k) => n.append(k));
    return n;
  };

  const root = el('div', { id: 'ccw' });
  const btn = el('button', { id: 'ccw-btn', title: 'Notes & chat (Alt-click anything to add a note)', textContent: '📝' });
  const panel = el('div', { id: 'ccw-panel' });
  const tabNotes = el('button', { textContent: '📝 Notes', className: 'on' });
  const tabChat = el('button', { textContent: '🤖 Chat' });
  const notesBody = el('div', { className: 'body' });
  const chatBody = el('div', { className: 'body', style: 'display:none' });
  // Maximize toggles the panel to near full-screen for notes and chat; title flips with state.
  const maxBtn = el('button', { className: 'max-btn', title: 'Maximize', textContent: '⤢', 'aria-label': 'Maximize' });
  maxBtn.onclick = () => {
    const on = panel.classList.toggle('max');
    maxBtn.textContent = on ? '⤡' : '⤢';
    maxBtn.title = on ? 'Restore' : 'Maximize';
    maxBtn.setAttribute('aria-label', maxBtn.title);
  };
  panel.append(el('div', { className: 'tabs' }, tabNotes, tabChat, maxBtn), notesBody, chatBody);
  root.append(btn, panel); document.body.appendChild(root);

  const show = (which) => {
    tabNotes.classList.toggle('on', which === 'notes'); tabChat.classList.toggle('on', which === 'chat');
    notesBody.style.display = which === 'notes' ? 'flex' : 'none'; chatBody.style.display = which === 'chat' ? 'flex' : 'none';
  };
  tabNotes.onclick = () => show('notes'); tabChat.onclick = () => show('chat');
  btn.onclick = () => panel.classList.toggle('open');

  // Sign-in gate: shows a Microsoft sign-in card instead of the tabs when there is no session.
  const loginCard = el('div', { className: 'body', style: 'display:none;align-items:center;justify-content:center;text-align:center' },
    el('div', { className: 'hint', textContent: 'Notes and chat are private. Sign in with your Microsoft account to continue.' }),
    el('a', { className: 'btn', href: '/auth/login', textContent: 'Sign in with Microsoft', style: 'text-decoration:none;color:#fff' }));
  panel.insertBefore(loginCard, notesBody);
  async function gate() {
    let me = { signedIn: false };
    try { me = await (await fetch('/auth/me', { credentials: 'same-origin' })).json(); } catch { /* server without auth (e.g. static host) */ }
    loginCard.style.display = me.signedIn ? 'none' : 'flex';
    panel.querySelector('.tabs').style.display = me.signedIn ? 'flex' : 'none';
    if (me.signedIn) show(tabChat.classList.contains('on') ? 'chat' : 'notes'); else { notesBody.style.display = 'none'; chatBody.style.display = 'none'; }
    return me.signedIn;
  }

  // ---- Notes ------------------------------------------------------------
  let draftCtx = { anchor: '', concept: '' };
  // Dropdown of content on this page (sprint items + sections). Picking one sets the note's anchor.
  const pick = el('select', { style: 'width:100%;background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-radius:8px;padding:8px;font-size:14px' });
  const fillPicker = () => {
    const groups = [];
    const sprint = [...document.querySelectorAll('[id*="-item-"]')].map((item) => {
      const week = item.closest('.p-6')?.querySelector('h3')?.textContent.trim() || '';
      const day = item.querySelector('span')?.textContent.trim() || '';
      const title = item.querySelector('.font-bold')?.textContent.trim() || item.id;
      return { id: item.id, label: [week, day, title].filter(Boolean).join(' · ') };
    });
    const sections = [...document.querySelectorAll('section[id]')].map((s) => ({
      id: s.id, label: s.querySelector('h2')?.textContent.trim() || s.id,
    }));
    if (sprint.length) groups.push(['Sprint items', sprint]);
    if (sections.length) groups.push(['Sections', sections]);
    pick.replaceChildren(el('option', { value: '', textContent: '— pick content to attach this note to —' }));
    for (const [name, items] of groups) {
      const og = el('optgroup', { label: name });
      for (const it of items) og.append(el('option', { value: it.id, textContent: it.label }));
      pick.append(og);
    }
    if (!groups.length) pick.style.display = 'none';
  };
  fillPicker();
  pick.onchange = () => {
    const o = pick.selectedOptions[0];
    if (!o || !o.value) { draftCtx = { anchor: '', concept: '' }; return; }
    draftCtx = { anchor: o.value, concept: o.textContent };
    concept.value = o.textContent;
  };
  const concept = el('input', { type: 'text', placeholder: 'Concept (auto-filled from where you clicked)' });
  const noteText = el('textarea', { rows: 4, placeholder: 'Write a note…' });
  const status = el('div', { className: 'hint' });
  const list = el('div', { style: 'display:flex;flex-direction:column;gap:8px' });
  const flash = (t) => { status.textContent = t; setTimeout(() => { if (status.textContent === t) status.textContent = ''; }, 3500); };

  const save = el('button', { className: 'btn', textContent: 'Save note' });
  const copyPage = el('button', { className: 'btn alt', textContent: 'Copy this page' });
  const copyAll = el('button', { className: 'btn alt', textContent: 'Copy ALL notes' });
  notesBody.append(pick, concept, noteText, el('div', { className: 'row' }, save, copyPage, copyAll), status, list);

  async function copyExport(pageOnly) {
    try {
      const md = await (await api(`/export${pageOnly ? `?page=${encodeURIComponent(PAGE)}` : ''}`)).text();
      await navigator.clipboard.writeText(md);
      flash(`Copied ${md.split('\n- ').length - 1} note(s) as Markdown`);
    } catch (e) { flash(e.message); }
  }
  copyPage.onclick = () => copyExport(true); copyAll.onclick = () => copyExport(false);

  save.onclick = async () => {
    try {
      await api('/notes', { method: 'POST', body: JSON.stringify({ page: PAGE, anchor: draftCtx.anchor, concept: concept.value, text: noteText.value }) });
      noteText.value = ''; concept.value = ''; pick.value = ''; draftCtx = { anchor: '', concept: '' }; flash('Saved'); loadNotes();
    } catch (e) { flash(e.message); }
  };

  async function loadNotes() {
    try {
      const notes = await (await api(`/notes?page=${encodeURIComponent(PAGE)}`)).json();
      list.replaceChildren(...(notes.length ? notes.map(noteCard) : [el('div', { className: 'hint', textContent: 'No notes on this page yet. Alt-click any element to add one.' })]));
    } catch (e) { list.replaceChildren(el('div', { className: 'hint', textContent: e.message })); }
  }

  function noteCard(n) {
    const ta = el('textarea', { rows: 3, value: n.text, style: 'display:none' });
    const body = el('div', { textContent: n.text });
    const edit = el('button', { className: 'btn alt', textContent: 'Edit' });
    const del = el('button', { className: 'btn del', textContent: 'Delete' });
    const go = n.anchor && document.getElementById(n.anchor) ? el('button', { className: 'btn alt', textContent: 'Go to', onclick: () => document.getElementById(n.anchor).scrollIntoView({ behavior: 'smooth' }) }) : '';
    edit.onclick = async () => {
      if (ta.style.display === 'none') { ta.style.display = 'block'; body.style.display = 'none'; edit.textContent = 'Save'; return; }
      try { await api(`/notes/${n.id}`, { method: 'PUT', body: JSON.stringify({ text: ta.value }) }); loadNotes(); } catch (e) { flash(e.message); }
    };
    del.onclick = async () => { if (confirm('Delete this note?')) { try { await api(`/notes/${n.id}`, { method: 'DELETE' }); loadNotes(); } catch (e) { flash(e.message); } } };
    return el('div', { className: 'card' },
      el('div', { className: 'meta', textContent: [n.anchor && `#${n.anchor}`, n.concept].filter(Boolean).join(' · ') || 'page note' }),
      body, ta, el('div', { className: 'row', style: 'margin-top:6px' }, edit, del, go));
  }

  // Alt/Option-click anywhere → note about that concept.
  let hl;
  document.addEventListener('click', (e) => {
    if (!e.altKey || root.contains(e.target)) return;
    e.preventDefault(); e.stopPropagation();
    const target = e.target;
    const sel = String(window.getSelection() || '').trim();
    const section = target.closest('[id]');
    const heading = (section?.querySelector('h1,h2,h3') || target.closest('h1,h2,h3'))?.textContent.trim() || '';
    const snippet = (sel || target.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 120);
    draftCtx = { anchor: section?.id || '', concept: snippet || heading };
    concept.value = [heading && heading !== snippet ? heading : '', snippet].filter(Boolean).join(' › ');
    pick.value = [...pick.options].some((o) => o.value === draftCtx.anchor) ? draftCtx.anchor : '';
    hl?.classList.remove('ccw-hl'); hl = target; target.classList.add('ccw-hl'); setTimeout(() => target.classList.remove('ccw-hl'), 2500);
    panel.classList.add('open'); show('notes'); noteText.focus(); loadNotes();
  }, true);

  // ---- Chat -------------------------------------------------------------
  const log = el('div', { style: 'display:flex;flex-direction:column;gap:8px;flex:1' });
  const input = el('textarea', { rows: 3, placeholder: 'e.g. "Move the Wednesday video to Friday and add a Shorts slot"' });
  const useNotes = el('input', { type: 'checkbox' });
  const send = el('button', { className: 'btn', textContent: 'Send' });
  chatBody.append(
    el('div', { className: 'hint', textContent: 'Claude edits the calendar in a Daytona sandbox and opens a pull request — merge it to publish.' }),
    log, input, el('div', { className: 'row' }, send, el('label', { className: 'hint' }, useNotes, ' include my notes as context')));

  // The chat log survives refreshes: it is kept in localStorage (per browser), and any job that was
  // still running when the page closed is polled again on load. Storage failures are ignored.
  const CHAT_KEY = 'cc-chat-log-v1';
  let chatLog = [];
  try { chatLog = JSON.parse(localStorage.getItem(CHAT_KEY) || '[]'); } catch { chatLog = []; }
  const saveChat = () => { try { localStorage.setItem(CHAT_KEY, JSON.stringify(chatLog.slice(-60))); } catch { /* private mode / quota */ } };

  function paintChat() {
    log.replaceChildren(...chatLog.map((m) => {
      const n = el('div', { className: `card msg ${m.role === 'user' ? 'user' : ''}`, textContent: m.text });
      if (m.pr) n.append('\n\n', el('a', { href: m.pr, target: '_blank', rel: 'noopener', textContent: 'Review & merge pull request →' }));
      return n;
    }));
    log.lastChild?.scrollIntoView();
  }

  async function trackJob(m) {
    try {
      for (let i = 0; i < 120; i++) {
        await new Promise((r) => setTimeout(r, 4000));
        const job = await (await api(`/jobs/${m.jobId}`)).json();
        m.text = `${job.status}${job.step ? ` — ${job.step}` : ''}`;
        if (job.status === 'error') { m.text = `Error: ${job.error}`; m.pending = false; break; }
        if (job.status === 'done') {
          m.text = job.summary || 'Done.';
          if (job.pr) m.pr = job.pr; else m.text += '\n\n(no file changes made)';
          m.pending = false; break;
        }
        saveChat(); paintChat();
      }
      if (m.pending) { m.text = 'Still running — it will show here when you reopen the chat.'; m.pending = false; }
    } catch (e) { m.text = `Error: ${e.message}`; m.pending = false; }
    saveChat(); paintChat(); send.disabled = chatLog.some((x) => x.pending);
  }

  send.onclick = async () => {
    const message = input.value.trim(); if (!message) return;
    input.value = '';
    const bot = { role: 'bot', text: 'Queued…', pending: true };
    chatLog.push({ role: 'user', text: message }, bot);
    saveChat(); paintChat(); send.disabled = true;
    try {
      const { id } = await (await api('/chat', { method: 'POST', body: JSON.stringify({ message, page: PAGE, includeNotes: useNotes.checked }) })).json();
      bot.jobId = id; saveChat();
      await trackJob(bot);
    } catch (e) { bot.text = `Error: ${e.message}`; bot.pending = false; saveChat(); paintChat(); send.disabled = false; }
  };

  // Resume any job that was still running before the refresh.
  for (const m of chatLog) if (m.pending && !m.jobId) { m.text = 'Interrupted by a page refresh before it was sent — please resend.'; m.pending = false; }
  saveChat(); paintChat();
  for (const m of chatLog) if (m.pending && m.jobId) { trackJob(m); send.disabled = true; }

  if (!API) console.warn('cc-widget: missing data-api attribute');
  btn.addEventListener('click', async () => { if (panel.classList.contains('open') && await gate()) loadNotes(); });
})();
