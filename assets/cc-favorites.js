/* Favorites: a ☆/★ button on every page (bottom right, next to the notes button) and a ⭐ Favorites
 * menu in the top navigation. The list is saved per site in Azure Storage via /api/favorites.
 * Signed out (or no API) → the button and menu stay hidden. Include after cc-widget.js:
 *   <script src="assets/cc-favorites.js" data-api="/api"></script> */
(() => {
  const API = (document.currentScript?.dataset.api || '/api').replace(/\/$/, '');
  const HERE = location.pathname.split('/').pop() || 'index.html';

  const css = `
  #ccf-star{position:fixed;right:138px;bottom:44px;z-index:99998;width:52px;height:52px;border-radius:50%;border:0;background:#334155;color:#cbd5e1;font-size:22px;line-height:1;cursor:pointer;box-shadow:0 4px 16px #0008;transition:transform .15s,background .15s;display:none}
  #ccf-star:hover{transform:scale(1.05)}
  #ccf-star.on{background:#f59e0b;color:#1c1917}
  @media (max-width:640px){#ccf-star{right:132px;bottom:40px}}
  #ccf-dd{display:none}
  #ccf-dd .dd-panel{display:none;position:absolute;left:0;top:100%;padding-top:4px;z-index:50}
  #ccf-dd.open .dd-panel,#ccf-dd:hover .dd-panel,#ccf-dd:focus-within .dd-panel{display:block}
  #ccf-menu{min-width:15rem;max-width:20rem;max-height:70vh;overflow-y:auto;border-radius:10px;background:#0f172a;border:1px solid #334155;box-shadow:0 12px 40px #000c;padding:6px}
  .ccf-row{display:flex;align-items:center;gap:4px}
  .ccf-row a{flex:1;min-width:0;display:block;padding:7px 9px;border-radius:7px;color:#e2e8f0;text-decoration:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:13px}
  .ccf-row a:hover{background:#1e293b;color:#a5b4fc}
  .ccf-row a.here{color:#fde68a}
  .ccf-x{background:none;border:0;color:#64748b;cursor:pointer;padding:4px 7px;border-radius:6px;font-size:13px}
  .ccf-x:hover{color:#fca5a5;background:#1e293b}
  .ccf-empty{padding:8px 9px;color:#94a3b8;font-size:12px;line-height:1.45}
  .ccf-h{font:700 11px system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#818cf8;padding:10px 9px 4px}
  #ccf-toast{position:fixed;left:50%;bottom:110px;transform:translateX(-50%);z-index:100015;background:#1e293b;color:#e2e8f0;border:1px solid #475569;border-radius:8px;padding:8px 14px;font:13px system-ui,sans-serif;box-shadow:0 8px 24px #000a;display:none}
  `;
  const style = document.createElement('style'); style.textContent = css; document.head.append(style);

  const el = (tag, props = {}) => Object.assign(document.createElement(tag), props);
  const star = el('button', { id: 'ccf-star', type: 'button', textContent: '☆' });
  star.setAttribute('aria-label', 'Add this page to favorites');
  document.body.append(star);
  const toast = el('div', { id: 'ccf-toast' }); document.body.append(toast);
  let toastTimer;
  const flash = (msg) => { toast.textContent = msg; toast.style.display = 'block'; clearTimeout(toastTimer); toastTimer = setTimeout(() => { toast.style.display = 'none'; }, 2200); };

  // Top navigation menu (only on pages that have the Sections nav).
  const nav = document.querySelector('nav[aria-label="Sections"]');
  let dd = null, menu = null, mobile = null;
  if (nav) {
    dd = el('div', { id: 'ccf-dd', className: 'dd relative' });
    const btn = el('button', { type: 'button', className: 'dd-btn px-2.5 py-1.5 rounded-md hover:bg-slate-800 hover:text-indigo-300 flex items-center gap-1.5', textContent: '⭐ Favorites ' });
    btn.setAttribute('aria-haspopup', 'true'); btn.setAttribute('aria-expanded', 'false');
    btn.append(el('i', { className: 'fas fa-chevron-down text-[9px] opacity-60' }));
    const wrap = el('div', { className: 'dd-panel' });
    menu = el('div', { id: 'ccf-menu' });
    wrap.append(menu); dd.append(btn, wrap); nav.prepend(dd);
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = !dd.classList.contains('open');
      dd.classList.toggle('open', open); btn.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', (e) => { if (!dd.contains(e.target)) { dd.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); } });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { dd.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); } });
  }
  let pages = null;      // null = signed out / unavailable; otherwise the saved list
  let titles = {};       // url → title from the Guide, used when a page is first favorited

  const isFav = (url) => !!pages?.some((p) => p.url === url);
  const linkRow = (p) => {
    const row = el('div', { className: 'ccf-row' });
    const a = el('a', { href: p.url, textContent: p.title });
    if (p.url === HERE) a.className = 'here';
    const x = el('button', { type: 'button', className: 'ccf-x', textContent: '✕', title: 'Remove from favorites' });
    x.setAttribute('aria-label', `Remove ${p.title} from favorites`);
    x.onclick = (e) => { e.preventDefault(); toggle(p.url, p.title); };
    row.append(a, x);
    return row;
  };
  const fill = (container, heading) => {
    if (!container) return;
    const head = el('div', { className: 'ccf-h', textContent: heading });
    const body = pages?.length
      ? pages.map(linkRow)
      : [el('div', { className: 'ccf-empty', textContent: 'No favorites yet. Click ☆ on any page to save it here.' })];
    container.replaceChildren(head, ...body);
  };
  function render() {
    if (!pages) { star.style.display = 'none'; if (dd) dd.style.display = 'none'; if (mobile) mobile.replaceChildren(); return; }
    const on = isFav(HERE);
    star.style.display = 'block';
    star.classList.toggle('on', on);
    star.textContent = on ? '★' : '☆';
    star.title = on ? 'Remove from favorites' : 'Add to favorites';
    star.setAttribute('aria-pressed', String(on));
    // Phone menu: cc-mobile-nav.js builds #mobile-nav; add a Favorites group there too.
    if (!mobile) { const m = document.getElementById('mobile-nav'); if (m) { mobile = el('div'); m.append(mobile); } }
    if (dd) { dd.style.display = 'block'; fill(menu, '⭐ Favorites'); }
    if (mobile) fill(mobile, '⭐ Favorites');
  }

  async function save(next, action) {
    const prev = pages;
    pages = next; render();
    try {
      const res = await fetch(API + '/favorites', { method: 'PUT', credentials: 'same-origin',
        headers: { 'content-type': 'application/json' }, body: JSON.stringify({ pages: next }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
      pages = (await res.json()).pages || next; render();
    } catch (e) {
      pages = prev; render();
      flash(`Could not ${action} favorites: ${e.message}`);
    }
  }
  function toggle(url, title) {
    if (!pages) return;
    if (isFav(url)) {
      flash('Removed from favorites');
      save(pages.filter((p) => p.url !== url), 'remove');
    } else {
      flash('Saved to favorites');
      save([...pages, { url, title: title || titles[url] || document.title || url, at: new Date().toISOString() }], 'save');
    }
  }

  star.addEventListener('click', () => toggle(HERE));

  // Sign-in state comes from the API: 401 means signed out, and everything stays hidden.
  (async () => {
    try {
      const [guide, res] = await Promise.all([
        fetch('data/guide.json', { cache: 'no-cache' }).then((r) => r.json()).catch(() => null),
        fetch(API + '/favorites', { credentials: 'same-origin' }),
      ]);
      if (guide) for (const s of guide.sections || []) for (const p of s.pages || []) titles[p.url] = p.title;
      if (!res.ok) { pages = null; render(); return; }
      pages = (await res.json()).pages || [];
    } catch { pages = null; }
    render();
  })();
})();
