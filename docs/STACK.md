# Stack

## Used

| Tool | Purpose | Why |
|---|---|---|
| TypeScript | Source language and public type exports | Source files are TypeScript; `src/index.ts` re-exports types. |
| Node.js | Runtime for file I/O and tests | `src/cli.ts` imports `node:fs/promises`; tests import `node:fs/promises`, `node:os`, and `node:path`. |
| Vitest | Test runner | `test/cli.test.ts` and `test/index.test.ts` import `describe`, `expect`, and `it` from `vitest`. |

The reviewed source has no third-party runtime imports: `src/index.ts`, `src/parser.ts`, `src/resolve.ts`, `src/types.ts`, and the serializers import only local files; `src/cli.ts` imports Node built-ins.

## Discarded

| Tool | Why not |
|---|---|
| Bundlers (tsup, Rollup) | The source uses local ES module imports and no bundler configuration is present. |
| Jest | The test files use Vitest APIs. |
