/* Shared footer line: shows when the site was last deployed (read from data/deploy.json,
 * which scripts/ship.sh stamps on every deploy). Safe to include on any page. */
(() => {
  const fmt = (iso) => new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
  const bar = document.createElement('div');
  bar.id = 'cc-deploy-footer';
  bar.setAttribute('style', 'position:fixed;left:0;right:0;bottom:0;z-index:40;text-align:center;font:500 11px system-ui,sans-serif;color:#64748b;background:rgba(2,6,23,.85);border-top:1px solid #1e293b;padding:5px 10px;backdrop-filter:blur(6px)');
  bar.textContent = 'Last deployed: loading…';
  document.body.append(bar);
  // Keep page content clear of the bar.
  document.body.style.paddingBottom = '30px';
  fetch('data/deploy.json', { cache: 'no-cache' })
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => { bar.textContent = d?.deployedAt ? `Last deployed: ${fmt(d.deployedAt)}${d.commit ? ' · ' + d.commit : ''}` : 'Last deployed: unknown'; })
    .catch(() => { bar.textContent = 'Last deployed: unknown'; });
})();
