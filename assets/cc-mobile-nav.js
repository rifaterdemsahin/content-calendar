/* Phone menu for the dashboard header. The desktop nav (nav[aria-label="Sections"]) is hidden below
 * 768px, so this copies its links into a ☰ Menu panel that only shows on small screens. */
(() => {
  const nav = document.querySelector('nav[aria-label="Sections"]');
  const header = document.querySelector('header');
  if (!nav || !header) return;
  const actions = header.querySelector(':scope > div > div:last-child');
  if (!actions) return;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = '☰';
  btn.title = 'Menu';
  btn.setAttribute('aria-label', 'Menu');
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-controls', 'mobile-nav');
  btn.style.cssText = 'font-size:16px;line-height:1;padding:6px 9px;border-radius:8px;background:#1e293b;color:#e2e8f0;border:1px solid #334155';

  const panel = document.createElement('div');
  panel.id = 'mobile-nav';
  panel.style.cssText = 'display:none;position:fixed;left:12px;right:12px;top:58px;z-index:60;max-height:70vh;overflow-y:auto;background:#0f172a;border:1px solid #334155;border-radius:14px;box-shadow:0 12px 40px #000c;padding:8px';

  // Copy each dropdown as a labelled group of plain links.
  for (const dd of nav.querySelectorAll('.dd')) {
    const title = dd.querySelector('.dd-btn')?.textContent.replace(/\s+/g, ' ').trim();
    if (title) {
      const h = document.createElement('div');
      h.textContent = title;
      h.style.cssText = 'font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#818cf8;padding:10px 10px 4px';
      panel.append(h);
    }
    for (const a of dd.querySelectorAll('a')) {
      const link = document.createElement('a');
      link.href = a.getAttribute('href');
      link.textContent = a.textContent.trim();
      link.style.cssText = 'display:block;padding:9px 10px;border-radius:8px;font-size:14px;color:#e2e8f0;text-decoration:none';
      link.addEventListener('click', () => close());
      panel.append(link);
    }
  }

  const close = () => { panel.style.display = 'none'; btn.setAttribute('aria-expanded', 'false'); };
  btn.addEventListener('click', () => {
    const open = panel.style.display !== 'block';
    panel.style.display = open ? 'block' : 'none';
    btn.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  // Only show the button on small screens.
  const mq = window.matchMedia('(min-width: 768px)');
  const sync = () => { if (mq.matches) { close(); btn.style.display = 'none'; } else btn.style.display = ''; };
  mq.addEventListener('change', sync);
  sync();

  actions.prepend(btn);
  document.body.append(panel);
})();
