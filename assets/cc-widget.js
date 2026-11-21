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
  #ccw-btn{position:fixed;right:18px;bottom:44px;z-index:99998;width:52px;height:52px;border-radius:50%;border:0;background:#6366f1;color:#fff;font-size:22px;cursor:pointer;box-shadow:0 4px 16px #0008;transition:transform .15s}
  #ccw-btn:hover{transform:scale(1.05)}
  #ccw-picker-btn{position:fixed;right:78px;bottom:44px;z-index:99998;width:52px;height:52px;border-radius:50%;border:0;background:#334155;color:#e2e8f0;font-size:20px;cursor:pointer;box-shadow:0 4px 16px #0008;transition:all .15s}
  #ccw-picker-btn:hover{background:#475569;transform:scale(1.05)}
  #ccw-picker-btn.picking{background:#dc2626;color:#fff;animation:ccw-pulse 1.2s infinite}
  @keyframes ccw-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}
  .ccw-picker-active *{cursor:crosshair!important}
  .ccw-picker-hover{outline:3px dashed #6366f1!important;outline-offset:2px;background:rgba(99,102,241,0.12)!important}
  #ccw-picker-tooltip{position:fixed;z-index:100000;pointer-events:none;background:#0f172a;color:#e2e8f0;border:1px solid #6366f1;border-radius:6px;padding:4px 8px;font-size:11px;font-family:monospace;box-shadow:0 4px 12px #000a}
  #ccw-panel{position:fixed;right:18px;bottom:106px;z-index:99999;width:min(420px,calc(100vw - 36px));height:min(600px,calc(100vh - 170px));display:none;flex-direction:column;background:#0f172a;color:#e2e8f0;border:1px solid #334155;border-radius:14px;box-shadow:0 10px 40px #000a;overflow:hidden}
  #ccw-panel.open{display:flex}
  #ccw .tabs{display:flex;border-bottom:1px solid #334155}
  #ccw .tabs button{flex:1;padding:10px;background:none;border:0;color:#94a3b8;cursor:pointer;font-size:14px}
  #ccw .tabs button.on{color:#fff;border-bottom:2px solid #6366f1}
  #ccw .tabs button.max-btn{flex:0 0 42px;font-size:16px}
  #ccw-panel.max{right:12px;bottom:12px;width:calc(100vw - 24px);height:calc(100vh - 24px)}
  #ccw .body{flex:1;min-height:0;overflow:auto;padding:12px;display:flex;flex-direction:column;gap:8px;-webkit-overflow-scrolling:touch}
  @media (max-width:640px){
    #ccw-panel{left:8px;right:8px;bottom:96px;width:auto;height:calc(100vh - 170px)}
    #ccw-panel.max{left:0;right:0;top:0;bottom:0;width:100vw;height:100vh;border-radius:0}
    #ccw-btn{right:12px;bottom:40px}
    #ccw-picker-btn{right:72px;bottom:40px}
  }
  #ccw textarea,#ccw input[type=text]{width:100%;background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-radius:8px;padding:8px;font-size:14px}
  #ccw .row{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
  #ccw .btn{background:#6366f1;color:#fff;border:0;border-radius:8px;padding:7px 12px;cursor:pointer;font-size:13px}
  #ccw .btn.alt{background:#334155}
  #ccw .btn.del{background:#7f1d1d}
  #ccw .card{background:#1e293b;border:1px solid #334155;border-radius:8px;padding:8px 10px;font-size:13px;line-height:1.45;white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word;max-width:100%}
  #ccw .meta{color:#94a3b8;font-size:11px;margin-bottom:4px}
  #ccw .msg{flex-shrink:0}
  #ccw .msg.user{align-self:flex-end;background:#4338ca;max-width:88%}
  #ccw .hint{color:#94a3b8;font-size:12px;line-height:1.45}
  /* Chat layout: header hint, scrolling log, composer pinned to the bottom. */
  #ccw .body.chat{padding:0;gap:0;overflow:hidden}
  #ccw .chat-top{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 12px;border-bottom:1px solid #1e293b}
  #ccw .chat-log{flex:1;min-height:0;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:10px;overscroll-behavior:contain}
  #ccw .composer{border-top:1px solid #334155;padding:10px 12px;background:#0b1222;display:flex;flex-direction:column;gap:8px}
  #ccw .composer textarea{resize:none;min-height:44px;max-height:140px;line-height:1.4}
  #ccw .composer .row{justify-content:space-between}
  #ccw .msg{flex-shrink:0;white-space:normal;font-size:13.5px;line-height:1.5}
  #ccw .msg.bot{align-self:flex-start;max-width:94%}
  #ccw .msg.user{align-self:flex-end;background:#4338ca;border-color:#4f46e5;max-width:85%;white-space:pre-wrap}
  #ccw .msg .when{display:block;color:#94a3b8;font-size:10.5px;margin-top:6px}
  #ccw .msg.user .when{color:#c7d2fe;text-align:right}
  #ccw .msg p{margin:0 0 6px}#ccw .msg p:last-of-type{margin-bottom:0}
  #ccw .msg ul{margin:4px 0 6px;padding-left:18px;list-style:disc}#ccw .msg li{margin:2px 0}
  #ccw .msg code{background:#0f172a;border:1px solid #334155;border-radius:4px;padding:0 4px;font:12px ui-monospace,monospace}
  #ccw .msg .clip{max-height:220px;overflow:hidden;position:relative}
  #ccw .msg .clip::after{content:'';position:absolute;left:0;right:0;bottom:0;height:48px;background:linear-gradient(transparent,#1e293b)}
  #ccw .msg .more{background:none;border:0;color:#a5b4fc;cursor:pointer;padding:4px 0 0;font-size:12px}
  #ccw .status{display:flex;align-items:center;gap:8px;font-weight:600}
  #ccw .spin{width:12px;height:12px;border:2px solid #6366f1;border-top-color:transparent;border-radius:50%;animation:ccw-spin .8s linear infinite;flex:none}
  @keyframes ccw-spin{to{transform:rotate(360deg)}}
  #ccw .icon-btn{background:none;border:1px solid #334155;color:#cbd5e1;border-radius:6px;padding:3px 8px;font-size:12px;cursor:pointer}
  #ccw .icon-btn:hover{border-color:#6366f1;color:#fff}
  #ccw button:focus-visible,#ccw textarea:focus-visible,#ccw input:focus-visible,#ccw select:focus-visible{outline:2px solid #818cf8;outline-offset:1px}
  #ccw select{width:100%;max-width:100%;background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-radius:8px;padding:8px;font-size:14px}
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
  const pickerBtn = el('button', { id: 'ccw-picker-btn', title: 'Document Object Picker: Click any element to attach a note', textContent: '🎯' });
  const btn = el('button', { id: 'ccw-btn', title: 'Notes & chat (Alt-click anything to add a note)', textContent: '📝' });
  const panel = el('div', { id: 'ccw-panel' });
  const tabNotes = el('button', { textContent: '📝 Notes', className: 'on' });
  const tabChat = el('button', { textContent: '🤖 Chat' });
  const notesBody = el('div', { className: 'body' });
  const chatBody = el('div', { className: 'body', style: 'display:none' });
  // Maximize toggles the panel to near full-screen for notes and chat; title flips with state.
  const maxBtn = el('button', { className: 'max-btn', title: 'Maximize', textContent: '⤢', 'aria-label': 'Maximize' });
  maxBtn.onclick = () => {
    const on = panel.classList.toggle('max'); saveUi({ max: on });
    maxBtn.textContent = on ? '⤡' : '⤢';
    maxBtn.title = on ? 'Restore' : 'Maximize';
    maxBtn.setAttribute('aria-label', maxBtn.title);
  };
  panel.append(el('div', { className: 'tabs' }, tabNotes, tabChat, maxBtn), notesBody, chatBody);
  root.append(pickerBtn, btn, panel); document.body.appendChild(root);

  // UI state (open, tab, maximised, unsent draft) survives page refreshes, per browser.
  const UI_KEY = 'cc-widget-ui-v1';
  let ui = {}; try { ui = JSON.parse(localStorage.getItem(UI_KEY) || '{}'); } catch { ui = {}; }
  const saveUi = (patch) => { Object.assign(ui, patch); try { localStorage.setItem(UI_KEY, JSON.stringify(ui)); } catch { /* private mode */ } };
  const show = (which) => {
    tabNotes.classList.toggle('on', which === 'notes'); tabChat.classList.toggle('on', which === 'chat');
    notesBody.style.display = which === 'notes' ? 'flex' : 'none'; chatBody.style.display = which === 'chat' ? 'flex' : 'none';
    saveUi({ tab: which });
  };
  tabNotes.onclick = () => show('notes'); tabChat.onclick = () => show('chat');
  btn.onclick = () => saveUi({ open: panel.classList.toggle('open') });

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
  let draftCtx = { anchor: '', concept: '', rationale: '' };
  const itemMeta = new Map();
  // Dropdown of content on this page (sprint items + sections). Picking one sets the note's anchor.
  const pick = el('select', { style: 'width:100%;background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-radius:8px;padding:8px;font-size:14px' });
  const fillPicker = () => {
    const groups = [];
    itemMeta.clear();
    const sprint = [...document.querySelectorAll('[id*="-item-"]')].map((item) => {
      const week = item.closest('.p-6')?.querySelector('h3')?.textContent.trim() || '';
      const day = item.querySelector('span')?.textContent.trim() || '';
      const title = item.querySelector('.font-bold')?.textContent.trim() || item.id;
      const rationale = item.dataset.rationale || item.querySelector('.rationale-text')?.textContent.trim() || '';
      const obj = { id: item.id, label: [week, day, title].filter(Boolean).join(' · '), rationale, title };
      itemMeta.set(item.id, obj);
      return obj;
    });
    const sections = [...document.querySelectorAll('section[id]')].map((s) => {
      const label = s.querySelector('h2')?.textContent.trim() || s.id;
      const obj = { id: s.id, label, rationale: '' };
      itemMeta.set(s.id, obj);
      return obj;
    });
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
    if (!o || !o.value) { draftCtx = { anchor: '', concept: '', rationale: '' }; rationaleInput.value = ''; return; }
    const it = itemMeta.get(o.value);
    const rat = it?.rationale || '';
    draftCtx = { anchor: o.value, concept: o.textContent, rationale: rat };
    concept.value = o.textContent;
    rationaleInput.value = rat;
  };
  const concept = el('input', { type: 'text', placeholder: 'Concept (fills in from what you clicked)' });
  const rationaleInput = el('input', { type: 'text', placeholder: '💡 Why does this content exist?' });
  const noteText = el('textarea', { rows: 4, placeholder: '📝 Write a note…' });
  const status = el('div', { className: 'hint' });
  const list = el('div', { style: 'display:flex;flex-direction:column;gap:8px' });
  const flash = (t) => { status.textContent = t; setTimeout(() => { if (status.textContent === t) status.textContent = ''; }, 3500); };

  const save = el('button', { className: 'btn', textContent: 'Save note' });
  const pickDocBtn = el('button', { className: 'btn alt', textContent: '🎯 Pick Object', title: 'Interactive Document Object Picker: Click any element on the page' });
  const copyPage = el('button', { className: 'btn alt', textContent: 'Copy this page' });
  const copyAll = el('button', { className: 'btn alt', textContent: 'Copy ALL notes' });
  notesBody.append(pick, concept, rationaleInput, noteText, el('div', { className: 'row' }, save, pickDocBtn, copyPage, copyAll), status, list);

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
      await api('/notes', {
        method: 'POST',
        body: JSON.stringify({
          page: PAGE,
          anchor: draftCtx.anchor,
          concept: concept.value,
          rationale: rationaleInput.value,
          text: noteText.value
        })
      });
      noteText.value = ''; concept.value = ''; rationaleInput.value = ''; pick.value = ''; draftCtx = { anchor: '', concept: '', rationale: '' };
      flash('Saved to Azure Storage'); loadNotes();
    } catch (e) { flash(e.message); }
  };

  async function loadNotes() {
    try {
      const notes = await (await api(`/notes?page=${encodeURIComponent(PAGE)}`)).json();
      list.replaceChildren(...(notes.length ? notes.map(noteCard) : [el('div', { className: 'hint', textContent: 'No notes on this page yet. Alt-click any element or click Note on content to add one.' })]));
    } catch (e) { list.replaceChildren(el('div', { className: 'hint', textContent: e.message })); }
  }

  function noteCard(n) {
    const ta = el('textarea', { rows: 3, value: n.text, style: 'display:none' });
    const ratTa = el('input', { type: 'text', value: n.rationale || '', placeholder: 'Rationale', style: 'display:none;margin-bottom:6px' });
    const body = el('div', { textContent: n.text });
    const ratEl = n.rationale ? el('div', { className: 'hint', style: 'color:#a5b4fc;margin-bottom:4px;font-size:11px' },
      el('strong', { style: 'color:#818cf8', textContent: '💡 Rationale: ' }), n.rationale) : '';
    const edit = el('button', { className: 'btn alt', textContent: 'Edit' });
    const del = el('button', { className: 'btn del', textContent: 'Delete' });
    const go = n.anchor && document.getElementById(n.anchor) ? el('button', { className: 'btn alt', textContent: 'Go to', onclick: () => document.getElementById(n.anchor).scrollIntoView({ behavior: 'smooth' }) }) : '';
    edit.onclick = async () => {
      if (ta.style.display === 'none') {
        ta.style.display = 'block'; ratTa.style.display = 'block'; body.style.display = 'none';
        if (ratEl) ratEl.style.display = 'none'; edit.textContent = 'Save'; return;
      }
      try {
        await api(`/notes/${n.id}`, { method: 'PUT', body: JSON.stringify({ text: ta.value, rationale: ratTa.value }) });
        loadNotes();
      } catch (e) { flash(e.message); }
    };
    del.onclick = async () => { if (confirm('Delete this note?')) { try { await api(`/notes/${n.id}`, { method: 'DELETE' }); loadNotes(); } catch (e) { flash(e.message); } } };
    return el('div', { className: 'card' },
      el('div', { className: 'meta', textContent: [n.anchor && `#${n.anchor}`, n.concept].filter(Boolean).join(' · ') || 'page note' }),
      ratEl, body, ratTa, ta, el('div', { className: 'row', style: 'margin-top:6px' }, edit, del, go));
  }

  // ---- Document Object Picker --------------------------------------------
  let isPicking = false;
  let hoveredEl = null;
  const tooltip = el('div', { id: 'ccw-picker-tooltip', style: 'display:none' });
  document.body.appendChild(tooltip);

  function getSelector(elem) {
    if (!elem || !elem.tagName) return '';
    if (elem.id) return `#${elem.id}`;
    let name = elem.tagName.toLowerCase();
    if (elem.className && typeof elem.className === 'string') {
      const cls = elem.className.trim().split(/\s+/).slice(0, 2).filter((c) => !c.startsWith('ccw-')).join('.');
      if (cls) name += `.${cls}`;
    }
    return name;
  }

  function selectDocumentObject(target) {
    if (!target) return;
    const sel = String(window.getSelection() || '').trim();
    const section = target.closest('[id]');
    const heading = (section?.querySelector('h1,h2,h3') || target.closest('h1,h2,h3'))?.textContent.trim() || '';
    const snippet = (sel || target.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 120);
    const rat = section?.dataset?.rationale || target.closest('[data-rationale]')?.dataset?.rationale || '';
    const anchorId = section?.id || '';

    draftCtx = { anchor: anchorId, concept: snippet || heading, rationale: rat };
    concept.value = [heading && heading !== snippet ? heading : '', snippet].filter(Boolean).join(' › ') || getSelector(target);
    rationaleInput.value = rat;
    pick.value = [...pick.options].some((o) => o.value === anchorId) ? anchorId : '';

    stopPicker();
    panel.classList.add('open');
    show('notes');
    noteText.focus();
    loadNotes();

    hl?.classList.remove('ccw-hl');
    hl = target;
    target.classList.add('ccw-hl');
    setTimeout(() => target.classList.remove('ccw-hl'), 2500);
    flash(`Attached to ${getSelector(target)}`);
  }

  function startPicker() {
    isPicking = true;
    pickerBtn.classList.add('picking');
    document.body.classList.add('ccw-picker-active');
    panel.classList.remove('open');
    tooltip.style.display = 'block';
    tooltip.textContent = '🎯 Document Object Picker: Click any element to attach a note (ESC to cancel)';
    tooltip.style.left = '20px';
    tooltip.style.bottom = '80px';
    tooltip.style.top = 'auto';
  }

  function stopPicker() {
    isPicking = false;
    pickerBtn.classList.remove('picking');
    document.body.classList.remove('ccw-picker-active');
    if (hoveredEl) {
      hoveredEl.classList.remove('ccw-picker-hover');
      hoveredEl = null;
    }
    tooltip.style.display = 'none';
  }

  pickerBtn.onclick = () => {
    if (isPicking) stopPicker();
    else startPicker();
  };
  pickDocBtn.onclick = () => startPicker();

  document.addEventListener('mousemove', (e) => {
    if (!isPicking) return;
    const target = document.elementFromPoint(e.clientX, e.clientY);
    if (!target || root.contains(target) || target === tooltip) return;

    if (hoveredEl !== target) {
      if (hoveredEl) hoveredEl.classList.remove('ccw-picker-hover');
      hoveredEl = target;
      hoveredEl.classList.add('ccw-picker-hover');
    }

    const sel = getSelector(target);
    const section = target.closest('[id]');
    const sectionInfo = section && section !== target ? ` in #${section.id}` : '';
    tooltip.textContent = `🎯 ${sel}${sectionInfo} — click to attach note`;
    tooltip.style.display = 'block';
    tooltip.style.bottom = 'auto';
    const x = Math.min(e.clientX + 14, window.innerWidth - 280);
    const y = Math.min(e.clientY + 14, window.innerHeight - 40);
    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
  }, true);

  document.addEventListener('click', (e) => {
    if (!isPicking) return;
    if (root.contains(e.target) || e.target === tooltip) return;
    e.preventDefault();
    e.stopPropagation();
    selectDocumentObject(e.target);
  }, true);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isPicking) {
      e.preventDefault();
      stopPicker();
    }
  });

  const pickDocumentObject = (anchorId) => {
    const target = document.getElementById(anchorId);
    if (!target) return;
    selectDocumentObject(target);
  };

  const openNoteFor = (anchorId) => {
    const target = document.getElementById(anchorId);
    if (!target) return;
    const it = itemMeta.get(anchorId);
    const rat = target.dataset.rationale || it?.rationale || '';
    const heading = target.closest('.p-6')?.querySelector('h3')?.textContent.trim() || '';
    const day = target.querySelector('span')?.textContent.trim() || '';
    const title = target.querySelector('.font-bold')?.textContent.trim() || target.id;
    const label = [heading, day, title].filter(Boolean).join(' · ');

    draftCtx = { anchor: anchorId, concept: label, rationale: rat };
    concept.value = label;
    rationaleInput.value = rat;
    pick.value = [...pick.options].some((o) => o.value === anchorId) ? anchorId : '';

    panel.classList.add('open');
    show('notes');
    noteText.focus();
    loadNotes();
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.classList.add('ccw-hl');
    setTimeout(() => target.classList.remove('ccw-hl'), 2500);
  };
  window.CCWidget = { openNoteFor, pickDocumentObject, startPicker, gate };

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
    const rat = section?.dataset?.rationale || target.closest('[data-rationale]')?.dataset?.rationale || '';
    draftCtx = { anchor: section?.id || '', concept: snippet || heading, rationale: rat };
    concept.value = [heading && heading !== snippet ? heading : '', snippet].filter(Boolean).join(' › ');
    rationaleInput.value = rat;
    pick.value = [...pick.options].some((o) => o.value === draftCtx.anchor) ? draftCtx.anchor : '';
    hl?.classList.remove('ccw-hl'); hl = target; target.classList.add('ccw-hl'); setTimeout(() => target.classList.remove('ccw-hl'), 2500);
    panel.classList.add('open'); show('notes'); noteText.focus(); loadNotes();
  }, true);

  // ---- Chat -------------------------------------------------------------
  const log = el('div', { className: 'chat-log' });
  log.setAttribute('role', 'log'); log.setAttribute('aria-live', 'polite');
  const input = el('textarea', { rows: 2, placeholder: '💬 Describe a change… (Enter to send, Shift+Enter for a new line)' });
  input.setAttribute('aria-label', 'Message to Claude');
  // Grow the box with its text, up to the CSS max-height.
  const grow = () => { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 140) + 'px'; };
  input.addEventListener('input', grow);
  // Enter sends; Shift+Enter inserts a newline; IME composition (e.g. Japanese/Chinese input) is left alone.
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send.click(); }
  });
  const useNotes = el('input', { type: 'checkbox' });
  const send = el('button', { className: 'btn', textContent: '🚀 Send' });
  // 🎤 Voice: talk while you read the page; speech is typed into the box (browser speech recognition).
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const mic = el('button', { className: 'btn alt', textContent: '🎤 Talk', title: 'Dictate a change while you read the page' });
  let rec = null;
  if (!SR) mic.style.display = 'none';
  mic.onclick = () => {
    if (rec) { rec.stop(); return; }
    rec = new SR(); rec.lang = navigator.language || 'en-GB'; rec.continuous = true; rec.interimResults = true;
    const before = input.value ? input.value.replace(/\s*$/, ' ') : '';
    rec.onresult = (e) => {
      let text = ''; for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      input.value = before + text.trim(); saveUi({ draft: input.value });
    };
    rec.onend = () => { rec = null; mic.textContent = '🎤 Talk'; mic.classList.add('alt'); input.focus(); };
    rec.onerror = (e) => { mic.title = `Voice error: ${e.error}`; };
    rec.start(); mic.textContent = '🔴 Listening… tap to stop'; mic.classList.remove('alt');
  };
  input.addEventListener('input', () => saveUi({ draft: input.value }));
  if (ui.draft) input.value = ui.draft;
  const clear = el('button', { className: 'icon-btn', textContent: '🧹 Clear', title: 'Clear finished messages' });
  chatBody.className = 'body chat';
  chatBody.append(
    el('div', { className: 'chat-top' },
      el('span', { className: 'hint', textContent: `🤖 Claude edits the site · 📍 ${PAGE}` }), clear),
    log,
    el('div', { className: 'composer' }, input,
      el('div', { className: 'row' }, el('div', { className: 'row' }, send, mic), el('label', { className: 'hint' }, useNotes, ' 📝 use my notes'))));

  // The chat log survives refreshes: it is kept in localStorage (per browser), and any job that was
  // still running when the page closed is polled again on load. Storage failures are ignored.
  const CHAT_KEY = 'cc-chat-log-v1';
  let chatLog = [];
  try { chatLog = JSON.parse(localStorage.getItem(CHAT_KEY) || '[]'); } catch { chatLog = []; }
  const saveChat = () => { try { localStorage.setItem(CHAT_KEY, JSON.stringify(chatLog.slice(-60))); } catch { /* private mode / quota */ } };

  // Emoji status for each step the job reports, plus elapsed time.
  const STEP = [
    [/^queued/, '⏳', 'Queued: waiting for the agent'], [/waking sprite/, '🌅', 'Waking the Fly.io Sprite'],
    [/starting sandbox/, '📦', 'Starting a sandbox'], [/syncing repo|cloning repo/, '📥', 'Syncing the site code'],
    [/installing agent/, '🧰', 'Installing Claude'], [/agent working/, '🤖', 'Claude is editing the pages'],
    [/pushing branch/, '📤', 'Saving the change'], [/merging/, '🔀', 'Merging into main'],
    [/publish/, '🌐', 'Publishing to the live site'], [/finished/, '✅', 'Finished'],
  ];
  const ago = (t) => { const s = Math.max(0, Math.round((Date.now() - t) / 1000)); return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`; };
  const stepText = (job, m) => {
    const key = job.status === 'queued' ? 'queued' : (job.step || job.status);
    const hit = STEP.find(([re]) => re.test(key)) || [null, '⚙️', key];
    return `${hit[1]} ${hit[2]}  ·  ⏱️ ${ago(m.started || Date.now())}`;
  };

  // Safe mini-markdown: **bold**, `code`, "- " bullets and paragraphs, built as DOM nodes (never innerHTML).
  function inline(text) {
    const frag = document.createDocumentFragment();
    text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).forEach((part) => {
      if (/^\*\*[^*]+\*\*$/.test(part)) frag.append(el('strong', { textContent: part.slice(2, -2) }));
      else if (/^`[^`]+`$/.test(part)) frag.append(el('code', { textContent: part.slice(1, -1) }));
      else if (part) frag.append(part);
    });
    return frag;
  }
  function renderText(text) {
    const box = el('div');
    let ul = null;
    String(text || '').split('\n').forEach((line) => {
      const li = line.match(/^\s*[-*•]\s+(.*)/);
      if (li) { if (!ul) { ul = el('ul'); box.append(ul); } ul.append(el('li', {}, inline(li[1]))); return; }
      ul = null;
      if (line.trim()) box.append(el('p', {}, inline(line)));
    });
    return box;
  }
  const clock = (t) => (t ? new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '');

  function paintChat() {
    const nearBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 80;
    log.replaceChildren(...chatLog.map((m) => {
      if (m.role === 'user') return el('div', { className: 'card msg user', textContent: m.text }, el('span', { className: 'when', textContent: clock(m.at) }));
      const n = el('div', { className: 'card msg bot' });
      if (m.pending) {
        n.append(el('div', { className: 'status' }, el('span', { className: 'spin' }), el('span', { textContent: m.text })));
      } else {
        const body = renderText(m.text);
        n.append(body);
        if ((m.text || '').length > 600 && !m.expanded) {
          body.className = 'clip';
          n.append(el('button', { className: 'more', textContent: '⬇️ Show more', onclick: () => { m.expanded = true; saveChat(); paintChat(); } }));
        }
      }
      if (m.pr) n.append(el('div', { style: 'margin-top:6px' }, el('a', { href: m.pr, target: '_blank', rel: 'noopener', textContent: m.merged ? '🔗 View the merged pull request →' : '🔗 View the pull request →' })));
      n.append(el('span', { className: 'when', textContent: [clock(m.started || m.at), m.page ? `📍 ${m.page}` : ''].filter(Boolean).join(' · ') }));
      return n;
    }));
    // Scroll only the log (never the page), and only if the reader was already near the bottom.
    if (nearBottom || chatLog[chatLog.length - 1]?.pending) log.scrollTop = log.scrollHeight;
  }
  clear.onclick = () => { chatLog = chatLog.filter((m) => m.pending || (chatLog[chatLog.indexOf(m) + 1] || {}).pending); saveChat(); paintChat(); };

  // Centre-of-page refresh button, shown once a change is merged and live.
  function showRefresh() {
    if (document.getElementById('ccw-refresh')) return;
    const b = el('button', { id: 'ccw-refresh', textContent: '↻ Refresh to see the change' });
    b.setAttribute('style', 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:100020;background:#16a34a;color:#fff;border:0;border-radius:999px;padding:14px 26px;font:700 16px system-ui,sans-serif;box-shadow:0 18px 50px #000b;cursor:pointer;animation:ccw-pop .45s ease-out');
    const st = document.createElement('style');
    st.textContent = '@keyframes ccw-pop{0%{transform:translate(-50%,-50%) scale(.6);opacity:0}60%{transform:translate(-50%,-50%) scale(1.06);opacity:1}100%{transform:translate(-50%,-50%) scale(1)}}';
    document.head.append(st);
    b.onclick = () => location.reload();
    document.body.append(b);
  }

  // Polls the job until it is done and, once merged, until it is live on the site.
  // Returns when the job reaches a final state (live, publish failed, or agent error).
  async function trackJob(m) {
    try {
      for (let i = 0; i < 240; i++) {
        await new Promise((r) => setTimeout(r, 4000));
        const job = await (await api(`/jobs/${m.jobId}`)).json();
        if (job.status === 'error') { m.text = `❌ Error: ${job.error}`; m.pending = false; break; }
        if (job.status !== 'done') {
          m.text = stepText(job, m);
          saveChat(); paintChat(); continue;
        }
        // The agent is finished. Show its summary, then follow publishing if the change was merged.
        m.summary = job.summary || 'Done.';
        if (job.pr) m.pr = job.pr;
        m.merged = !!job.merged;
        m.published = job.published || null;
        if (!job.merged) { m.text = m.summary + '\n\n💤 No file changes made.'; m.pending = false; break; }
        if (job.published === 'success') {
          m.text = m.summary + '\n\n✅ Merged into main and 🌐 live on the site.';
          m.pending = false; saveChat(); paintChat(); showRefresh(); break;
        }
        if (job.published === 'failed') {
          m.text = m.summary + `\n\n⚠️ Merged, but publishing failed: ${job.publishError || 'unknown error'}`;
          m.pending = false; break;
        }
        m.text = m.summary + `\n\n🔀 Merged. 🌐 Publishing to the live site…  ·  ⏱️ ${ago(m.started || Date.now())}`;
        saveChat(); paintChat();
      }
      if (m.pending) { m.text = '⏳ Still running. It will show here when you reopen the chat.'; m.pending = false; }
    } catch (e) { m.text = `❌ Error: ${e.message}`; m.pending = false; }
    saveChat(); paintChat(); send.disabled = chatLog.some((x) => x.pending);
  }

  send.onclick = async () => {
    const message = input.value.trim(); if (!message) return;
    input.value = '';
    const bot = { role: 'bot', text: '⏳ Queued: waiting for the agent', pending: true, started: Date.now(), page: PAGE };
    saveUi({ draft: '' });
    chatLog.push({ role: 'user', text: message, at: Date.now(), page: PAGE }, bot);
    grow();
    saveChat(); paintChat(); send.disabled = true;
    try {
      const { id } = await (await api('/chat', { method: 'POST', body: JSON.stringify({ message, page: PAGE, includeNotes: useNotes.checked }) })).json();
      bot.jobId = id; saveChat();
      await trackJob(bot);
    } catch (e) { bot.text = `❌ Error: ${e.message}`; bot.pending = false; saveChat(); paintChat(); send.disabled = false; }
  };

  // Resume any job that was still running before the refresh.
  for (const m of chatLog) if (m.pending && !m.jobId) { m.text = '⚠️ Interrupted by a page refresh before it was sent. Please resend.'; m.pending = false; }
  saveChat(); paintChat();
  for (const m of chatLog) if (m.pending && m.jobId) { trackJob(m); send.disabled = true; }

  // Restore the panel as it was before the refresh: open, tab and size. A running job reopens the chat.
  if (chatLog.some((x) => x.pending)) saveUi({ open: true, tab: 'chat' });
  if (ui.max) maxBtn.click();
  if (ui.open) { panel.classList.add('open'); gate().then((ok) => { if (!ok) return; show(ui.tab || 'notes'); if ((ui.tab || 'notes') === 'notes') loadNotes(); }); }

  if (!API) console.warn('cc-widget: missing data-api attribute');
  btn.addEventListener('click', async () => { if (panel.classList.contains('open') && await gate()) loadNotes(); });
})();
