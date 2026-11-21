/* Guide: bottom-left button on every page. Opens a panel listing the pages in reading order
 * (data/guide.json "sections") and the 5 most recently updated pages ("updates", filled by
 * scripts/build_guide.py from git history). Safe to include on any page. */
(() => {
  if (document.getElementById('ccg-btn')) return;
  const css = `
  #ccg-btn{position:fixed;left:18px;bottom:40px;z-index:99990;display:flex;align-items:center;gap:6px;padding:0 16px;height:44px;border-radius:22px;border:1px solid #334155;background:#0f172a;color:#e2e8f0;font:600 13px Inter,system-ui,sans-serif;cursor:pointer;box-shadow:0 4px 16px #0008;transition:border-color .15s,transform .15s}
  #ccg-btn:hover{border-color:#6366f1;transform:translateY(-1px)}
  #ccg-panel{position:fixed;left:18px;bottom:92px;z-index:99991;width:min(380px,calc(100vw - 36px));max-height:min(640px,calc(100vh - 120px));overflow-y:auto;display:none;background:#0f172a;color:#e2e8f0;border:1px solid #334155;border-radius:14px;box-shadow:0 10px 40px #000a;font:13px Inter,system-ui,sans-serif}
  #ccg-panel.open{display:block}
  #ccg-panel h3{margin:0;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#818cf8;font-weight:700}
  #ccg-panel .sec{padding:12px 14px;border-top:1px solid #1e293b}
  #ccg-panel .head{display:flex;justify-content:space-between;align-items:center;padding:12px 14px}
  #ccg-panel .head b{font-size:15px;color:#fff}
  #ccg-panel .x{background:none;border:0;color:#94a3b8;font-size:18px;cursor:pointer;line-height:1}
  #ccg-panel .intro{padding:0 14px 12px;color:#94a3b8;font-size:12px}
  #ccg-panel a.pg{display:flex;gap:10px;padding:7px 8px;margin:2px -8px;border-radius:8px;color:#e2e8f0;text-decoration:none}
  #ccg-panel a.pg:hover{background:#1e293b}
  #ccg-panel a.pg.cur{background:#312e81;outline:1px solid #6366f1}
  #ccg-panel .n{flex:none;width:22px;height:22px;border-radius:50%;background:#1e293b;color:#a5b4fc;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center}
  #ccg-panel .t{font-weight:600}
  #ccg-panel .w{color:#94a3b8;font-size:12px;margin-top:1px}
  #ccg-panel .stitle{color:#cbd5e1;font-size:12px;font-weight:700;margin:10px 0 4px}
  #ccg-panel .stitle:first-of-type{margin-top:8px}
  #ccg-panel .when{color:#64748b;font-size:11px;white-space:nowrap;margin-left:auto;padding-left:8px}
  @media (max-width:640px){#ccg-btn{left:12px;bottom:36px;padding:0 13px}#ccg-panel{left:8px;right:8px;width:auto;bottom:88px}}
  `;
  const style = document.createElement('style'); style.textContent = css; document.head.append(style);
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };

  const btn = el('button'); btn.id = 'ccg-btn'; btn.type = 'button'; btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-controls', 'ccg-panel');
  btn.append(el('span', null, '📖'), el('span', null, 'Guide'));
  const panel = el('div'); panel.id = 'ccg-panel'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Guide');
  document.body.append(btn, panel);

  const toggle = (open) => { panel.classList.toggle('open', open); btn.setAttribute('aria-expanded', String(open)); };
  btn.addEventListener('click', () => toggle(!panel.classList.contains('open')));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') toggle(false); });
  document.addEventListener('click', (e) => { if (!panel.contains(e.target) && !btn.contains(e.target)) toggle(false); });

  const here = location.pathname.split('/').pop() || 'index.html';
  const ago = (iso) => {
    const d = (Date.now() - new Date(iso)) / 864e5;
    if (d < 1 / 24) return 'just now';
    if (d < 1) return `${Math.round(d * 24)}h ago`;
    if (d < 14) return `${Math.round(d)}d ago`;
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  fetch('data/guide.json', { cache: 'no-cache' }).then((r) => r.json()).then((g) => {
    const titles = {};
    g.sections.forEach((s) => s.pages.forEach((p) => { titles[p.url] = p.title; }));

    const head = el('div', 'head'); const close = el('button', 'x', '×'); close.setAttribute('aria-label', 'Close guide'); close.onclick = () => toggle(false);
    head.append(el('b', null, '📖 Guide'), close);
    panel.append(head);
    if (g.intro) panel.append(el('div', 'intro', g.intro));

    if ((g.whatsNew || []).length) {
      const sec = el('div', 'sec'); sec.append(el('h3', null, '🆕 What\'s new'));
      g.whatsNew.slice(0, 8).forEach((w) => {
        const a = el('a', 'pg' + (w.href === here ? ' cur' : '')); a.href = w.href;
        const body = el('div'); body.style.minWidth = '0';
        body.append(el('div', 't', `${w.icon} ${w.text}`));
        a.append(body, el('span', 'when', w.date ? new Date(w.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''));
        sec.append(a);
      });
      panel.append(sec);
    }

    const recent = Object.entries(g.updates || {}).filter(([u]) => titles[u])
      .sort((a, b) => new Date(b[1].at) - new Date(a[1].at)).slice(0, 5);
    if (recent.length) {
      const sec = el('div', 'sec'); sec.append(el('h3', null, '🕒 Recently updated'));
      recent.forEach(([url, u]) => {
        const a = el('a', 'pg' + (url === here ? ' cur' : '')); a.href = url; a.title = u.change;
        const body = el('div'); body.style.minWidth = '0';
        const w = el('div', 'w', u.change); w.style.cssText = 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
        body.append(el('div', 't', titles[url]), w);
        a.append(body, el('span', 'when', ago(u.at)));
        sec.append(a);
      });
      panel.append(sec);
    }

    const order = el('div', 'sec'); order.append(el('h3', null, '🧭 Reading order'));
    let n = 0;
    g.sections.forEach((s) => {
      order.append(el('div', 'stitle', s.title));
      s.pages.forEach((p) => {
        n += 1;
        const a = el('a', 'pg' + (p.url === here ? ' cur' : '')); a.href = p.url;
        const body = el('div'); body.append(el('div', 't', p.title), el('div', 'w', p.why));
        a.append(el('span', 'n', String(n)), body);
        order.append(a);
      });
    });
    panel.append(order);
  }).catch(() => { panel.append(el('div', 'intro', 'Could not load data/guide.json')); });
})();
