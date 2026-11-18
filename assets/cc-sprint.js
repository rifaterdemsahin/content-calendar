/* Sprint cards: who each video is for, what Erdem learns and shares, the reverse-response target,
 * a live countdown to its publish slot, and a click-to-open modal.
 * The modal loads the card's Markdown from Azure (GET /api/content/<id>) and saves notes for the card
 * through the existing notes API (POST /api/notes, anchored to the card id).
 * Per-card notes come from data/sprint-meta.json. Cards without a time are due at end of that day. */
(() => {
  const YEAR = 2026;
  const MONTHS = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
  const WEEKDAYS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  // Who the video is for, by format. Edit here if a format changes audience.
  const AUDIENCE = {
    'Short': { who: 'Consumers', color: '#f87171', note: 'free hook → YouTube' },
    'Long Video': { who: 'Consumers', color: '#818cf8', note: 'watch time → Skool' },
    'Skool Live': { who: 'Professionals', color: '#c084fc', note: 'Skool members' },
    'Coursera Module': { who: 'Professionals', color: '#fbbf24', note: 'Skool Classroom / Coursera' },
  };

  const el = (tag, css, text) => {
    const e = document.createElement(tag);
    if (css) e.style.cssText = css;
    if (text != null) e.textContent = text;
    return e;
  };
  const pill = (text, color) => el('span', `display:inline-block;font-size:10px;font-weight:700;padding:2px 6px;border-radius:999px;border:1px solid ${color}55;color:${color};background:${color}1a`, text);

  const line = (label, text, color = '#94a3b8') => {
    const d = el('div', `font-size:11px;line-height:1.4;color:${color}`);
    const b = el('strong', 'color:#e2e8f0', label + ' ');
    d.append(b, text);
    return d;
  };

  // Publish slot for a card: the matching weekday inside the week's range, at the given time (or end of day).
  function slotFor(card, dayName, time) {
    const range = card.closest('.p-6')?.querySelector('.font-mono')?.textContent || '';
    const m = range.match(/([A-Z][a-z]{2}) (\d{2}) – ([A-Z][a-z]{2}) (\d{2})/);
    if (!m) return null;
    const start = new Date(YEAR, MONTHS[m[1]], Number(m[2]));
    for (let i = 0; i < 7; i++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      if (d.getDay() !== WEEKDAYS[dayName]) continue;
      if (time) { const [h, mi] = time.split(':').map(Number); d.setHours(h, mi, 0, 0); }
      else d.setHours(23, 59, 59, 999);
      return d;
    }
    return null;
  }

  const fmt = (ms) => {
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    const p = (n) => String(n).padStart(2, '0');
    return d ? `${d}d ${p(h)}h ${p(m)}m ${p(sec)}s` : `${p(h)}h ${p(m)}m ${p(sec)}s`;
  };

  // ---- Modal ------------------------------------------------------------
  // Minimal Markdown → DOM (no innerHTML, so content can't inject markup). Handles headings, lists,
  // bold, and links.
  function inline(text) {
    const frag = document.createDocumentFragment();
    const re = /\*\*([^*]+)\*\*|\[([^\]]+)\]\((https?:[^)\s]+)\)|_([^_]+)_/g;
    let last = 0, m;
    while ((m = re.exec(text))) {
      if (m.index > last) frag.append(text.slice(last, m.index));
      if (m[1]) frag.append(el('strong', 'color:#fff', m[1]));
      else if (m[2]) { const a = el('a', 'color:#a5b4fc', m[2]); a.href = m[3]; a.target = '_blank'; a.rel = 'noopener'; frag.append(a); }
      else frag.append(el('em', 'color:#cbd5e1', m[4]));
      last = re.lastIndex;
    }
    if (last < text.length) frag.append(text.slice(last));
    return frag;
  }

  function renderMarkdown(md) {
    const root = el('div', 'font-size:14px;line-height:1.55;color:#e2e8f0');
    let list = null;
    for (const raw of md.split('\n')) {
      const t = raw.trimEnd();
      const ol = t.match(/^\d+\.\s+(.*)/), ul = t.match(/^-\s+(.*)/);
      if (ol || ul) {
        if (!list || list.tagName !== (ol ? 'OL' : 'UL')) { list = el(ol ? 'ol' : 'ul', 'margin:6px 0 10px 20px;padding:0'); root.append(list); }
        const li = el('li', 'margin:2px 0'); li.append(inline((ol || ul)[1])); list.append(li); continue;
      }
      list = null;
      if (!t) continue;
      if (t.startsWith('# ')) root.append(el('h2', 'font-size:18px;font-weight:800;color:#fff;margin:4px 0 10px', t.slice(2)));
      else if (t.startsWith('## ')) root.append(el('h3', 'font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#818cf8;margin:14px 0 4px', t.slice(3)));
      else { const p = el('p', 'margin:4px 0'); p.append(inline(t)); root.append(p); }
    }
    return root;
  }

  // Success feedback after a save to Azure: the modal pulses green, and a toast slides in with a
  // checkmark that draws itself. Keyframes are injected once.
  function celebrate(panel, text) {
    if (!document.getElementById('ccs-anim')) {
      const s = document.createElement('style');
      s.id = 'ccs-anim';
      s.textContent = `
        @keyframes ccs-toast-in{from{transform:translate(-50%,24px);opacity:0}to{transform:translate(-50%,0);opacity:1}}
        @keyframes ccs-toast-out{to{transform:translate(-50%,12px);opacity:0}}
        @keyframes ccs-draw{to{stroke-dashoffset:0}}
        @keyframes ccs-pop{0%{transform:scale(.4)}60%{transform:scale(1.15)}100%{transform:scale(1)}}
        @keyframes ccs-glow{0%{box-shadow:0 0 0 0 rgba(34,197,94,.7)}100%{box-shadow:0 0 0 22px rgba(34,197,94,0)}}`;
      document.head.append(s);
    }
    panel.style.animation = 'ccs-glow .9s ease-out';
    setTimeout(() => { panel.style.animation = ''; }, 950);

    const toast = el('div', 'position:fixed;left:50%;bottom:24px;z-index:100010;transform:translateX(-50%);display:flex;align-items:center;gap:10px;background:#052e16;color:#bbf7d0;border:1px solid #16a34a;border-radius:999px;padding:10px 18px 10px 12px;font:600 14px system-ui,sans-serif;box-shadow:0 10px 30px #000a');
    toast.setAttribute('role', 'status');
    toast.innerHTML = `<span style="display:inline-flex;width:26px;height:26px;border-radius:50%;background:#16a34a;align-items:center;justify-content:center;animation:ccs-pop .45s ease-out">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <path d="M5 13l4 4L19 7" stroke-dasharray="30" stroke-dashoffset="30" style="animation:ccs-draw .5s .15s ease-out forwards"/>
        </svg></span><span></span>`;
    toast.lastChild.textContent = `${text} ✓`;
    toast.style.animation = 'ccs-toast-in .35s ease-out';
    document.body.append(toast);
    setTimeout(() => { toast.style.animation = 'ccs-toast-out .4s ease-in forwards'; }, 2400);
    setTimeout(() => toast.remove(), 2900);
  }

  let openEl = null;
  function closeModal() { openEl?.remove(); openEl = null; document.removeEventListener('keydown', onKey); }
  function onKey(e) { if (e.key === 'Escape') closeModal(); }

  async function openModal(card, meta) {
    closeModal();
    const id = card.id;
    const title = card.querySelector('.font-bold')?.textContent.trim() || id;
    const label = card.querySelector('span')?.textContent.trim() || '';

    const overlay = el('div', 'position:fixed;inset:0;z-index:100001;background:rgba(2,6,23,.75);display:flex;align-items:flex-start;justify-content:center;padding:12px;overflow-y:auto');
    const panel = el('div', 'position:relative;width:100%;max-width:720px;margin:auto 0;background:#0f172a;border:1px solid #334155;border-radius:14px;box-shadow:0 20px 60px #000c;color:#e2e8f0;font-family:system-ui,sans-serif');
    const head = el('div', 'display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:16px 18px;border-bottom:1px solid #334155');
    const hTitle = el('div', 'min-width:0', null);
    hTitle.append(el('div', 'font-size:17px;font-weight:800;color:#fff', title), el('div', 'font-size:12px;color:#94a3b8;margin-top:2px', label));
    const close = el('button', 'background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-radius:8px;padding:4px 10px;cursor:pointer;font-size:14px', '✕');
    close.setAttribute('aria-label', 'Close');
    close.onclick = closeModal;
    head.append(hTitle, close);

    const body = el('div', 'padding:14px 18px');
    const contentBox = el('div', 'min-height:60px', 'Loading content from Azure…');
    contentBox.style.color = '#94a3b8';

    // Edit mode: raw Markdown in a textarea, saved back to Azure.
    const toolbar = el('div', 'display:flex;gap:8px;align-items:center;justify-content:flex-end;margin-bottom:8px');
    const editBtn = el('button', 'background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-radius:8px;padding:5px 12px;cursor:pointer;font-size:13px;display:none', '✏️ Edit');
    const editor = el('textarea', 'display:none;width:100%;min-height:320px;background:#0b1220;color:#e2e8f0;border:1px solid #334155;border-radius:8px;padding:10px;font-size:13px;line-height:1.5;font-family:ui-monospace,Menlo,monospace;box-sizing:border-box', null);
    const saveContent = el('button', 'display:none;background:#16a34a;color:#fff;border:0;border-radius:8px;padding:7px 14px;cursor:pointer;font-size:13px;font-weight:600', 'Save to Azure');
    const cancelEdit = el('button', 'display:none;background:#334155;color:#e2e8f0;border:0;border-radius:8px;padding:7px 14px;cursor:pointer;font-size:13px', 'Cancel');
    const contentStatus = el('div', 'font-size:12px;color:#94a3b8;margin-top:6px;min-height:16px', null);
    toolbar.append(editBtn);
    body.append(toolbar, contentBox, editor, el('div', 'display:flex;gap:8px;justify-content:flex-end;margin-top:8px', saveContent, cancelEdit), contentStatus);

    let currentMarkdown = null;
    const showView = () => {
      editor.style.display = 'none'; saveContent.style.display = 'none'; cancelEdit.style.display = 'none';
      contentBox.style.display = ''; editBtn.style.display = currentMarkdown == null ? 'none' : '';
      if (currentMarkdown != null) contentBox.replaceChildren(renderMarkdown(currentMarkdown));
    };
    const showEdit = () => {
      contentBox.style.display = 'none'; editBtn.style.display = 'none';
      editor.value = currentMarkdown || ''; editor.style.display = 'block';
      saveContent.style.display = ''; cancelEdit.style.display = '';
      contentStatus.textContent = ''; editor.focus();
    };
    editBtn.onclick = showEdit;
    cancelEdit.onclick = showView;
    saveContent.onclick = async () => {
      saveContent.disabled = true; cancelEdit.disabled = true; contentStatus.textContent = 'Saving to Azure…';
      try {
        const r = await fetch(`/api/content/${encodeURIComponent(id)}`, { method: 'PUT', credentials: 'same-origin',
          headers: { 'content-type': 'application/json' }, body: JSON.stringify({ markdown: editor.value }) });
        if (r.status === 401) throw new Error('sign in with Microsoft first');
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `HTTP ${r.status}`);
        currentMarkdown = editor.value;
        showView();
        celebrate(panel, 'Saved to Azure');
        contentStatus.textContent = '';
      } catch (e) {
        contentStatus.textContent = `Not saved: ${e.message}`;
        contentStatus.style.color = '#f87171';
      } finally { saveContent.disabled = false; cancelEdit.disabled = false; }
    };

    const notesWrap = el('div', 'margin-top:18px;padding-top:14px;border-top:1px dashed #334155');
    notesWrap.append(el('div', 'font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#818cf8;margin-bottom:8px', 'My notes on this video'));
    const ta = el('textarea', 'width:100%;min-height:76px;background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-radius:8px;padding:8px;font-size:14px;font-family:inherit', null);
    ta.placeholder = 'What did I learn? What will I share?';
    const saveBtn = el('button', 'margin-top:8px;background:#6366f1;color:#fff;border:0;border-radius:8px;padding:7px 14px;cursor:pointer;font-size:13px', 'Save note');
    const status = el('div', 'font-size:12px;color:#94a3b8;margin-top:6px', null);
    const list = el('div', 'margin-top:10px;display:flex;flex-direction:column;gap:8px', null);
    notesWrap.append(ta, saveBtn, status, list);
    body.append(notesWrap);

    panel.append(head, body);
    overlay.append(panel);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
    document.body.append(overlay);
    openEl = overlay;
    document.addEventListener('keydown', onKey);

    // Content from Azure, through the server's session check.
    fetch(`/api/content/${encodeURIComponent(id)}`, { credentials: 'same-origin' })
      .then(async (r) => {
        if (r.status === 401) {
          contentBox.replaceChildren(el('div', 'color:#fbbf24', 'Sign in with Microsoft to load this content.'));
          const a = el('a', 'display:inline-block;margin-top:6px;color:#a5b4fc', 'Sign in →'); a.href = '/auth/login';
          contentBox.append(a);
          return;
        }
        if (r.status === 404) {
          currentMarkdown = '';
          contentBox.replaceChildren(el('div', 'color:#94a3b8', 'No content saved for this item yet. Click Edit to write it.'));
          editBtn.style.display = '';
          return;
        }
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const { markdown } = await r.json();
        currentMarkdown = markdown;
        showView();
      })
      .catch((e) => contentBox.replaceChildren(el('div', 'color:#f87171', `Could not load content: ${e.message}`)));

    // Notes for this card (anchored to the card id; same store as the page notes).
    const loadNotes = () => fetch('/api/notes', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : []))
      .then((all) => {
        const mine = all.filter((n) => n.anchor === id).sort((a, b) => b.created.localeCompare(a.created));
        list.replaceChildren(...(mine.length ? mine.map((n) => {
          const c = el('div', 'background:#1e293b;border:1px solid #334155;border-radius:8px;padding:8px 10px;font-size:13px;white-space:pre-wrap;overflow-wrap:anywhere', n.text);
          c.append(el('div', 'font-size:11px;color:#64748b;margin-top:4px', new Date(n.created).toLocaleString()));
          return c;
        }) : [el('div', 'font-size:12px;color:#64748b', 'No notes yet.')]));
      })
      .catch(() => list.replaceChildren(el('div', 'font-size:12px;color:#f87171', 'Sign in to see and save notes.')));
    loadNotes();

    saveBtn.onclick = async () => {
      const text = ta.value.trim();
      if (!text) return;
      saveBtn.disabled = true; status.textContent = 'Saving…';
      try {
        const r = await fetch('/api/notes', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ page: location.pathname, anchor: id, concept: `${title} · ${label}`, text }) });
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `HTTP ${r.status}`);
        ta.value = ''; status.textContent = 'Saved.'; loadNotes();
      } catch (e) { status.textContent = `Not saved: ${e.message}`; }
      finally { saveBtn.disabled = false; }
    };
    ta.focus();
  }

  // ---- Cards ------------------------------------------------------------
  function build(meta) {
    const clocks = [];
    for (const card of document.querySelectorAll('[id*="-item-"]')) {
      const label = card.querySelector('span')?.textContent.trim() || '';   // e.g. "Sun 13:30 • Skool Live"
      const dayMatch = label.match(/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)\b/);
      const timeMatch = label.match(/(\d{2}:\d{2})/);
      const type = label.split('•')[1]?.trim() || '';
      const aud = AUDIENCE[type];
      const slot = dayMatch ? slotFor(card, dayMatch[1], timeMatch?.[1]) : null;
      const notes = meta?.cards?.[card.id] || null;

      const box = el('div', 'margin-top:10px;padding-top:8px;border-top:1px dashed #334155;display:flex;flex-direction:column;gap:6px');
      const top = el('div', 'display:flex;flex-wrap:wrap;gap:6px;align-items:center;justify-content:space-between');
      const left = el('div', 'display:flex;flex-wrap:wrap;gap:6px;align-items:center');
      if (aud) {
        left.append(pill(`👥 For: ${aud.who}`, aud.color));
        left.append(el('span', 'font-size:10px;color:#94a3b8', aud.note));
      } else {
        left.append(pill('👥 For: not set', '#64748b'));
      }
      const clock = el('span', 'font-size:11px;font-family:ui-monospace,monospace;color:#e2e8f0;white-space:nowrap');
      top.append(left, clock);
      box.append(top);

      if (notes?.learn) box.append(line('🎓 Erdem learns:', notes.learn));
      if (notes?.share) box.append(line('📣 Shares:', notes.share));
      const rr = notes?.reverseResponse;
      if (rr?.angle) {
        const text = rr.target
          ? (() => { const a = el('a', 'color:#a5b4fc', rr.target.title || 'target video'); a.href = rr.target.url; a.target = '_blank'; a.rel = 'noopener'; return a; })()
          : `responds to ${rr.angle} (pick a live target)`;
        box.append(line('🔁 Reverse response:', text, '#a5b4fc'));
      } else if (rr?.note) {
        box.append(line('🔁 Reverse response:', rr.note));
      }
      if (notes?.ownAudience) {
        const a = el('a', 'color:#a5b4fc', notes.ownAudience.title);
        a.href = notes.ownAudience.url; a.target = '_blank'; a.rel = 'noopener';
        const d = el('div', 'font-size:11px;line-height:1.4;color:#94a3b8');
        d.append(el('strong', 'color:#e2e8f0', '📺 Your audience already watched: '), a, ` (${notes.ownAudience.views} views)`);
        box.append(d);
      }
      box.append(el('div', 'font-size:11px;color:#818cf8;margin-top:2px', '📖 Click the title to open, edit and take notes'));
      card.append(box);

      // The title opens the modal (the rest of the card stays as it is).
      const titleEl = card.querySelector('.font-bold');
      if (titleEl) {
        titleEl.style.cssText += ';cursor:pointer;text-decoration:underline;text-decoration-color:#6366f1;text-underline-offset:3px';
        titleEl.setAttribute('role', 'button');
        titleEl.setAttribute('tabindex', '0');
        titleEl.title = 'Open to read, edit and take notes';
        titleEl.addEventListener('click', () => openModal(card, meta));
        titleEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') openModal(card, meta); });
      }

      if (slot) clocks.push({ el: clock, at: slot });
      else clock.textContent = '⏱ no publish slot';
    }

    const tick = () => {
      const now = Date.now();
      for (const c of clocks) {
        const left = c.at.getTime() - now;
        const due = c.at.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
        if (left <= 0) { c.el.textContent = `⏱ due ${due} — passed`; c.el.style.color = '#f87171'; }
        else {
          c.el.textContent = `⏱ ${fmt(left)} left · due ${due}`;
          c.el.style.color = left < 86400000 ? '#fbbf24' : '#e2e8f0';
        }
      }
    };
    tick();
    setInterval(tick, 1000);
  }

  // Load the per-card notes first; if the file is missing, still show the countdowns and badges.
  fetch('data/sprint-meta.json', { cache: 'no-cache' })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null)
    .then(build);
})();
