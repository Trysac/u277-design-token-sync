import { describe, expect, it } from "vitest";
import { parseTokens, resolveTokens, TokenError, toCss, toTs } from "../src/index.js";

describe("parseTokens and serializers", () => {
  it("acceptance: color alias, reference and resolve", () => {
    const json =
      '{"color":{"$type":"color","base":{"blue":{"$value":"#0055FF"}},"brand":{"$value":"{color.base.blue}"}}}';
    const set = parseTokens(json);

    expect(toCss(set)).toBe(
      ":root {\n  --color-base-blue: #0055ff;\n  --color-brand: var(--color-base-blue);\n}\n",
    );
    expect(toCss(set, { aliases: "resolve" })).toBe(
      ":root {\n  --color-base-blue: #0055ff;\n  --color-brand: #0055ff;\n}\n",
    );
  });

  it("acceptance: toTs exact output", () => {
    const json =
      '{"color":{"$type":"color","base":{"blue":{"$value":"#0055FF"}},"brand":{"$value":"{color.base.blue}"}}}';
    const set = parseTokens(json);

    expect(toTs(set)).toBe(
      'export const tokens = {\n  "color.base.blue": "#0055ff",\n  "color.brand": "#0055ff",\n} as const;\nexport type TokenName = keyof typeof tokens;\n',
    );
  });

  it("acceptance: alias cycle, unresolved, type mismatch", () => {
    const cycleJson =
      '{"a":{"$type":"number","$value":"{b}"},"b":{"$type":"number","$value":"{a}"}}';
    expect(() => resolveTokens(parseTokens(cycleJson))).toThrowError(
      expect.objectContaining({ code: "alias_cycle" }),
    );
    expect(() => resolveTokens(parseTokens(cycleJson))).toThrowError(/a -> b -> a/);

    const unresolvedJson = '{"a":{"$value":"{missing.token}"}}';
    expect(() => resolveTokens(parseTokens(unresolvedJson))).toThrowError(
      expect.objectContaining({ code: "alias_unresolved" }),
    );

    const mismatchJson =
      '{"color":{"$type":"color","$value":"#fff"},"dim":{"$type":"dimension","$value":"1px"},"bad":{"$type":"color","$value":"{dim}"}}';
    expect(() => resolveTokens(parseTokens(mismatchJson))).toThrowError(
      expect.objectContaining({ code: "type_mismatch" }),
    );
  });

  it("acceptance: dimension and duration values", () => {
    const json = `{
      "dim": {
        "px": { "$type": "dimension", "$value": { "value": 16, "unit": "px" } },
        "rem": { "$type": "dimension", "$value": "1.5rem" }
      },
      "dur": {
        "ms": { "$type": "duration", "$value": { "value": 200, "unit": "ms" } }
      }
    }`;
    const set = parseTokens(json);
    expect(toCss(set)).toBe(
      ":root {\n  --dim-px: 16px;\n  --dim-rem: 1.5rem;\n  --dur-ms: 200ms;\n}\n",
    );

    expect(() =>
      parseTokens('{"bad":{"$type":"dimension","$value":{"value":1,"unit":"pt"}}}'),
    ).toThrowError(expect.objectContaining({ code: "invalid_value" }));
  });

  it("acceptance: fontFamily quoting and array in TS", () => {
    const json = `{
      "font": {
        "$type": "fontFamily",
        "$value": ["Inter", "Segoe UI", "sans-serif"]
      }
    }`;
    const set = parseTokens(json);
    expect(toCss(set)).toBe(':root {\n  --font: Inter, "Segoe UI", sans-serif;\n}\n');
    expect(toTs(set)).toBe(
      'export const tokens = {\n  "font": ["Inter","Segoe UI","sans-serif"],\n} as const;\nexport type TokenName = keyof typeof tokens;\n',
    );
  });

  it("acceptance: missing_type, invalid_name, ignored $ keys", () => {
    expect(() => parseTokens('{"a":{"$value":1}}')).toThrowError(
      expect.objectContaining({ code: "missing_type" }),
    );

    expect(() => parseTokens('{"a.b":{"$type":"number","$value":1}}')).toThrowError(
      expect.objectContaining({ code: "invalid_name" }),
    );
    expect(() => parseTokens('{"{x}":{"$type":"number","$value":1}}')).toThrowError(
      expect.objectContaining({ code: "invalid_name" }),
    );

    const json = '{"$description":"ignored","a":{"$type":"number","$value":1},"$foo":"bar"}';
    const set = parseTokens(json);
    expect(set.tokens.has("a")).toBe(true);
    expect(set.tokens.size).toBe(1);
  });

  it("acceptance: input_too_large, too_deep, invalid_json", () => {
    expect(() => parseTokens("{}", { maxBytes: 1 })).toThrowError(
      expect.objectContaining({ code: "input_too_large" }),
    );

    const limit = 1_048_576;
    const base = '{"a":{"$type":"number","$value":1}}';
    const exact = base + " ".repeat(limit - new TextEncoder().encode(base).length);
    expect(new TextEncoder().encode(exact).length).toBe(limit);
    expect(parseTokens(exact).tokens.has("a")).toBe(true);

    const tooLarge = `${exact} `;
    expect(new TextEncoder().encode(tooLarge).length).toBe(limit + 1);
    expect(() => parseTokens(tooLarge)).toThrowError(
      expect.objectContaining({ code: "input_too_large" }),
    );

    const multibyteBase = '{"a":{"$type":"fontFamily","$value":"é"}}';
    const multibyte =
      multibyteBase + " ".repeat(limit - new TextEncoder().encode(multibyteBase).length);
    expect(new TextEncoder().encode(multibyte).length).toBe(limit);
    expect(parseTokens(multibyte).tokens.has("a")).toBe(true);

    let deep = "{}";
    for (let i = 0; i < 33; i += 1) {
      deep = `{"g":${deep}}`;
    }
    expect(() => parseTokens(deep)).toThrowError(expect.objectContaining({ code: "too_deep" }));

    expect(() => parseTokens("{")).toThrowError(expect.objectContaining({ code: "invalid_json" }));
  });

  it("inherits a group $type regardless of key order", () => {
    const afterToken = parseTokens('{"g":{"a":{"$value":"#fff"},"$type":"color"}}');
    expect(toCss(afterToken)).toBe(":root {\n  --g-a: #ffffff;\n}\n");

    const afterGroup = parseTokens('{"g":{"h":{"a":{"$value":"#fff"}},"$type":"color"}}');
    expect(toCss(afterGroup)).toBe(":root {\n  --g-h-a: #ffffff;\n}\n");
  });

  it("escapes token names in generated TypeScript keys", () => {
    const name = 'a"b\nc';
    const set = parseTokens(`{${JSON.stringify(name)}:{"$type":"number","$value":1}}`);

    expect(toTs(set)).toBe(
      `export const tokens = {\n  ${JSON.stringify(name)}: 1,\n} as const;\nexport type TokenName = keyof typeof tokens;\n`,
    );
  });

  it("escapes unsafe characters in generated CSS names", () => {
    const set = parseTokens('{"a; b:c":{"$type":"number","$value":1}}');
    expect(toCss(set)).toBe(":root {\n  --a\\3b \\20 b\\3a c: 1;\n}\n");

    const aliasSet = parseTokens(
      '{"a; b":{"$type":"number","$value":1},"c":{"$type":"number","$value":"{a; b}"}}',
    );
    expect(toCss(aliasSet)).toBe(":root {\n  --a\\3b \\20 b: 1;\n  --c: var(--a\\3b \\20 b);\n}\n");

    expect(() => parseTokens('{"a}":{"$type":"number","$value":1}}')).toThrowError(
      expect.objectContaining({ code: "invalid_name" }),
    );
  });

  it("edge cases: alias chain of length 3, reference points to direct target", () => {
    const json = `{
      "a": { "$type": "number", "$value": 1 },
      "b": { "$type": "number", "$value": "{a}" },
      "c": { "$type": "number", "$value": "{b}" }
    }`;
    const set = parseTokens(json);
    const resolved = resolveTokens(set);
    expect(resolved.find((t) => t.path.join(".") === "c")?.aliasOf).toBe("b");
    expect(toCss(set)).toBe(":root {\n  --a: 1;\n  --b: var(--a);\n  --c: var(--b);\n}\n");
    expect(toCss(set, { aliases: "resolve" })).toBe(
      ":root {\n  --a: 1;\n  --b: 1;\n  --c: 1;\n}\n",
    );
  });

  it("edge cases: $description ignored in output", () => {
    const json = '{"a":{"$type":"number","$value":1.5,"$description":"desc"}}';
    const set = parseTokens(json);
    expect(toCss(set)).toBe(":root {\n  --a: 1.5;\n}\n");
    expect(toTs(set)).toBe(
      'export const tokens = {\n  "a": 1.5,\n} as const;\nexport type TokenName = keyof typeof tokens;\n',
    );
  });

  it("edge cases: empty group and number 1.5 kept as 1.5", () => {
    const json = '{"empty":{},"num":{"$type":"number","$value":1.5}}';
    const set = parseTokens(json);
    expect(set.tokens.has("empty")).toBe(false);
    expect(toCss(set)).toBe(":root {\n  --num: 1.5;\n}\n");
    expect(toCss(set, { selector: ".theme", prefix: "ds" })).toBe(
      ".theme {\n  --ds-num: 1.5;\n}\n",
    );
    expect(toTs(set, { exportName: "designTokens" })).toBe(
      'export const designTokens = {\n  "num": 1.5,\n} as const;\nexport type TokenName = keyof typeof designTokens;\n',
    );
  });

  it("validates primitive values", () => {
    expect(() => parseTokens('{"c":{"$type":"color","$value":"red"}}')).toThrowError(
      expect.objectContaining({ code: "invalid_value" }),
    );
    expect(() => parseTokens('{"c":{"$type":"color","$value":1}}')).toThrowError(
      expect.objectContaining({ code: "invalid_value" }),
    );
    expect(() => parseTokens('{"n":{"$type":"number","$value":"1"}}')).toThrowError(
      expect.objectContaining({ code: "invalid_value" }),
    );
    expect(() => parseTokens('{"w":{"$type":"fontWeight","$value":400.5}}')).toThrowError(
      expect.objectContaining({ code: "invalid_value" }),
    );
    expect(() => parseTokens('{"w":{"$type":"fontWeight","$value":1001}}')).toThrowError(
      expect.objectContaining({ code: "invalid_value" }),
    );

    const set = parseTokens(`{
      "w": { "$type": "fontWeight", "$value": 700 },
      "c": { "$type": "color", "$value": "#0055FF80" },
      "d": { "$type": "duration", "$value": "1s" },
      "f": { "$type": "fontFamily", "$value": "Inter" }
    }`);
    expect(toCss(set)).toBe(
      ":root {\n  --c: #0055ff80;\n  --d: 1s;\n  --f: Inter;\n  --w: 700;\n}\n",
    );
  });

  it("rejects malformed structures and alias paths", () => {
    expect(() => parseTokens("[]")).toThrowError(expect.objectContaining({ code: "invalid_json" }));
    expect(() => parseTokens('{"$value":1}')).toThrowError(
      expect.objectContaining({ code: "invalid_value" }),
    );
    expect(() => parseTokens('{"g":{"$type":"bogus"}}')).toThrowError(
      expect.objectContaining({ code: "invalid_value" }),
    );
    expect(() => parseTokens('{"a":{"$type":"bogus","$value":1}}')).toThrowError(
      expect.objectContaining({ code: "invalid_value" }),
    );
    expect(() => parseTokens('{"a":42}')).toThrowError(
      expect.objectContaining({ code: "invalid_value" }),
    );
    expect(() => parseTokens('{"a":{"$type":"number","$value":"{x..y}"}}')).toThrowError(
      expect.objectContaining({ code: "invalid_value" }),
    );
    expect(() => parseTokens('{"a":{"$type":"number","$value":"{$b}"}}')).toThrowError(
      expect.objectContaining({ code: "invalid_name" }),
    );
  });

  it("error codes are instances of TokenError", () => {
    try {
      parseTokens('{"a":{"$value":1}}');
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(TokenError);
      expect((err as TokenError).code).toBe("missing_type");
    }
  });
});
