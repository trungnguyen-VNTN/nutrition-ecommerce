# Frontend verification — 2026-10-29

Status: not accepted; waiting for dependency approval. No dependency version, lockfile, Git branch, or AGENTS.md was changed in this review.

## Evidence

- `dependencies.json`: npm registry metadata for all 35 direct dependencies and initial patch candidates. All currently pinned direct dependencies are older than 21 days. Ages use the start of 2026-10-29 in Asia/Saigon as a conservative cutoff; timestamps are UTC.
- `patch-candidates.json`: metadata for older patched alternatives and their Node/peer requirements.
- `audit.json`: fresh npm audit result: 7 affected package entries (1 low, 1 moderate, 4 high, 1 critical). This is a package count, not seven unique advisory IDs.
- `react-query-installation.json`: official package archive passed its SHA-512 integrity check. Both missing React Query declarations exist in the archive but not in the installed tree. No archive files were extracted or installed.

## Actual checks

| Check                       | Result  | Evidence / blocker                                                                                              |
| --------------------------- | ------- | --------------------------------------------------------------------------------------------------------------- |
| Format and format:check     | PASS    | npm scripts completed after evidence files were written                                                         |
| ESLint                      | PASS    | `npm.cmd run lint`, zero warnings                                                                               |
| Typecheck                   | FAIL    | React Query declarations missing; axe resolves playwright-core 1.64.1 while test runner uses 1.56.1             |
| Dependency tree             | FAIL    | `npm ls` reports ELSPROBLEMS: installed core does not match existing 1.56.1 override                            |
| Unit tests                  | BLOCKED | Command failed before collecting/running tests: four workers cannot resolve css-tree required by cssstyle/jsdom |
| Production build            | FAIL    | Stops at TypeScript; Vite bundling and production asset check are not reached                                   |
| E2E / axe                   | BLOCKED | Existing Playwright configuration starts production preview using the failing build                             |
| Screenshots / visual review | BLOCKED | Same web-server prerequisite; no new screenshots or visual-pass claims                                          |
| Production mock isolation   | BLOCKED | Source guards exist, but bundle and browser checks have not run                                                 |
| Audit                       | FAIL    | 7 affected package entries remain                                                                               |

## Proposed dependency changes — approval required

Dates below are calendar dates in Asia/Saigon.

| Package                      | Current           | Proposed          | Release date | Compatibility / reason                                                                                                                                                                                                      |
| ---------------------------- | ----------------- | ----------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| vite                         | 7.3.1             | 7.3.7             | 2026-10-06   | Same major; patches reported file-access/Windows issues. Node 22.23.1 satisfies its engine. Allows esbuild ^0.27.0 or ^0.28.0. Older than 21 days.                                                                          |
| react-router-dom             | 7.9.4             | 7.18.4            | 2026-09-15   | Same major; outside all react-router affected ranges in this audit. React >=18 and Node >=20 are satisfied. Test route navigation for minor-version behavior changes. Prefer this over the one-day-old 7.18.5.              |
| vitest                       | 4.0.18            | 4.1.12            | 2026-10-15   | Patches critical UI-server issue and both mocker advisories; compatible with Vite 7 and Node 22. **Under 21 days: explicit exception required.** 4.1.11 is old enough but still affected by the mock-registration advisory. |
| zod                          | 4.1.12            | 4.6.7             | 2026-10-12   | Same major, patches constrained-collection memory exhaustion; recheck schema behavior. **Under 21 days: explicit exception required.** Earliest patched 4.6.6 was released 2026-10-11 and is also too new.                  |
| esbuild (transitive)         | 0.27.7            | 0.28.1            | 2026-06-12   | Outside the reported vulnerable range, supported by Vite 7.3.7; minor-version change in a pre-1.0 tool requires build verification. Pin through a scoped override if needed; no new direct package.                         |
| playwright-core (transitive) | 1.64.1 and 1.56.1 | 1.56.1 throughout | 2025-10-17   | Apply the already present override to align axe with @playwright/test; axe's >=1.0.0 peer accepts it. No new package.                                                                                                       |

React Query can stay at 5.90.2: reinstall the same pinned dependency tree to restore missing files, including css-tree through jsdom's normal dependencies. Do not add fake ambient declarations, cast to any, edit node_modules by hand, or add css-tree as a direct dependency.

Approval must cover updating the four direct packages, resolving the two transitive packages, and regenerating/reinstalling the dependency tree using npm. No audit fix, force, or legacy-peer-deps.

If the 21-day rule must remain strict, Vitest 4.1.12 becomes eligible after 2026-11-05 21:51 Asia/Saigon; Zod 4.6.7 after 2026-11-02 23:29. Until then the full patch set cannot meet both requirements.

## Exposure and remaining risks

The critical Vitest advisory concerns its UI server; this project uses `vitest run` without the UI package. Many Router advisories concern SSR, actions, or server APIs absent from this scaffold. These distinctions limit the currently exercised paths but do not turn the installed vulnerable tree into a clean audit. Zod consumes mock data today. Vite's development-server issues are relevant to Windows development; no server was started during this review.

ESLint 9.39.1 is deprecated/unsupported according to registry metadata. Moving to a supported major requires checking the lint plugins and is a separate proposed dependency change, not silently included here.

After approval: update the manifest, regenerate and reinstall with npm, rerun audit, then format → lint → typecheck → unit tests → build → E2E/axe → screenshots. Open and compare home/products at both widths, fix verified UI problems, and capture a second round. No acceptance or commit is recommended yet.
