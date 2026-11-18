# AGENTS.md

Guidance for the content-calendar editor agent.

## Scope
- Edit content files only (index.html, calendar/, okrs/, strategy/, data/, etc.).
- Never modify `api/`, `.github/`, or anything containing credentials.
- Scripts in `scripts/` may be run when fresh data is needed.

## Merging
- Previously the user merged chat-branch PRs themselves. From now on the agent is responsible for merging its own PRs into `main` once the change is complete.
- The harness commits and pushes the change; do not commit manually. After the PR is open, merge it (e.g. `gh pr merge --merge`) unless the user says otherwise.

## Work-in-progress limit
- Maximum **3 videos per week** in progress (planned, writing, filming or editing at the same time). This applies to every week in the sprint.
- Reason: the user has other responsibilities, so the production load is capped.
- Before adding a video to any week, check that the week already has fewer than 3. If it has 3, move one out or drop one; do not exceed the limit.
- Changes that add supply (e.g. a new developer-tooling video) must swap out an existing item in the same week.
