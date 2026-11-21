/* Shared footer line on every page: 🚀 when the site was last deployed, ⏱️ how long ago (kept live),
 * and 🔗 the commit (linked to GitHub). Reads data/deploy.json, which the Fly deploy workflow and
 * scripts/ship.sh stamp on every deploy. Safe to include on any page. */
(() => {
  if (document.getElementById('cc-deploy-footer')) return;
  const REPO = 'https://github.com/rifaterdemsahin/content-calendar';
  const fmt = (iso) => new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
  const ago = (iso) => {
    const s = Math.max(0, Math.round((Date.now() - new Date(iso)) / 1000));
    if (s < 60) return 'just now';
    const m = Math.round(s / 60); if (m < 60) return `${m} min ago`;
    const h = Math.round(m / 60); if (h < 48) return `${h} hour${h === 1 ? '' : 's'} ago`;
    const d = Math.round(h / 24); return `${d} days ago`;
  };
  const bar = document.createElement('div');
  bar.id = 'cc-deploy-footer';
  bar.setAttribute('role', 'contentinfo');
  bar.setAttribute('style', 'position:fixed;left:0;right:0;bottom:0;z-index:40;display:flex;justify-content:center;align-items:center;gap:10px;flex-wrap:wrap;font:500 11.5px system-ui,sans-serif;color:#94a3b8;background:rgba(2,6,23,.9);border-top:1px solid #1e293b;padding:5px 10px;backdrop-filter:blur(6px)');
  bar.textContent = '🚀 Last deployed: loading…';
  document.body.append(bar);
  document.body.style.paddingBottom = '34px'; // keep page content clear of the bar

  const part = (text, title) => { const s = document.createElement('span'); s.textContent = text; if (title) s.title = title; return s; };
  fetch('data/deploy.json', { cache: 'no-cache' })
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      if (!d?.deployedAt) { bar.textContent = '🚀 Last deployed: unknown'; return; }
      const when = part(`🚀 Last deployed ${fmt(d.deployedAt)}`, d.deployedAt);
      const rel = part(`⏱️ ${ago(d.deployedAt)}`);
      bar.replaceChildren(when, part('·'), rel);
      if (d.commit) {
        const a = document.createElement('a');
        a.href = `${REPO}/commit/${d.commit}`; a.target = '_blank'; a.rel = 'noopener';
        a.textContent = `🔗 ${d.commit}`; a.title = 'Open this commit on GitHub';
        a.setAttribute('style', 'color:#a5b4fc;text-decoration:none;font-family:ui-monospace,monospace');
        bar.append(part('·'), a);
      }
      setInterval(() => { rel.textContent = `⏱️ ${ago(d.deployedAt)}`; }, 30000);
    })
    .catch(() => { bar.textContent = '🚀 Last deployed: unknown'; });
})();
