/* Page diagram: draws this page's flow diagram (data/diagrams.json) under its main heading.
 * Pages whose entry has "builtIn" already draw their own diagram, so nothing is added.
 * Placement: an element with id="cc-diagram" if present; else after the section holding the
 * first <h1>; else at the top of <main>. Safe to include on any page. */
(() => {
  const css = `
  .ccd{margin:0 auto 2rem;max-width:72rem;padding:0 1rem}
  .ccd-box{border:1px solid #1e293b;background:linear-gradient(180deg,rgba(30,41,59,.45),rgba(15,23,42,.6));border-radius:16px;padding:16px 18px}
  .ccd-h{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;font:700 13px Inter,system-ui,sans-serif;color:#e2e8f0}
  .ccd-loop{font:600 11px Inter,system-ui,sans-serif;color:#a5b4fc;border:1px solid rgba(99,102,241,.4);border-radius:999px;padding:2px 10px;background:rgba(49,46,129,.3)}
  .ccd-flow{display:flex;align-items:stretch;gap:6px;margin-top:14px;overflow-x:auto;padding-bottom:2px}
  .ccd-n{flex:1 1 0;min-width:104px;text-align:center;border:1px solid #334155;background:#0f172a;border-radius:12px;padding:10px 8px}
  .ccd-e{font-size:24px;line-height:1}
  .ccd-t{font:700 12.5px Inter,system-ui,sans-serif;color:#fff;margin-top:6px}
  .ccd-d{font:400 11px Inter,system-ui,sans-serif;color:#94a3b8;margin-top:2px}
  .ccd-a{flex:none;align-self:center;color:#6366f1;font-size:18px;font-weight:700}
  @media (max-width:640px){.ccd-flow{flex-direction:column;overflow:visible}.ccd-n{display:flex;align-items:center;gap:10px;text-align:left;min-width:0}.ccd-n .ccd-e{font-size:22px}.ccd-n .ccd-t{margin-top:0}.ccd-a{transform:rotate(90deg);margin:-2px auto}}
  `;
  const page = location.pathname.split('/').pop() || 'index.html';
  fetch('data/diagrams.json', { cache: 'no-cache' }).then((r) => r.json()).then((all) => {
    const d = all.pages && all.pages[page];
    if (!d || d.builtIn) return;
    const st = document.createElement('style'); st.textContent = css; document.head.append(st);
    const el = (cls, text) => { const n = document.createElement('div'); n.className = cls; if (text) n.textContent = text; return n; };
    const wrap = el('ccd'); wrap.setAttribute('role', 'figure'); wrap.setAttribute('aria-label', d.title);
    const box = el('ccd-box'); const h = el('ccd-h'); h.append(el('', d.title));
    if (d.loop) h.append(el('ccd-loop', `🔁 ${d.loop}`));
    const flow = el('ccd-flow');
    d.steps.forEach((s, i) => {
      if (i) flow.append(el('ccd-a', '→'));
      const n = el('ccd-n'); n.append(el('ccd-e', s.e));
      const txt = el(''); txt.append(el('ccd-t', s.t)); if (s.d) txt.append(el('ccd-d', s.d)); n.append(txt);
      flow.append(n);
    });
    box.append(h, flow); wrap.append(box);
    const slot = document.getElementById('cc-diagram');
    if (slot) { slot.append(wrap); return; }
    const h1 = document.querySelector('main h1, h1');
    const anchor = h1 && (h1.closest('section') || h1.parentElement);
    if (anchor && anchor.tagName !== 'BODY' && anchor.tagName !== 'MAIN') { wrap.style.marginTop = '1.5rem'; anchor.after(wrap); return; }
    const main = document.querySelector('main');
    if (main) { wrap.style.padding = '0'; wrap.style.marginTop = '0'; main.prepend(wrap); }
  }).catch(() => {});
})();
