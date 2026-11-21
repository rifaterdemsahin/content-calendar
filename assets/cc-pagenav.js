/* Page navigation: bidirectional links at the bottom of every page.
 *  - Previous / Next follow the Guide's reading order (data/guide.json sections), so
 *    A → next B always means B → previous A.
 *  - Related pages come from data/guide.json "links": undirected pairs [a, b, why], so
 *    every related link has a matching link back.
 * Placement: an element with id="cc-pagenav" if present; else just before <footer>; else end of <main>/<body>. */
(() => {
  const css = `
  .ccn{max-width:72rem;margin:2.5rem auto 1.5rem;padding:0 1rem;font-family:Inter,system-ui,sans-serif}
  .ccn-box{border:1px solid #1e293b;border-radius:16px;background:rgba(15,23,42,.7);padding:16px}
  .ccn-h{font:700 11px Inter,system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#818cf8}
  .ccn-pn{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}
  .ccn a{color:inherit;text-decoration:none}
  .ccn-card{display:block;border:1px solid #334155;border-radius:12px;padding:10px 12px;background:#0f172a;transition:border-color .15s}
  .ccn-card:hover{border-color:#6366f1}
  .ccn-k{font-size:11px;color:#94a3b8}
  .ccn-t{font-size:14px;font-weight:700;color:#fff;margin-top:2px}
  .ccn-next{text-align:right}
  .ccn-empty{opacity:.45;pointer-events:none}
  .ccn-rel{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px;margin-top:10px}
  .ccn-rel .ccn-t{font-size:13px}
  .ccn-w{font-size:11.5px;color:#94a3b8;margin-top:2px}
  `;
  const here = location.pathname.split('/').pop() || 'index.html';
  fetch('data/guide.json', { cache: 'no-cache' }).then((r) => r.json()).then((g) => {
    const order = []; const meta = {};
    g.sections.forEach((s) => s.pages.forEach((p) => { order.push(p.url); meta[p.url] = { ...p, section: s.title }; }));
    const i = order.indexOf(here);
    if (i < 0) return;
    const st = document.createElement('style'); st.textContent = css; document.head.append(st);
    const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
    const card = (url, kicker, cls) => {
      if (!url) { const d = el('div', `ccn-card ccn-empty ${cls}`); d.append(el('div', 'ccn-k', kicker), el('div', 'ccn-t', '—')); return d; }
      const a = el('a', `ccn-card ${cls}`); a.href = url;
      a.append(el('div', 'ccn-k', kicker), el('div', 'ccn-t', meta[url].title));
      return a;
    };
    const wrap = el('nav', 'ccn'); wrap.setAttribute('aria-label', 'Page navigation');
    const box = el('div', 'ccn-box');
    box.append(el('div', 'ccn-h', `🧭 Keep going · step ${i + 1} of ${order.length} · ${meta[here].section}`));
    const pn = el('div', 'ccn-pn');
    pn.append(card(order[i - 1], '← Previous', ''), card(order[i + 1], 'Next →', 'ccn-next'));
    box.append(pn);
    const rel = [];
    (g.links || []).forEach(([a, b, why]) => { if (a === here && meta[b]) rel.push([b, why]); else if (b === here && meta[a]) rel.push([a, why]); });
    if (rel.length) {
      const h = el('div', 'ccn-h', '🔗 Related pages'); h.style.marginTop = '16px'; box.append(h);
      const grid = el('div', 'ccn-rel');
      rel.forEach(([url, why]) => { const a = el('a', 'ccn-card'); a.href = url; a.append(el('div', 'ccn-t', meta[url].title), el('div', 'ccn-w', why)); grid.append(a); });
      box.append(grid);
    }
    wrap.append(box);
    const slot = document.getElementById('cc-pagenav');
    if (slot) { slot.append(wrap); return; }
    const footer = document.querySelector('body > footer, footer');
    if (footer) footer.before(wrap); else (document.querySelector('main') || document.body).append(wrap);
  }).catch(() => {});
})();
