/* Sprint cards: who each video is for + a live countdown to its publish slot.
 * Reads each card's day label ("Mon • Short", "Sun 13:30 • Skool Live") and its week's date range
 * ("Nov 18 – Nov 24"), then appends a badge and a ticking countdown to the end of the card.
 * Cards without a time are due at end of that day (local time). */
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

  const pill = (text, color) => {
    const s = document.createElement('span');
    s.textContent = text;
    s.style.cssText = `display:inline-block;font-size:10px;font-weight:700;padding:2px 6px;border-radius:999px;border:1px solid ${color}55;color:${color};background:${color}1a`;
    return s;
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

  const clocks = [];
  for (const card of document.querySelectorAll('[id*="-item-"]')) {
    const label = card.querySelector('span')?.textContent.trim() || '';   // e.g. "Sun 13:30 • Skool Live"
    const dayMatch = label.match(/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)\b/);
    const timeMatch = label.match(/(\d{2}:\d{2})/);
    const type = label.split('•')[1]?.trim() || '';
    const aud = AUDIENCE[type];
    const slot = dayMatch ? slotFor(card, dayMatch[1], timeMatch?.[1]) : null;

    const box = document.createElement('div');
    box.style.cssText = 'margin-top:10px;padding-top:8px;border-top:1px dashed #334155;display:flex;flex-wrap:wrap;align-items:center;gap:6px;justify-content:space-between';
    const left = document.createElement('div');
    left.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;align-items:center';
    if (aud) {
      left.append(pill(`👥 For: ${aud.who}`, aud.color));
      const n = document.createElement('span'); n.textContent = aud.note; n.style.cssText = 'font-size:10px;color:#94a3b8'; left.append(n);
    } else {
      left.append(pill('👥 For: not set', '#64748b'));
    }
    const clock = document.createElement('span');
    clock.style.cssText = 'font-size:11px;font-family:ui-monospace,monospace;color:#e2e8f0;white-space:nowrap';
    box.append(left, clock);
    card.append(box);

    if (slot) clocks.push({ el: clock, at: slot });
    else clock.textContent = '⏱ no publish slot';
  }

  const tick = () => {
    const now = Date.now();
    for (const c of clocks) {
      const left = c.at.getTime() - now;
      if (left <= 0) { c.el.textContent = `⏱ due ${c.at.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })} — passed`; c.el.style.color = '#f87171'; }
      else {
        c.el.textContent = `⏱ ${fmt(left)} left · due ${c.at.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}`;
        c.el.style.color = left < 86400000 ? '#fbbf24' : '#e2e8f0';
      }
    }
  };
  tick();
  setInterval(tick, 1000);
})();
