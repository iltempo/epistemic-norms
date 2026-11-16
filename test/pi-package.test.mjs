import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import test from "node:test";
import { promisify } from "node:util";

const root = new URL("../", import.meta.url);
const execFileAsync = promisify(execFile);

async function readText(path) {
  return readFile(new URL(path, root), "utf8");
}

test("package manifest declares a pi extension package", async () => {
  const pkg = JSON.parse(await readText("package.json"));

  assert.equal(pkg.name, "epistemic-norms");
  assert.match(pkg.version, /^\d+\.\d+\.\d+$/);
  assert.ok(pkg.keywords.includes("pi-package"));
  assert.deepEqual(pkg.pi.extensions, ["./extensions"]);
  assert.equal(pkg.dependencies, undefined);
  assert.equal(pkg.peerDependencies, undefined);
});

test("version, date, and norms digest stay synchronized", async () => {
  const pkg = JSON.parse(await readText("package.json"));
  const claude = JSON.parse(await readText(".claude-plugin/plugin.json"));
  const codex = JSON.parse(await readText(".codex-plugin/plugin.json"));
  const metadata = JSON.parse(await readText("norms-metadata.json"));
  const norms = await readText("norms.md");

  assert.equal(metadata.version, pkg.version);
  assert.equal(claude.version, pkg.version);
  assert.equal(codex.version, pkg.version);
  assert.match(metadata.date, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(
    new Date(`${metadata.date}T00:00:00Z`).toISOString().slice(0, 10),
    metadata.date,
  );
  assert.match(
    norms,
    new RegExp(`^Version: ${metadata.version.replaceAll(".", "\\.")}$`, "m"),
  );
  assert.match(norms, new RegExp(`^Date: ${metadata.date}$`, "m"));
  assert.equal(
    metadata.sha256,
    createHash("sha256").update(norms).digest("hex"),
  );
});

async function runHook(index) {
  const hooks = JSON.parse(await readText("hooks/hooks.json"));
  const { command } = hooks.hooks.SessionStart[0].hooks[index];
  // Empty PATH: the hook must work with shell builtins alone.
  const { stdout } = await execFileAsync("/bin/sh", ["-c", command], {
    env: { PLUGIN_ROOT: new URL(".", root).pathname },
  });
  return stdout;
}

test("provenance file matches the norms metadata", async () => {
  const metadata = JSON.parse(await readText("norms-metadata.json"));

  assert.equal(
    await readText("provenance.txt"),
    `Epistemic norms provenance: version ${metadata.version}; ` +
      `dated ${metadata.date}; SHA-256 ${metadata.sha256}.\n`,
  );
});

test("hook emits the norms and provenance using shell builtins only", async () => {
  const norms = await readText("norms.md");
  const provenance = await readText("provenance.txt");

  assert.equal(await runHook(0), `${norms.trimEnd()}\n\n${provenance}`);
});

test("hook banner shows the current norms version", async () => {
  const metadata = JSON.parse(await readText("norms-metadata.json"));

  assert.deepEqual(JSON.parse(await runHook(1)), {
    systemMessage: `Epistemic norms v${metadata.version} loaded.`,
  });
});

test("pi extension injects the shared norms file into the system prompt", async () => {
  const extension = await readText("extensions/epistemic-norms.ts");

  assert.doesNotMatch(extension, /@earendil-works\/pi-coding-agent/);
  assert.match(extension, /"norms\.md"/);
  assert.match(extension, /norms-metadata\.json/);
  assert.match(extension, /createHash\("sha256"\)/);
  assert.match(extension, /before_agent_start/);
  assert.match(extension, /systemPrompt/);
});

test("Codex loads the norms as a skill and ships no hooks", async () => {
  const manifest = JSON.parse(await readText(".codex-plugin/plugin.json"));

  assert.equal(manifest.name, "epistemic-norms");
  assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
  assert.equal(manifest.interface.displayName, "Epistemic Norms");
  assert.equal(manifest.skills, "./codex/skills/");
  // An empty object stops Codex from discovering hooks/hooks.json.
  assert.deepEqual(manifest.hooks, {});
});

test("Codex skill carries the exact norms text and provenance", async () => {
  const norms = await readText("norms.md");
  const provenance = await readText("provenance.txt");
  const skill = await readText("codex/skills/epistemic-norms/SKILL.md");
  const match = skill.match(/^---\n([\s\S]*?)\n---\n\n([\s\S]*)$/);

  assert.ok(match, "SKILL.md needs YAML frontmatter followed by a blank line");
  const [, frontmatter, body] = match;
  assert.match(frontmatter, /^name: epistemic-norms$/m);
  assert.match(frontmatter, /^description: You MUST load this skill .+$/m);
  assert.equal(
    body,
    `${norms.trimEnd()}\n\n${provenance}`,
    "SKILL.md body must equal norms.md plus provenance.txt",
  );
});

test("Claude Code hook config stays in place", async () => {
  const hooks = JSON.parse(await readText("hooks/hooks.json"));

  assert.equal(hooks.hooks.SessionStart[0].matcher, "startup|clear|compact");
  assert.match(
    hooks.hooks.SessionStart[0].hooks[0].command,
    /PLUGIN_ROOT:-\$\{CLAUDE_PLUGIN_ROOT\}/,
  );
  assert.equal(hooks.hooks.SessionStart[0].hooks.length, 2);
});

test("README documents Claude Code, Codex, and pi installation", async () => {
  const readme = await readText("README.md");

  assert.match(readme, /### Claude Code/);
  assert.match(readme, /### Codex/);
  assert.match(readme, /### pi/);
  assert.match(readme, /pi install git:github\.com\/iltempo\/epistemic-norms/);
  assert.match(readme, /extensions\/epistemic-norms\.ts/);
  assert.match(readme, /codex\/skills\/epistemic-norms\/SKILL\.md/);
});

const syncedFiles = [
  "norms.md",
  "norms-metadata.json",
  "provenance.txt",
  "package.json",
  ".claude-plugin/plugin.json",
  ".codex-plugin/plugin.json",
  "hooks/hooks.json",
  "codex/skills/epistemic-norms/SKILL.md",
];

async function withRepoCopy(callback) {
  const dir = await mkdtemp(join(tmpdir(), "epistemic-norms-sync-"));
  try {
    for (const path of syncedFiles) {
      await cp(new URL(path, root), join(dir, path), { recursive: true });
    }
    const runSync = (...args) =>
      execFileAsync(
        process.execPath,
        [new URL("scripts/sync.mjs", root).pathname, ...args],
        { env: { ...process.env, EPISTEMIC_NORMS_ROOT: dir } },
      );
    const readCopy = (path) => readFile(join(dir, path), "utf8");
    await callback(runSync, readCopy);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("sync leaves an in-sync repository unchanged", async () => {
  await withRepoCopy(async (runSync, readCopy) => {
    const { stdout } = await runSync();

    assert.equal(stdout, "");
    for (const path of syncedFiles) {
      assert.equal(await readCopy(path), await readText(path), path);
    }
  });
});

test("sync bumps every versioned file consistently", async () => {
  await withRepoCopy(async (runSync, readCopy) => {
    await runSync("9.9.9", "2030-01-02");

    const norms = await readCopy("norms.md");
    const sha256 = createHash("sha256").update(norms).digest("hex");
    const provenance =
      "Epistemic norms provenance: version 9.9.9; " +
      `dated 2030-01-02; SHA-256 ${sha256}.\n`;

    assert.match(norms, /^Version: 9\.9\.9$/m);
    assert.match(norms, /^Date: 2030-01-02$/m);
    assert.deepEqual(JSON.parse(await readCopy("norms-metadata.json")), {
      version: "9.9.9",
      date: "2030-01-02",
      sha256,
    });
    assert.equal(await readCopy("provenance.txt"), provenance);
    for (const path of [
      "package.json",
      ".claude-plugin/plugin.json",
      ".codex-plugin/plugin.json",
    ]) {
      assert.equal(JSON.parse(await readCopy(path)).version, "9.9.9", path);
    }
    assert.match(
      await readCopy("hooks/hooks.json"),
      /Epistemic norms v9\.9\.9 loaded\./,
    );
    assert.ok(
      (await readCopy("codex/skills/epistemic-norms/SKILL.md")).endsWith(
        `\n---\n\n${norms.trimEnd()}\n\n${provenance}`,
      ),
    );
  });
});

test("sync rejects a malformed version", async () => {
  await withRepoCopy(async (runSync) => {
    await assert.rejects(runSync("1.4"), /version must look like 1\.2\.3/);
  });
});
