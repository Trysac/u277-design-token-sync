import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { run } from "../src/cli.js";

function createIo() {
  const chunks: string[] = [];
  return {
    stdout: {
      write: (data: string) => {
        chunks.push(`out:${data}`);
      },
    },
    stderr: {
      write: (data: string) => {
        chunks.push(`err:${data}`);
      },
    },
    output: () => chunks.join(""),
    stderrOutput: () =>
      chunks
        .filter((c) => c.startsWith("err:"))
        .map((c) => c.slice(4))
        .join(""),
  };
}

describe("CLI run", () => {
  it("build writes files and returns 0", async () => {
    const dir = await mkdtemp(join(tmpdir(), "dts-test-"));
    const tokensFile = join(dir, "tokens.json");
    const cssFile = join(dir, "tokens.css");
    const tsFile = join(dir, "tokens.ts");
    await writeFile(tokensFile, '{"color":{"$type":"color","$value":"#fff"}}', "utf8");

    const io = createIo();
    const exitCode = await run(["build", tokensFile, "--css", cssFile, "--ts", tsFile], io);

    expect(exitCode).toBe(0);
    expect(await readFile(cssFile, "utf8")).toBe(":root {\n  --color: #ffffff;\n}\n");
    expect(await readFile(tsFile, "utf8")).toBe(
      'export const tokens = {\n  "color": "#ffffff",\n} as const;\nexport type TokenName = keyof typeof tokens;\n',
    );
    await rm(dir, { recursive: true, force: true });
  });

  it("check mode returns 1 and prints stale for differ", async () => {
    const dir = await mkdtemp(join(tmpdir(), "dts-test-"));
    const tokensFile = join(dir, "tokens.json");
    const cssFile = join(dir, "tokens.css");
    await writeFile(tokensFile, '{"color":{"$type":"color","$value":"#fff"}}', "utf8");
    await writeFile(cssFile, ":root {\n  --other: #000;\n}\n", "utf8");

    const io = createIo();
    const exitCode = await run(["build", tokensFile, "--css", cssFile, "--check"], io);

    expect(exitCode).toBe(1);
    expect(io.stderrOutput()).toContain(`stale: ${cssFile}`);
    await rm(dir, { recursive: true, force: true });
  });

  it("check mode reports the output path exactly as given on stale", async () => {
    const dir = await mkdtemp(join(tmpdir(), "dts-test-"));
    const previous = process.cwd();
    try {
      await writeFile(
        join(dir, "tokens.json"),
        '{"color":{"$type":"color","$value":"#fff"}}',
        "utf8",
      );
      await writeFile(join(dir, "tokens.css"), ":root {\n  --other: #000;\n}\n", "utf8");
      process.chdir(dir);

      const io = createIo();
      const exitCode = await run(["build", "tokens.json", "--css", "tokens.css", "--check"], io);

      expect(exitCode).toBe(1);
      expect(io.stderrOutput()).toBe("stale: tokens.css\n");
    } finally {
      process.chdir(previous);
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("check mode returns 0 when identical", async () => {
    const dir = await mkdtemp(join(tmpdir(), "dts-test-"));
    const tokensFile = join(dir, "tokens.json");
    const cssFile = join(dir, "tokens.css");
    const content = ":root {\n  --color: #ffffff;\n}\n";
    await writeFile(tokensFile, '{"color":{"$type":"color","$value":"#fff"}}', "utf8");
    await writeFile(cssFile, content, "utf8");

    const io = createIo();
    const exitCode = await run(["build", tokensFile, "--css", cssFile, "--check"], io);

    expect(exitCode).toBe(0);
    expect(io.stderrOutput()).toBe("");
    await rm(dir, { recursive: true, force: true });
  });

  it("applies --prefix to css variable names", async () => {
    const dir = await mkdtemp(join(tmpdir(), "dts-test-"));
    const tokensFile = join(dir, "tokens.json");
    const cssFile = join(dir, "tokens.css");
    await writeFile(tokensFile, '{"color":{"$type":"color","$value":"#fff"}}', "utf8");

    const io = createIo();
    const exitCode = await run(["build", tokensFile, "--css", cssFile, "--prefix", "ds"], io);

    expect(exitCode).toBe(0);
    expect(await readFile(cssFile, "utf8")).toBe(":root {\n  --ds-color: #ffffff;\n}\n");
    await rm(dir, { recursive: true, force: true });
  });

  it("check mode reports stale ts files", async () => {
    const dir = await mkdtemp(join(tmpdir(), "dts-test-"));
    const tokensFile = join(dir, "tokens.json");
    const tsFile = join(dir, "tokens.ts");
    await writeFile(tokensFile, '{"color":{"$type":"color","$value":"#fff"}}', "utf8");
    await writeFile(tsFile, "export const tokens = {} as const;\n", "utf8");

    const io = createIo();
    const exitCode = await run(["build", tokensFile, "--ts", tsFile, "--check"], io);

    expect(exitCode).toBe(1);
    expect(io.stderrOutput()).toContain(`stale: ${tsFile}`);
    await rm(dir, { recursive: true, force: true });
  });

  it("missing tokens file returns 2", async () => {
    const dir = await mkdtemp(join(tmpdir(), "dts-test-"));
    const io = createIo();
    const exitCode = await run(
      ["build", join(dir, "absent.json"), "--css", join(dir, "out.css")],
      io,
    );

    expect(exitCode).toBe(2);
    await rm(dir, { recursive: true, force: true });
  });

  it("option without a value returns 2", async () => {
    const io = createIo();
    const exitCode = await run(["build", "tokens.json", "--css"], io);
    expect(exitCode).toBe(2);
    expect(io.stderrOutput()).toContain("usage");
  });

  it("run without build subcommand returns 2", async () => {
    const emptyIo = createIo();
    expect(await run([], emptyIo)).toBe(2);
    expect(emptyIo.stderrOutput()).toContain("usage");

    const bareBuildIo = createIo();
    expect(await run(["build"], bareBuildIo)).toBe(2);
    expect(bareBuildIo.stderrOutput()).toContain("usage");
  });

  it("run build with no outputs returns 2", async () => {
    const io = createIo();
    const exitCode = await run(["build", "tokens.json"], io);
    expect(exitCode).toBe(2);
    expect(io.stderrOutput()).toContain("usage");
  });

  it("token error returns 1 and prints message", async () => {
    const dir = await mkdtemp(join(tmpdir(), "dts-test-"));
    const tokensFile = join(dir, "tokens.json");
    await writeFile(tokensFile, '{"a":{"$value":1}}', "utf8");

    const io = createIo();
    const exitCode = await run(["build", tokensFile, "--css", join(dir, "out.css")], io);

    expect(exitCode).toBe(1);
    expect(io.stderrOutput()).toContain("missing_type");
    await rm(dir, { recursive: true, force: true });
  });
});
