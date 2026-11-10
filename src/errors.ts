export type TokenErrorCode =
  | "input_too_large"
  | "invalid_json"
  | "too_deep"
  | "invalid_name"
  | "missing_type"
  | "invalid_value"
  | "alias_unresolved"
  | "alias_cycle"
  | "type_mismatch";

export class TokenError extends Error {
  readonly code: TokenErrorCode;

  constructor(code: TokenErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "TokenError";
  }
}
