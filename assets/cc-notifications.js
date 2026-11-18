/* Notification bell: top-right of the header on every page.
   Data: data/notifications.json. Read state is kept in localStorage (optional). */
(function () {
  var KEY = 'cc-notifications-read';
  var SEV = {
    critical: { label: 'Critical', dot: 'bg-red-500', chip: 'bg-red-500/15 text-red-300 border-red-500/30', rank: 0 },
    warning:  { label: 'Warning',  dot: 'bg-amber-400', chip: 'bg-amber-500/15 text-amber-300 border-amber-500/30', rank: 1 },
    info:     { label: 'Info',     dot: 'bg-sky-400', chip: 'bg-sky-500/15 text-sky-300 border-sky-500/30', rank: 2 }
  };

  function loadRead() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; }
  }
  function saveRead(ids) {
    try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch (e) {}
  }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function safeHref(h) {
    return /^(https?:\/\/|[a-z0-9_\-\/.]+(\.html)?(#[\w\-]*)?$|#)/i.test(h) && !/^javascript:/i.test(h) ? h : '#';
  }

  var header = document.querySelector('header');
  if (!header) return;
  var yt = header.querySelector('a[href*="youtube.com"]');
  var host = (yt && yt.parentElement) || header.querySelector(':scope > div') || header;

  var wrap = el('div', 'relative');
  var btn = el('button', 'relative text-xs px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition');
  btn.type = 'button';
  btn.setAttribute('aria-haspopup', 'true');
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-label', 'Notifications');
  btn.appendChild(el('span', null, '🔔'));
  var badge = el('span', 'hidden min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold items-center justify-center leading-none');
  btn.appendChild(badge);

  var panel = el('div', 'hidden fixed sm:absolute right-3 sm:right-0 top-14 sm:top-full sm:mt-2 w-[min(94vw,26rem)] max-h-[75vh] overflow-y-auto rounded-xl bg-slate-900 border border-slate-700 shadow-2xl z-[60] text-left');
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-label', 'Notifications');

  wrap.appendChild(btn);
  wrap.appendChild(panel);
  host.insertBefore(wrap, host.firstChild);

  var items = [];
  var read = loadRead();

  function unreadCount() {
    return items.filter(function (i) { return read.indexOf(i.id) < 0; }).length;
  }
  function renderBadge() {
    var n = unreadCount();
    badge.textContent = n > 9 ? '9+' : String(n);
    badge.classList.toggle('hidden', n === 0);
    badge.classList.toggle('flex', n > 0);
    btn.setAttribute('aria-label', 'Notifications, ' + n + ' unread');
  }
  function renderPanel() {
    panel.textContent = '';
    var head = el('div', 'sticky top-0 bg-slate-900 flex items-center justify-between px-4 py-3 border-b border-slate-800');
    head.appendChild(el('span', 'font-semibold text-white text-sm', 'Notifications'));
    var mark = el('button', 'text-xs text-indigo-400 hover:text-indigo-300', 'Mark all read');
    mark.type = 'button';
    mark.addEventListener('click', function () {
      read = items.map(function (i) { return i.id; });
      saveRead(read); renderBadge(); renderPanel();
    });
    head.appendChild(mark);
    panel.appendChild(head);

    if (!items.length) {
      panel.appendChild(el('p', 'p-4 text-sm text-slate-400', 'Nothing to show right now.'));
      return;
    }
    items.forEach(function (i) {
      var s = SEV[i.severity] || SEV.info;
      var isRead = read.indexOf(i.id) >= 0;
      var card = el('div', 'px-4 py-3 border-b border-slate-800 ' + (isRead ? 'opacity-60' : ''));
      var top = el('div', 'flex items-center gap-2');
      top.appendChild(el('span', 'w-2 h-2 rounded-full shrink-0 ' + s.dot));
      top.appendChild(el('span', 'text-sm font-semibold text-white flex-1', i.title));
      top.appendChild(el('span', 'text-[10px] px-1.5 py-0.5 rounded-full border ' + s.chip, s.label));
      card.appendChild(top);
      card.appendChild(el('p', 'text-xs text-slate-400 mt-1.5 leading-relaxed', i.detail));
      var rec = el('p', 'text-xs text-emerald-300 mt-2 leading-relaxed');
      rec.appendChild(el('strong', null, 'Recommendation: '));
      rec.appendChild(document.createTextNode(i.recommendation));
      card.appendChild(rec);
      var links = el('div', 'flex flex-wrap gap-2 mt-2');
      (i.links || []).forEach(function (l) {
        var a = el('a', 'text-xs px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700', l.label + ' →');
        a.href = safeHref(l.href);
        if (/^https?:/i.test(l.href)) { a.target = '_blank'; a.rel = 'noopener'; }
        else a.addEventListener('click', function () { setOpen(false); });
        links.appendChild(a);
      });
      if (!isRead) {
        var done = el('button', 'text-xs px-2 py-1 text-slate-400 hover:text-slate-200 ml-auto', 'Mark read');
        done.type = 'button';
        done.addEventListener('click', function () {
          read.push(i.id); saveRead(read); renderBadge(); renderPanel();
        });
        links.appendChild(done);
      }
      card.appendChild(links);
      panel.appendChild(card);
    });
    panel.appendChild(el('p', 'px-4 py-2 text-[11px] text-slate-500', 'Updated ' + (window.__ccNotifUpdated || '') + '. Source: data/notifications.json'));
  }

  function setOpen(open) {
    panel.classList.toggle('hidden', !open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    setOpen(panel.classList.contains('hidden'));
  });
  document.addEventListener('click', function (e) { if (!wrap.contains(e.target)) setOpen(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { setOpen(false); btn.focus(); } });

  fetch('data/notifications.json', { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (d) {
      window.__ccNotifUpdated = d.updated || '';
      items = (d.items || []).slice().sort(function (a, b) {
        return (SEV[a.severity] || SEV.info).rank - (SEV[b.severity] || SEV.info).rank;
      });
      renderBadge(); renderPanel();
    })
    .catch(function () {
      panel.textContent = '';
      panel.appendChild(el('p', 'p-4 text-sm text-slate-400', 'Could not load notifications.'));
    });
})();
