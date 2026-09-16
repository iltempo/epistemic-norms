import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
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
  assert.equal(pkg.peerDependencies["@earendil-works/pi-coding-agent"], "*");
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

test("hook output keeps verifiable norms provenance in context", async () => {
  const metadata = JSON.parse(await readText("norms-metadata.json"));
  const { stdout } = await execFileAsync(process.execPath, [
    new URL("scripts/emit-norms.mjs", root).pathname,
  ]);

  assert.match(stdout, /# Epistemic Norms/);
  assert.match(
    stdout,
    new RegExp(`version ${metadata.version.replaceAll(".", "\\.")}`),
  );
  assert.match(stdout, new RegExp(`dated ${metadata.date}`));
  assert.match(stdout, new RegExp(`SHA-256 ${metadata.sha256}`));
});

test("pi extension injects the shared norms file into the system prompt", async () => {
  const extension = await readText("extensions/epistemic-norms.ts");

  assert.match(extension, /from "@earendil-works\/pi-coding-agent"/);
  assert.match(extension, /"norms\.md"/);
  assert.match(extension, /norms-metadata\.json/);
  assert.match(extension, /createHash\("sha256"\)/);
  assert.match(extension, /before_agent_start/);
  assert.match(extension, /systemPrompt/);
});

test("Codex plugin manifest declares the session-wide integration", async () => {
  const manifest = JSON.parse(await readText(".codex-plugin/plugin.json"));
  const hooks = JSON.parse(await readText("hooks/hooks.json"));

  assert.equal(manifest.name, "epistemic-norms");
  assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
  assert.equal(manifest.interface.displayName, "Epistemic Norms");
  assert.equal(manifest.hooks, undefined);
  assert.match(
    hooks.hooks.SessionStart[0].hooks[0].command,
    /PLUGIN_ROOT:-\$\{CLAUDE_PLUGIN_ROOT\}/,
  );
  assert.match(
    hooks.hooks.SessionStart[0].hooks[0].command,
    /scripts\/emit-norms\.mjs/,
  );
  assert.equal(hooks.hooks.SessionStart[0].hooks.length, 1);
});

test("README documents Claude Code, Codex, and pi installation", async () => {
  const readme = await readText("README.md");

  assert.match(readme, /### Claude Code/);
  assert.match(readme, /### Codex/);
  assert.match(readme, /### pi/);
  assert.match(readme, /pi install git:github\.com\/iltempo\/epistemic-norms/);
  assert.match(readme, /extensions\/epistemic-norms\.ts/);
});
