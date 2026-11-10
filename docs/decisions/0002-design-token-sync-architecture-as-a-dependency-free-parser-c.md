# Design Token Sync architecture as a dependency-free parser-converter

Status: accepted (generated, pending human review)

## Context

Need to convert DTCG JSON tokens to CSS and TypeScript, with alias resolution and CI stale checks. Existing tools like Style Dictionary are config-heavy; a small library with a CLI is sufficient.

## Decision

Implement a pure TypeScript parser, resolver and serializers with no runtime dependencies. Alias resolution uses recursive memoization with a visited stack for cycle detection. CLI uses `node:fs/promises` for file operations, keeping library code Node-independent.

## Consequences

Positive: small, deterministic, easy to test and maintain. Negative: composite token types, themes and color space conversion are out of scope for now.
