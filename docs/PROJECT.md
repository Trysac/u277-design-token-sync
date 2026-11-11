# Project record: design-token-sync

## Objective

Build CSS custom properties and a typed TypeScript module from Design Tokens (DTCG) JSON, resolving aliases, inheriting types, and checking that outputs stay in sync. The utility is for projects that keep generated CSS variables and TypeScript constants in source control and need deterministic output plus a CI stale check.

## Scope

In scope:

- DTCG token objects with `$value`, optional `$type`, and ignored `$description`.
- The `color`, `dimension`, `duration`, `number`, `fontWeight`, and `fontFamily` types with the validation limits in the README.
- Group `$type` inheritance and alias strings written as `{path.to.token}`, including alias chains.
- Alias cycle detection, unresolved-target errors, and alias type mismatch errors.
- CSS custom properties from `toCss`, with reference or resolved aliases, selector and prefix options.
- A typed `const` TypeScript object from `toTs`, with dotted-path keys and resolved values.
- CLI `build` with `--css`, `--ts`, `--check`, and `--prefix`.

Out of scope:

- Composite types: shadow, typography, border, and gradient.
- Themes and modes.
- Color space conversion and color values other than 3-, 6-, or 8-digit hex strings.
- Sass or JavaScript outputs.

## Timeline

| Date | Milestone |
|---|---|
| 2026 | Repository created from the factory utility template. |

## Effort metrics

Measured values only. Leave "pending measurement" until a real figure is recorded; never estimate here.

| Metric | Value | Source |
|---|---|---|
| Tokens (input / output) | 1352402 / 88401 | factory ledger |
| Hours (human) | pending measurement | time log |
| Cost (USD) | 0.1079 | factory ledger |

## Factory run u277 (measured from API usage)

| Date (UTC) | Phase | Model | Batch | Input | Output | Cache write | Cache read | Cost (USD) |
|---|---|---|---|---|---|---|---|---|
| 2026-11-10 | generation | deepseek-v4-pro | yes | 1620 | 25696 | 0 | 3584 | 0.0520 |
| 2026-11-10 | fix-1 | deepseek-flash | no | 23512 | 17616 | 0 | 447616 | 0.0154 |
| 2026-11-10 | fix-2 | deepseek-flash | no | 16955 | 8114 | 0 | 293376 | 0.0083 |
| 2026-11-10 | audit | deepseek-flash | no | 23174 | 17101 | 0 | 353280 | 0.0148 |
| 2026-11-10 | fix-3 | deepseek-flash | no | 16350 | 8174 | 0 | 155776 | 0.0078 |
| 2026-11-10 | docs | deepseek-flash | no | 16775 | 11700 | 0 | 384 | 0.0095 |

Total: $0.1079. Prices: deepseek line, as measured by its adapter. Providers serve the current version of each model id, so the date tells which version answered; versions, launch stages and price sources per line are in the factory's model register (docs/MODELS.md).
