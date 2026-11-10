#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { parseTokens, TokenError, type TokenSet, toCss, toTs } from "./index.js";

export interface Io {
  stdout: { write(data: string): void };
  stderr: { write(data: string): void };
}

interface CliOptions {
  tokensFile: string;
  cssFile?: string;
  tsFile?: string;
  check: boolean;
  prefix?: string;
}

function printUsage(io: Io): number {
  io.stderr.write(
    "usage: design-token-sync build <tokens.json> [--css <file>] [--ts <file>] [--check] [--prefix <prefix>]\n",
  );
  return 2;
}

function parseArgs(argv: string[], io: Io): CliOptions | number {
  if (argv[0] !== "build") {
    return printUsage(io);
  }

  const options: CliOptions = {
    tokensFile: "",
    check: false,
  };

  let i = 1;
  let sawTokensFile = false;

  while (i < argv.length) {
    const arg = argv[i];
    if (arg === undefined) {
      return printUsage(io);
    }
    if (arg === "--css" || arg === "--ts" || arg === "--prefix") {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith("--")) {
        return printUsage(io);
      }
      if (arg === "--css") {
        options.cssFile = value;
      } else if (arg === "--ts") {
        options.tsFile = value;
      } else {
        options.prefix = value;
      }
      i += 2;
    } else if (arg === "--check") {
      options.check = true;
      i += 1;
    } else if (!sawTokensFile && !arg.startsWith("--")) {
      options.tokensFile = arg;
      sawTokensFile = true;
      i += 1;
    } else {
      return printUsage(io);
    }
  }

  if (!sawTokensFile) {
    return printUsage(io);
  }
  if (!options.cssFile && !options.tsFile) {
    return printUsage(io);
  }

  return options;
}

export async function run(argv: string[], io: Io): Promise<number> {
  const parsed = parseArgs(argv, io);
  if (typeof parsed === "number") {
    return parsed;
  }

  let tokensJson: string;
  try {
    tokensJson = await readFile(parsed.tokensFile, "utf8");
  } catch (err) {
    io.stderr.write(`error reading tokens file: ${(err as Error).message}\n`);
    return 2;
  }

  let set: TokenSet;
  try {
    set = parseTokens(tokensJson);
  } catch (err) {
    if (err instanceof TokenError) {
      io.stderr.write(`${err.code}: ${err.message}\n`);
      return 1;
    }
    throw err;
  }

  const cssOptions = parsed.prefix !== undefined ? { prefix: parsed.prefix } : {};
  const cssContent = parsed.cssFile ? toCss(set, cssOptions) : undefined;
  const tsContent = parsed.tsFile ? toTs(set) : undefined;

  if (parsed.check) {
    let stale = false;

    if (cssContent !== undefined && parsed.cssFile !== undefined) {
      let existing: string;
      try {
        existing = await readFile(parsed.cssFile, "utf8");
      } catch (err) {
        io.stderr.write(`error reading css file: ${(err as Error).message}\n`);
        return 2;
      }
      if (existing !== cssContent) {
        io.stderr.write(`stale: ${parsed.cssFile}\n`);
        stale = true;
      }
    }

    if (tsContent !== undefined && parsed.tsFile !== undefined) {
      let existing: string;
      try {
        existing = await readFile(parsed.tsFile, "utf8");
      } catch (err) {
        io.stderr.write(`error reading ts file: ${(err as Error).message}\n`);
        return 2;
      }
      if (existing !== tsContent) {
        io.stderr.write(`stale: ${parsed.tsFile}\n`);
        stale = true;
      }
    }

    return stale ? 1 : 0;
  }

  try {
    if (cssContent !== undefined && parsed.cssFile !== undefined) {
      await writeFile(parsed.cssFile, cssContent, "utf8");
    }
    if (tsContent !== undefined && parsed.tsFile !== undefined) {
      await writeFile(parsed.tsFile, tsContent, "utf8");
    }
  } catch (err) {
    io.stderr.write(`error writing output: ${(err as Error).message}\n`);
    return 2;
  }

  return 0;
}
