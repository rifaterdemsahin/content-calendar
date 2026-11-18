const crypto = require('node:crypto');

const clip = (s, n) => String(s ?? '').slice(0, n);

/** Validate + normalise user input into a note record. */
function buildNote(input, existing) {
  const text = clip(input.text, 8000).trim();
  if (!text) throw new Error('text is required');
  const now = new Date().toISOString();
  return {
    id: existing?.id || crypto.randomUUID(),
    page: clip(input.page ?? existing?.page ?? '/', 300),
    anchor: clip(input.anchor ?? existing?.anchor ?? '', 200),
    concept: clip(input.concept ?? existing?.concept ?? '', 300),
    text,
    created: existing?.created || now,
    updated: now,
  };
}

/** Group notes by page then anchor and render one pasteable Markdown block. */
function toMarkdown(notes) {
  if (!notes.length) return '_No notes._\n';
  const byPage = new Map();
  for (const n of [...notes].sort((a, b) => a.created.localeCompare(b.created))) {
    if (!byPage.has(n.page)) byPage.set(n.page, []);
    byPage.get(n.page).push(n);
  }
  const out = [];
  for (const [page, list] of byPage) {
    out.push(`## ${page}`);
    for (const n of list) {
      const where = [n.anchor && `#${n.anchor}`, n.concept && `“${n.concept}”`].filter(Boolean).join(' · ');
      const body = n.text.split('\n').map((l, i) => (i ? `  ${l}` : l)).join('\n');
      out.push(`- ${where ? `**${where}** — ` : ''}${body}`);
    }
    out.push('');
  }
  return out.join('\n');
}

module.exports = { buildNote, toMarkdown };
