# Testing

## Tools

- Vitest runs the two test files: `test/cli.test.ts` and `test/index.test.ts`.
- The CLI tests use `node:fs/promises`, `node:os`, and `node:path` to create, read, and remove temporary files.

## Commands

```sh
npx vitest run
```

The test files are ESM TypeScript and import the public entry point through `../src/index.js` or the CLI through `../src/cli.js`.

## Rules

- Tests assert observable behavior: exact CSS and TypeScript strings, CLI exit codes, stderr text, and `TokenError.code` values.
- CLI tests write temporary files under the OS temp directory and remove their directories with `rm(..., { recursive: true, force: true })`.
- One CLI test changes `process.cwd()` and restores it in a `finally` block.
- The test files make no network calls and do not use external services.

## Tiers

No separate test tiers or conformance suites exist in the repository; all tests are in the two files above.

## Reports

The test files do not write coverage reports or assert coverage thresholds.
