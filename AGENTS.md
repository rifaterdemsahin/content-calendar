# AGENTS.md

Guidance for the content-calendar editor agent.

## Scope
- Edit content files only (index.html, calendar/, okrs/, strategy/, data/, etc.).
- Never modify `api/`, `.github/`, or anything containing credentials.
- Scripts in `scripts/` may be run when fresh data is needed.

## Chat changes: commit, merge and publish automatically
- The dashboard chat agent edits files only. It does not run git, gh or fly.
- When the agent finishes, the harness commits the change, opens a pull request, squash-merges it into `main` and waits for the live site to publish.
- Publishing is the "Deploy to Fly.io" workflow (`.github/workflows/deploy-fly.yml` for content, `deploy.yml` for server and API changes). Both run on the merge commit.
- The chat then shows "Merged into main and live on the site" and a refresh button in the centre of the page. If publishing fails, the chat shows the error and no button.
- Merges are never left for a person to do by hand. If a merge conflicts, the job reports the error and nothing is merged.
- Changes to `api/`, `server/` or `.github/` are not made by the chat agent. Those are changed by a person, through a reviewed commit.

## Work-in-progress limit
- Maximum **3 videos per week** in progress (planned, writing, filming or editing at the same time). This applies to every week in the sprint.
- Reason: the user has other responsibilities, so the production load is capped.
- Before adding a video to any week, check that the week already has fewer than 3. If it has 3, move one out or drop one; do not exceed the limit.
- Changes that add supply (e.g. a new developer-tooling video) must swap out an existing item in the same week.

## Page style: emojis and diagrams on every page
- Every page heading (h1/h2) starts with a fitting emoji.
- Every page has a diagram. Add an entry for the page in `data/diagrams.json` (title + emoji steps); `assets/cc-diagram.js` draws it under the main heading. Use `"builtIn"` only when the page already draws its own diagram.
- Every page has its own emoji favicon: a `<link rel="icon">` SVG data URI right after `<title>`, using an emoji no other page uses.
- Pages are linked both ways: `assets/cc-pagenav.js` shows Previous/Next (Guide reading order) and Related pages from `data/guide.json` `links` (undirected pairs with a reason). Every page needs at least 2 links.
- New pages must also load `assets/cc-guide.js`, `assets/cc-diagram.js` and `assets/cc-pagenav.js`, and be listed in `data/guide.json`. Tests enforce this.
