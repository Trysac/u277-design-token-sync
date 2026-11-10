import { TokenError } from "./errors.js";
import type { ResolvedToken, TokenSet } from "./types.js";

function getLastSegment(path: string): string {
  const parts = path.split(".");
  return parts[parts.length - 1] ?? path;
}

export function resolveTokens(set: TokenSet): ResolvedToken[] {
  const resolutionCache = new Map<string, ResolvedToken>();
  const resolvingStack: string[] = [];

  function resolve(path: string): ResolvedToken {
    const cached = resolutionCache.get(path);
    if (cached) {
      return cached;
    }

    const cycleIndex = resolvingStack.indexOf(path);
    if (cycleIndex !== -1) {
      const cycleChain = [...resolvingStack.slice(cycleIndex), path];
      const message = `alias_cycle: ${cycleChain.join(" -> ")}`.slice(0, 200);
      throw new TokenError("alias_cycle", message);
    }

    resolvingStack.push(path);
    const entry = set.tokens.get(path);
    if (!entry) {
      resolvingStack.pop();
      throw new TokenError("alias_unresolved", `alias target not found: ${path}`);
    }

    let resolved: ResolvedToken;

    if (entry.isAlias) {
      const targetPath = entry.aliasPath;
      if (targetPath === undefined) {
        resolvingStack.pop();
        throw new TokenError("alias_unresolved", `alias target missing for ${path}`);
      }

      const targetResolved = resolve(targetPath);
      const tokenType = entry.type;

      if (tokenType !== undefined && tokenType !== targetResolved.type) {
        resolvingStack.pop();
        throw new TokenError(
          "type_mismatch",
          `alias ${path} (type ${tokenType}) does not match target ${targetPath} (type ${targetResolved.type})`,
        );
      }

      const finalType = tokenType ?? targetResolved.type;
      resolved = {
        path: path.split("."),
        name: getLastSegment(path),
        type: finalType,
        value: targetResolved.value,
        aliasOf: targetPath,
      };
    } else {
      if (entry.type === undefined) {
        resolvingStack.pop();
        throw new TokenError("missing_type", `token ${path} is missing type`);
      }
      resolved = {
        path: path.split("."),
        name: getLastSegment(path),
        type: entry.type,
        value: entry.value,
      };
    }

    resolutionCache.set(path, resolved);
    resolvingStack.pop();
    return resolved;
  }

  const paths = Array.from(set.tokens.keys()).sort();
  return paths.map((p) => resolve(p));
}
