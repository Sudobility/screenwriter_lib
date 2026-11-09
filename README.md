# @sudobility/screenwriter_lib

Frontend business logic for the **Fadewright** screenwriting app. It sits between
[`@sudobility/screenwriter_client`](https://github.com/Sudobility/screenwriter_client) (REST + Yjs
sync socket) and the UI, and contains **no UI code**:

- **Ports** (injected by the app): `AuthPort`, `OfflineDocStore`, plus local-dev implementations
  `DevAuthPort` and `InMemoryOfflineDocStore`.
- **Stores**: vanilla [zustand](https://github.com/pmndrs/zustand) stores for auth, projects,
  documents and templates.
- **`DocumentSession`**: a [`writing_core`](https://github.com/Sudobility/writing_core) document model
  with per-user undo, presence, offline persistence, epoch rebase and snapshot/version flows.
- **Flows**: import/export, AI review & polish, personal API keys, and entity image generation
  (character, location, prop, production).
- **React**: a provider and thin hooks over all of the above.

## Install

Published to **GitHub Packages** under the `@sudobility` scope. Consumers need an `.npmrc` that routes
the scope to the GitHub registry (and a GitHub token with `read:packages` in `~/.npmrc` for auth):

```
@sudobility:registry=https://npm.pkg.github.com
```

```sh
npm install @sudobility/screenwriter_lib
# or: bun add @sudobility/screenwriter_lib
```

Peer dependencies (provide them in the host app): `react >=18`, `zustand >=5`,
`@tanstack/react-query >=5`. The app must also dedupe `react`/`react-dom` and `yjs`/`lib0` to a single
copy — see [Single Yjs](#single-yjs).

## Usage

```ts
import { createFetchNetworkClient } from "@sudobility/screenwriter_client";
import { createScreenwriter, DevAuthPort, InMemoryOfflineDocStore, ScreenwriterProvider, useDocumentSession } from "@sudobility/screenwriter_lib";

const sw = createScreenwriter({
  network: createFetchNetworkClient(),
  baseUrl: "http://localhost:8036",
  auth: new DevAuthPort(),                // dev token dev:<uid>:<email>; needs the API run with AI_TEST_MODE=1
  offline: new InMemoryOfflineDocStore(), // apps supply an IndexedDB-backed adapter instead
});
await sw.stores.auth.getState().signIn("me@example.com");

const session = await sw.openDocumentSession(documentId);
session.execute([{ id: "element.insert", params: { style, text: "INT. KITCHEN - DAY" } }]);
session.undo();                       // only this user's own edits
session.on("rebased", e => { /* epoch changed; re-read session.model */ });
await session.close();
```

React: wrap the tree in `<ScreenwriterProvider screenwriter={sw}>`, then use `useAuth`, `useProjects`,
`useDocuments(projectId)`, `useTemplates`, `useDocumentSession(documentId)`, `useImportExport`,
`useAi(documentId)`, `useApiKeys`.

## API summary

- **Ports**: `AuthPort`, `OfflineDocStore` (+ `InMemoryOfflineDocStore`), `DevAuthPort`.
- **Stores** (vanilla zustand, on `sw.stores`): `auth`, `projects`, `documents`, `templates`.
- **`DocumentSession`**: `model`, `execute`, `undo/redo`, `subscribe`, `on(status|presence|rebased|error)`,
  `syncStatus`, `setLocalCursor`/`remoteCursors`, snapshot and version methods, `settle`, `close`.
- **Flows** (created from the `Screenwriter` instance): `importExport`, `createAi(documentId)`,
  `createApiKeys()`, `createCharacterImages`/`createLocationImages`/`createPropImages`/
  `createProductionImages`. Flows the caller creates are owned by the caller — call `dispose()` when done.

## Development

Uses [Bun](https://bun.sh). Sibling repos (`writing_core`, `screenwriter_client`, `screenwriter_types`)
are resolved from local source when checked out as siblings, and otherwise fall back to the published
npm packages (see [Single Yjs](#single-yjs)).

```sh
bun install
bun run typecheck         # tsc --noEmit
bun run test:unit         # hermetic Vitest (no DB, no server) — what CI runs
bun run test:integration  # LOCAL ONLY: spawns the real screenwriter_api + Postgres screenwriter_test
bun run build             # vite lib build + tsc declarations + fix-esm-imports
bun run clean             # rm -rf dist
```

Run tests with Vitest only (`bun run test:unit`), never `bun test`.

`test:integration` spawns `../screenwriter_api` as a child process against a local Postgres
`screenwriter_test` database (`AI_TEST_MODE=1`; the API creates its tables at boot). It needs the
sibling `screenwriter_api` repo checked out and Postgres running, and never runs in CI. Never point it
at `screenwriter_dev`.

## Build output

`bun run build` produces `dist/`:
- `vite build` — a single bundled ESM `dist/index.js` (library mode; all real deps stay external, yjs
  especially so).
- `tsc -p tsconfig.build.json` — `.d.ts` declarations (resolved against real npm deps, not local source).
- `scripts/fix-esm-imports.mjs` — rewrites relative specifiers to explicit `.js` paths so Node's native
  ESM loader can resolve them.

CI/CD (`.github/workflows/ci-cd.yml`) runs on push/PR to `main`/`develop` via a shared reusable
workflow and publishes to GitHub Packages.

## Single Yjs

`yjs` and `lib0` **must** resolve to a single copy at runtime, or `Y.Doc` interop between documents
breaks. In local dev the tsconfig `paths` and `vitest.shared.ts` aliases point them at
`../writing_core/node_modules/`; when siblings are absent they fall through to whatever
`@sudobility/writing_core` installs (still one copy). An app bundler needs an alias plus
`resolve.dedupe: ['yjs', 'lib0', 'react', 'react-dom']`.

## License

BUSL-1.1
