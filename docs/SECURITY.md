# Security

This library processes untrusted JSON design token files. The following limits are enforced by the code.

## Defended

- Input size is limited to 1,048,576 UTF-8 bytes by default through `parseTokens` option `maxBytes`; larger input throws `input_too_large`.
- Nesting is limited to 32 group levels; deeper input throws `too_deep`.
- Token names cannot contain `.`, `{`, or `}` and cannot start with `$`; violations throw `invalid_name`.
- Alias resolution detects cycles and missing targets, preventing infinite recursion; errors use codes `alias_cycle` and `alias_unresolved`.
- Alias type mismatches throw `type_mismatch` when an alias token declares a type different from its target.
- Primitive values are validated before output: hex colors only, dimension and duration units restricted to `px`/`rem` and `ms`/`s`, finite numbers, integer font weights from 1 to 1000, and string or string-array font families.
- CSS variable-name segments are escaped when they contain characters outside `[A-Za-z0-9_-]`.
- The CLI reads and writes only the file paths supplied by the user; it does not read environment variables or use the network.

## Not defended

- There is no authentication, authorization, secret handling, or network layer.
- The CLI does not sandbox or restrict output paths to a project directory; it writes to the paths given on the command line.
- The parser limits bytes but does not put a separate limit on the number of tokens or the generated output size.
- Font family strings are quoted and internal double quotes are escaped, but no other CSS-string escaping is performed; generated CSS should be reviewed if token files are untrusted.
- Error messages may include token names, alias paths, or value excerpts.
