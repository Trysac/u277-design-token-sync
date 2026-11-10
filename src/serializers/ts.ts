import { resolveTokens } from "../resolve.js";
import type { TokenSet } from "../types.js";

export interface TsOptions {
  exportName?: string;
}

export function toTs(set: TokenSet, opts: TsOptions = {}): string {
  const exportName = opts.exportName ?? "tokens";
  const resolved = resolveTokens(set);
  const entries = resolved.map((token) => {
    const key = JSON.stringify(token.path.join("."));
    return `  ${key}: ${JSON.stringify(token.value)},`;
  });

  return `export const ${exportName} = {\n${entries.join("\n")}\n} as const;\nexport type TokenName = keyof typeof ${exportName};\n`;
}
