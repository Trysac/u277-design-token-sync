# Architecture

This library is a single-purpose converter for DTCG design tokens.

## Modules

| Module | Responsibility |
|---|---|
| `src/errors.ts` | `TokenError` with machine-readable `code` union. |
| `src/types.ts` | Public types and `TokenSet` container. |
| `src/parser.ts` | Recursive descent parsing with byte/depth limits, type inheritance, alias detection. |
| `src/resolve.ts` | Alias resolution with cycle detection (`alias_cycle`), missing target (`alias_unresolved`), type check (`type_mismatch`). |
| `src/serializers/css.ts` | CSS custom properties output, alias reference or resolved. |
| `src/serializers/ts.ts` | Typed TypeScript object output. |
| `src/cli.ts` | CLI entry point (build/check), uses `node:fs/promises`. |

## Design decisions

- **Dependency-free**: no runtime packages, uses standard library and built-in `TextEncoder` for byte counting.
- **Deterministic output**: tokens sorted by dotted path; CSS variable names derive from path segments.
- **Strict validation**: every input has a named size/depth limit; invalid values throw typed `TokenError`.
- **Alias model**: an alias token stores its direct target path; resolution follows chains with a resolution stack.
- **Output modes**: CSS can emit `var(--target)` (reference) or resolved values; TypeScript always emits resolved values.
- **CLI separation**: parser/serializers are pure and Node-independent; only `cli.ts` imports `node:fs/promises`.

## Future work

The DTCG format includes composite types (shadow, typography, border, gradient), themes/modes, and color space conversion. These are out of scope for this release to keep the library small and focused.
