import { TokenError } from "./errors.js";
import { type TokenEntry, TokenSet, type TokenType } from "./types.js";

const MAX_DEPTH = 32;
const DEFAULT_MAX_BYTES = 1_048_576;
const ALIAS_PATTERN = /^\{([^{}]+)\}$/;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateName(name: string): void {
  if (
    name.includes(".") ||
    name.includes("{") ||
    name.includes("}") ||
    name.startsWith("$") ||
    name === ""
  ) {
    throw new TokenError("invalid_name", `invalid token name: ${name.slice(0, 100)}`);
  }
}

function isValidType(value: unknown): value is TokenType {
  return (
    typeof value === "string" &&
    ["color", "dimension", "number", "fontFamily", "fontWeight", "duration"].includes(value)
  );
}

function hexColorToLower(value: string): string {
  if (!/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value)) {
    throw new TokenError("invalid_value", `invalid color value: ${value}`);
  }
  if (value.length === 4) {
    return `#${value.slice(1).replace(/./g, (char) => char + char)}`.toLowerCase();
  }
  return value.toLowerCase();
}

function normalizeDimension(value: unknown): string {
  if (typeof value === "string") {
    if (!/^-?\d+(\.\d+)?(px|rem)$/.test(value)) {
      throw new TokenError("invalid_value", `invalid dimension value: ${value}`);
    }
    return value;
  }
  if (isObject(value) && "value" in value && "unit" in value) {
    const num = value.value;
    const unit = value.unit;
    if (typeof num === "number" && Number.isFinite(num) && (unit === "px" || unit === "rem")) {
      return `${num}${unit}`;
    }
    throw new TokenError("invalid_value", "invalid dimension object");
  }
  throw new TokenError("invalid_value", `invalid dimension value: ${String(value)}`);
}

function normalizeDuration(value: unknown): string {
  if (typeof value === "string") {
    if (!/^-?\d+(\.\d+)?(ms|s)$/.test(value)) {
      throw new TokenError("invalid_value", `invalid duration value: ${value}`);
    }
    return value;
  }
  if (isObject(value) && "value" in value && "unit" in value) {
    const num = value.value;
    const unit = value.unit;
    if (typeof num === "number" && Number.isFinite(num) && (unit === "ms" || unit === "s")) {
      return `${num}${unit}`;
    }
    throw new TokenError("invalid_value", "invalid duration object");
  }
  throw new TokenError("invalid_value", `invalid duration value: ${String(value)}`);
}

function normalizeNumber(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TokenError("invalid_value", `invalid number value: ${String(value)}`);
  }
  return value;
}

function normalizeFontWeight(value: unknown): number {
  const num = normalizeNumber(value);
  if (!Number.isInteger(num) || num < 1 || num > 1000) {
    throw new TokenError("invalid_value", `invalid fontWeight value: ${String(value)}`);
  }
  return num;
}

function normalizeFontFamily(value: unknown): string[] {
  if (typeof value === "string") {
    return [value];
  }
  if (Array.isArray(value)) {
    if (!value.every((v) => typeof v === "string")) {
      throw new TokenError("invalid_value", "fontFamily array must contain strings");
    }
    return value as string[];
  }
  throw new TokenError("invalid_value", `invalid fontFamily value: ${String(value)}`);
}

function parseAliasPath(aliasStr: string): string {
  const match = ALIAS_PATTERN.exec(aliasStr);
  if (!match) {
    throw new TokenError("invalid_value", `invalid alias: ${aliasStr}`);
  }
  const path = match[1];
  if (!path) {
    throw new TokenError("invalid_value", `invalid alias: ${aliasStr}`);
  }
  const segments = path.split(".");
  if (
    segments.some(
      (seg) => seg === "" || seg.includes("{") || seg.includes("}") || seg.includes("."),
    )
  ) {
    throw new TokenError("invalid_value", `invalid alias path: ${path}`);
  }
  segments.forEach(validateName);
  return path;
}

function normalizeValue(type: TokenType, value: unknown): string | number | string[] {
  switch (type) {
    case "color": {
      if (typeof value !== "string") {
        throw new TokenError("invalid_value", "color value must be a string");
      }
      return hexColorToLower(value);
    }
    case "dimension":
      return normalizeDimension(value);
    case "duration":
      return normalizeDuration(value);
    case "number":
      return normalizeNumber(value);
    case "fontWeight":
      return normalizeFontWeight(value);
    case "fontFamily":
      return normalizeFontFamily(value);
  }
}

export interface ParseOptions {
  maxBytes?: number;
}

export function parseTokens(json: string, opts: ParseOptions = {}): TokenSet {
  const maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES;
  const byteLength = new TextEncoder().encode(json).length;
  if (byteLength > maxBytes) {
    throw new TokenError("input_too_large", `input exceeds ${maxBytes} bytes`);
  }

  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new TokenError("invalid_json", "invalid JSON");
  }

  if (!isObject(data)) {
    throw new TokenError("invalid_json", "JSON must be an object");
  }

  const entries = new Map<string, TokenEntry>();

  function visitGroup(
    obj: Record<string, unknown>,
    pathSegments: string[],
    inheritedType: TokenType | undefined,
    depth: number,
  ): void {
    if (depth >= MAX_DEPTH) {
      throw new TokenError("too_deep", `nesting deeper than ${MAX_DEPTH} groups`);
    }

    let currentGroupType = inheritedType;

    if ("$type" in obj) {
      const groupType = obj.$type;
      if (!isValidType(groupType)) {
        throw new TokenError("invalid_value", `invalid $type: ${String(groupType)}`);
      }
      currentGroupType = groupType;
    }

    for (const [key, value] of Object.entries(obj)) {
      if (key.startsWith("$")) {
        if (key === "$type") {
          // already handled above so inheritance does not depend on key order
        } else if (key === "$value") {
          throw new TokenError("invalid_value", "group cannot have $value");
        } else if (key === "$description") {
          // ignored
        } else {
          // ignore other $ keys
        }
        continue;
      }

      validateName(key);

      if (isObject(value)) {
        if ("$value" in value) {
          const tokenObj = value as Record<string, unknown>;
          const rawValue = tokenObj.$value;
          const ownType = tokenObj.$type;
          let effectiveType = currentGroupType;
          if (ownType !== undefined) {
            if (!isValidType(ownType)) {
              throw new TokenError("invalid_value", `invalid $type: ${String(ownType)}`);
            }
            effectiveType = ownType;
          }

          const path = [...pathSegments, key].join(".");

          if (typeof rawValue === "string" && ALIAS_PATTERN.test(rawValue)) {
            const aliasPath = parseAliasPath(rawValue);
            const entry: TokenEntry = {
              path,
              type: effectiveType,
              isAlias: true,
              aliasPath,
              value: rawValue,
            };
            entries.set(path, entry);
          } else {
            if (effectiveType === undefined) {
              throw new TokenError("missing_type", `token ${path} is missing type`);
            }
            const normalized = normalizeValue(effectiveType, rawValue);
            const entry: TokenEntry = {
              path,
              type: effectiveType,
              isAlias: false,
              value: normalized,
            };
            entries.set(path, entry);
          }
        } else {
          visitGroup(value, [...pathSegments, key], currentGroupType, depth + 1);
        }
      } else {
        throw new TokenError("invalid_value", `unexpected value for key ${key}: ${String(value)}`);
      }
    }
  }

  visitGroup(data, [], undefined, 0);
  return new TokenSet(entries);
}
