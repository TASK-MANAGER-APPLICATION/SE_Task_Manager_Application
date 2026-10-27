# Contributing

## Branches

- main is protected and holds tagged releases.
- develop is the integration branch.
- feature/<FR-id>-<name> for features, for example feature/FR-10-create-task. Use fix/, test/, docs/ and chore/ prefixes for the rest.

Merge to develop by pull request only. At the end of each sprint, merge develop to main and tag it.

## Commits

Format is type(scope): summary (FR-xx).

Types are feat, fix, test, docs, chore, ci, refactor, perf and style.

Example: feat(tasks): add task creation (FR-10)

Commit small and push the same day. Never backdate commits or edit timestamps. If a planned commit slips, push what works that day with an honest message. Fix commits for defects end with (closes #n).

## Pull requests

1. Link the issue and the FR or NFR IDs.
2. Describe what changed and how it was tested.
3. Wait for green CI.
4. One other member reviews. Amrita reviews Shrungashree and Abdullah, Shrungashree reviews Amrita, Abdullah reviews Shivanand.

## Definition of Ready

A story has an ID, FR/NFR links, acceptance criteria in Given/When/Then form and a points estimate of 1, 2, 3 or 5.

## Definition of Done

- Unit tests are in the same commit as the code.
- CI is green.
- One other member has reviewed the pull request.
- The OpenAPI file reflects any endpoint change.
- The RTM line is updated.
- The independent test cases pass.
- No Critical or High defect is open on it.
- Shivanand has accepted it.

## Defects

Raise a GitHub Issue with labels for severity and the sprint it was found in. Critical bugs are fixed within 24 hours. Abdullah retests and closes.

## Secrets

Never commit .env files, google-services.json or Firebase service account keys.
