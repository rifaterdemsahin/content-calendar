# AGENTS.md

Guidance for the content-calendar editor agent.

## Scope
- Edit content files only (index.html, calendar/, okrs/, strategy/, data/, etc.).
- Never modify `api/`, `.github/`, or anything containing credentials.
- Scripts in `scripts/` may be run when fresh data is needed.

## Merging
- Previously the user merged chat-branch PRs themselves. From now on the agent is responsible for merging its own PRs into `main` once the change is complete.
- The harness commits and pushes the change; do not commit manually. After the PR is open, merge it (e.g. `gh pr merge --merge`) unless the user says otherwise.
