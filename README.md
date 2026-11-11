# @trysac/design-token-sync

[![npm version](https://img.shields.io/npm/v/@trysac/design-token-sync.svg)](https://www.npmjs.com/package/@trysac/design-token-sync)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Convert Design Tokens Community Group (DTCG) JSON into CSS custom properties and a type-safe TypeScript module. The parser validates token values, inherits `$type` from groups, resolves aliases with cycle and type checks, and the CLI has a `--check` mode for CI.

## Features

- Parses DTCG token objects with `$value`, optional `$type`, and ignored `$description`.
- Supports aliases written as `{path.to.token}` and alias chains.
- Handles `color`, `dimension`, `duration`, `number`, `fontWeight`, and `fontFamily` values.
- Emits CSS custom properties and a `const` TypeScript object with dotted-path keys.
- CLI with `build`, `--css`, `--ts`, `--check`, and `--prefix`.
- No runtime dependencies; only `src/cli.ts` imports `node:fs/promises`.

## Installation

```bash
npm install @trysac/design-token-sync
```

## Quick start

```ts
import { parseTokens, toCss, toTs } from "@trysac/design-token-sync";

const json = '{"color":{"$type":"color","base":{"blue":{"$value":"#0055FF"}},"brand":{"$value":"{color.base.blue}"}}}';
const tokens = parseTokens(json);
console.log(toCss(tokens));
console.log(toTs(tokens));
```

This prints CSS variables using `var(--color-base-blue)` for the alias and a TypeScript object with keys `color.base.blue` and `color.brand`.

## Public API

- `parseTokens(json: string, opts?: { maxBytes?: number }): TokenSet` — default `maxBytes` is `1_048_576` UTF-8 bytes; nesting is limited to 32 group levels.
- `resolveTokens(set: TokenSet): ResolvedToken[]` — returns tokens sorted by dotted path; each item has `path: string[]`, `name`, `type`, `value`, and optional `aliasOf`.
- `toCss(set, opts?: { aliases?: "reference" | "resolve"; selector?: string; prefix?: string }): string` — defaults: `aliases: "reference"`, `selector: ":root"`, no prefix. In reference mode an alias emits `var(--<direct target>)`; in resolve mode it emits the resolved value.
- `toTs(set, opts?: { exportName?: string }): string` — default `exportName` is `tokens`; keys are dotted paths and values are resolved values.
- `TokenType` is `"color" | "dimension" | "number" | "fontFamily" | "fontWeight" | "duration"`.
- `TokenError` extends `Error` with a readonly `code`.

Errors thrown by parsing, resolution, or serialization are `TokenError` with one of these codes: `input_too_large`, `invalid_json`, `too_deep`, `invalid_name`, `missing_type`, `invalid_value`, `alias_unresolved`, `alias_cycle`, `type_mismatch`.

Value limits: colors must be 3-, 6-, or 8-digit hex strings; dimensions match `px` or `rem`; durations match `ms` or `s`; numbers must be finite; `fontWeight` is an integer from 1 to 1000; `fontFamily` is a string or string array. Token name segments cannot contain `.`, `{`, or `}` and cannot start with `$`.

## CLI

```bash
npx design-token-sync build tokens.json --css tokens.css --ts tokens.ts
npx design-token-sync build tokens.json --css tokens.css --ts tokens.ts --check
```

Exit codes: `0` success, `1` stale files or token error, `2` usage or I/O error. `--check` compares generated text with existing files and writes `stale: <path>` to stderr when a file differs.

## Why not Style Dictionary

Style Dictionary is a configurable build system; this package is a small dependency-free converter with strict typed errors and a built-in CI check mode. It covers the DTCG token shapes listed above and does not provide Style Dictionary's configuration, transform, platform, or composite-token system.

## Documentation

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for module boundaries and [docs/SECURITY.md](docs/SECURITY.md) for the threat model.
