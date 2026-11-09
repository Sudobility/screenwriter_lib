# screenwriter_lib

Frontend business-logic library for **Fadewright** (`@sudobility/screenwriter_lib`). Sits between
`screenwriter_client` (REST + Yjs sync socket) and the UI. **No UI code.**

Published to **GitHub Packages** (version in `package.json`, currently 0.1.x); CI/CD in
`.github/workflows/ci-cd.yml`. `.npmrc` routes `@sudobility` to `npm.pkg.github.com` (auth token lives
in `~/.npmrc`, not here).

## Tech stack

Bun, TypeScript (ESM, `moduleResolution: bundler`, `verbatimModuleSyntax`, TS 6), zustand (vanilla
stores), React 19 (peer), Yjs V2, Vite 8 (library build), Vitest 4. Runtime deps on
`@sudobility/{writing_core, screenwriter_client, screenwriter_types}` + `yjs`; peers: `react`,
`zustand`, `@tanstack/react-query`.

## Structure

```
src/
  index.ts          barrel
  ports/            AuthPort, OfflineDocStore + InMemoryOfflineDocStore
  auth/dev-auth.ts  DevAuthPort (token dev:<uid>:<email>, uid = deterministic hash of the email)
  stores/           vanilla zustand store factories over a (fakeable) client: auth, projects, documents, templates
  session/          DocumentSession: types.ts (public API), document-session.ts (core), emitter.ts
  screenwriter.ts   createScreenwriter(config): wires client + SyncClient + stores + all flow factories
  flows/import-export.ts  importScript / exportDocument (bytes in, bytes out; export waits for the open session to settle)
  flows/ai.ts       createAiFlow: review/polish, suggestions, coverage report (see AI flow)
  flows/api-keys.ts createApiKeysFlow: personal API keys list/create(one-time secret)/revoke
  {character,location,prop,production}-images.ts  doc-scoped image generate/upload/get flows (thin over client)
  react/            ScreenwriterProvider, useScreenwriter, use{Auth,Projects,Documents,Templates,DocumentSession,ImportExport,Ai,ApiKeys}
tests/              *.test.ts hermetic (fake client/network); *.integration.test.ts spawn the REAL API
```

## Commands

- `bun install`; `bun run typecheck` (tsc --noEmit); `bun run test:unit` (hermetic, what CI runs);
  `bun run build`; `bun run clean`. Run tests with Vitest only, never `bun test`.
- `bun run test:integration` (LOCAL DEV ONLY, never CI): `tests/*.integration.test.ts` spawn
  `../screenwriter_api` as a child process on a random port (`AI_TEST_MODE=1`,
  `postgres://localhost:5432/screenwriter_test`; the API creates its tables at boot). Needs the sibling
  repo checked out and local Postgres. Never use `screenwriter_dev`.
- Two Vitest configs share aliases via `vitest.shared.ts`: `vitest.config.ts` (unit, excludes
  `*.integration.test.ts`) and `vitest.integration.config.ts` (`fileParallelism: false`).

## Build

`vite build` (lib mode) → one bundled ESM `dist/index.js`, all real deps **external** (yjs especially:
bundling it would create a second Yjs instance). Then `tsc -p tsconfig.build.json` emits `.d.ts` only
(its `paths: {}` forces declarations to resolve against real npm deps, not local sibling source). Then
`scripts/fix-esm-imports.mjs` rewrites relative specifiers to explicit `.js`/`index.js` paths for
Node's native ESM loader.

## Dependency resolution (local dev vs published)

tsconfig `paths` and `vitest.shared.ts` map the `@sudobility/*` deps + `yjs`/`lib0` to local sibling
source, **but only when the sibling is actually checked out** (each alias is guarded by `existsSync`).
Absent siblings (and CI, which checks out only this repo) fall through to the published npm packages.
Keep tsconfig `paths` and `vitest.shared.ts` in sync.

## AI flow

`createAiFlow(client, documentId, {pollMs})` (`Screenwriter.createAi`; hook `useAi`): status,
`startReview()`, `startPolish({sceneIds})`, polling of the current job, the last coverage report
(read back from the document's recent jobs on `refresh()`), the pending suggestion set,
`accept(ids)`/`acceptAll()`/`reject(ids?)`. A refused accept resolves `{ok:false, reason:'stale',
suggestionIds}` (not an error); `describeAiError(code)` maps `AI_OUTPUT_INVALID`, `AI_UNAVAILABLE`,
`JOB_ALREADY_RUNNING`, `RATE_LIMITED`, `AI_KEY_NOT_PERMITTED`, … A new run clears what the last one of
its kind left once the API accepts it: a review clears the old report; a polish clears the suggestion
set and rejects its undecided suggestions server-side. `refresh()` shows the latest review's report only
if that review succeeded. Timers only, no browser APIs. API keys: the just-created secret
(`revealed`) lives only in flow state until `dismissReveal()` — never stored or logged.

## Session lifecycle (`openDocumentSession`)

1. `client.getDocument` (epoch, role, template summary). Network failure + an offline copy = open offline.
2. New `Y.Doc`; apply the offline copy only if its epoch equals the server epoch (older-epoch copies dropped).
3. `sync.subscribe(id, doc, {epoch})`, wait for `synced` (timeout 10 s; with an offline copy, open anyway).
4. `openDocument(doc, deps, {repair: false})` (repair is a write; never on the client). `createSessionUndo`
   per session: `undo()/redo()` touch only this session's own origins.
5. `execute(commands, {kind, groupKey})` runs `executeBatch` with this user's origin (`origins.make`);
   viewers/commenters are read-only.
6. Every doc update schedules a debounced save to the offline store; `close()` flushes.
7. **Rebase** on the client's `epochChanged`: fetch `GET /documents/:did/state`; compare the old doc's
   state vector with (newest server `pre-open`/`pre-restore` snapshot vector + the new live state's
   vector); anything beyond both = lost local edits; save a copy under `<docId>#lost@<epoch>@<ts>`;
   replace doc, model and undo; resubscribe at the live epoch; emit `change(null)` then
   `rebased {fromEpoch, toEpoch, lostLocalEdits, preservedKey}`. `unackedCount` resets on disconnect, so
   it is NOT used for this. Undo history is cleared by a rebase. Read `session.model` fresh after `rebased`.
8. Presence: `setLocalCursor(x)` publishes `{user, cursor: x}` via awareness; `remoteCursors` maps
   `{clientId, user, cursor}`.
9. Snapshots: `listSnapshots`, `createSnapshot(name, note)` (waits for acks, generates
   `clientSnapshotId`), `openSnapshot(id)` (API call, then waits for this session's rebase),
   `forkSnapshot`, `listVersions`, `restoreVersion`.

## Gotchas

- One `SyncClient` holds one subscription per document id: two sessions on one document need two
  `createScreenwriter` instances (that is what two devices are). `openDocumentSession` is reference
  counted: one live session per document; real close only when every holder has called `close()`.
- The API's `createSnapshot` pins the server's live state; a client cannot upload its own state (the
  offline-edits gap).
- `writing_core`'s command registry is a process-wide singleton; `registerBuiltinCommands()` is
  idempotent and runs on import of `session/`.
- React: `screenwriter_client`'s hooks import their own `react`; apps must dedupe `react`/`react-dom`
  and `yjs`/`lib0` (bundler alias + `resolve.dedupe`).

## Related

`../writing_core`, `../screenwriter_client`, `../screenwriter_types`, `../screenwriter_api`,
`../sudojo_lib` (convention reference), `../screenwriter_plans`.
