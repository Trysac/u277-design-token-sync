import { resolveTokens } from "../resolve.js";
import type { ResolvedToken, TokenSet } from "../types.js";

export interface CssOptions {
  aliases?: "reference" | "resolve";
  selector?: string;
  prefix?: string;
}

function quoteFontFamily(name: string): string {
  if (/^[A-Za-z0-9-]+$/.test(name)) {
    return name;
  }
  return `"${name.replace(/"/g, '\\"')}"`;
}

function escapeCssSegment(segment: string): string {
  let escaped = "";
  for (const char of segment) {
    if (/^[A-Za-z0-9_-]$/.test(char)) {
      escaped += char;
    } else {
      escaped += `\\${(char.codePointAt(0) ?? 0).toString(16)} `;
    }
  }
  return escaped;
}

function cssVarName(path: string[], prefix: string): string {
  const segments = prefix === "" ? path : [prefix, ...path];
  return `--${segments.map(escapeCssSegment).join("-")}`;
}

function cssValue(
  token: ResolvedToken,
  opts: { aliases: "reference" | "resolve"; prefix: string },
): string {
  if (token.aliasOf !== undefined && opts.aliases === "reference") {
    const targetVar = cssVarName(token.aliasOf.split("."), opts.prefix);
    return `var(${targetVar})`;
  }

  switch (token.type) {
    case "color":
      return token.value as string;
    case "dimension":
    case "duration":
      return token.value as string;
    case "number":
      return String(token.value);
    case "fontWeight":
      return String(token.value);
    case "fontFamily": {
      const families = token.value as string[];
      return families.map(quoteFontFamily).join(", ");
    }
  }
}

export function toCss(set: TokenSet, opts: CssOptions = {}): string {
  const aliases = opts.aliases ?? "reference";
  const selector = opts.selector ?? ":root";
  const prefix = opts.prefix ?? "";
  const resolved = resolveTokens(set);

  const lines: string[] = [];
  for (const token of resolved) {
    const varName = cssVarName(token.path, prefix);
    const value = cssValue(token, { aliases, prefix });
    lines.push(`  ${varName}: ${value};`);
  }

  return `${selector} {\n${lines.join("\n")}\n}\n`;
}
