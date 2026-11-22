// Favorites: a single list of pages saved in Azure Storage as one JSON document (favorites.json).
// The site is signed in to one owner, so one list is enough.

const FILE = 'favorites.json';
const PAGE = /^[a-z0-9-]+\.html$/;
const MAX = 100;

class ValidationError extends Error {
  constructor(message) { super(message); this.name = 'ValidationError'; }
}

/** Keep only well-formed, de-duplicated page entries. Throws ValidationError on a bad shape. */
function sanitize(input) {
  if (!input || !Array.isArray(input.pages)) throw new ValidationError('pages must be an array');
  if (input.pages.length > MAX) throw new ValidationError(`at most ${MAX} favorites`);
  const seen = new Set();
  const pages = [];
  for (const p of input.pages) {
    const url = typeof p?.url === 'string' ? p.url : '';
    if (!PAGE.test(url) || seen.has(url)) continue;
    seen.add(url);
    const title = String(p.title || url).slice(0, 120);
    const at = typeof p.at === 'string' && !Number.isNaN(Date.parse(p.at)) ? p.at : new Date().toISOString();
    pages.push({ url, title, at });
  }
  return { pages, updated: new Date().toISOString() };
}

module.exports = { FILE, sanitize, ValidationError, MAX };
