export type TokenType = "color" | "dimension" | "number" | "fontFamily" | "fontWeight" | "duration";

export interface TokenEntry {
  path: string;
  type: TokenType | undefined;
  isAlias: boolean;
  aliasPath?: string;
  value: string | number | string[];
}

export class TokenSet {
  private readonly _tokens: Map<string, TokenEntry>;

  constructor(entries: Map<string, TokenEntry>) {
    this._tokens = entries;
  }

  get tokens(): ReadonlyMap<string, TokenEntry> {
    return this._tokens;
  }
}

export interface ResolvedToken {
  path: string[];
  name: string;
  type: TokenType;
  value: string | number | string[];
  aliasOf?: string;
}
