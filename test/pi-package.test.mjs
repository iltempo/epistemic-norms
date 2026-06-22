import { readFile } from "node:fs/promises";
import test from "node:test";
import assert from "node:assert/strict";

const root = new URL("../", import.meta.url);

async function readText(path) {
  return readFile(new URL(path, root), "utf8");
}

test("package manifest declares a pi extension package", async () => {
  const pkg = JSON.parse(await readText("package.json"));

  assert.equal(pkg.name, "epistemic-norms");
  assert.equal(pkg.version, "1.3.0");
  assert.ok(pkg.keywords.includes("pi-package"));
  assert.deepEqual(pkg.pi.extensions, ["./extensions"]);
  assert.equal(pkg.peerDependencies["@earendil-works/pi-coding-agent"], "*");
});

test("pi extension injects the shared norms file into the system prompt", async () => {
  const extension = await readText("extensions/epistemic-norms.ts");

  assert.match(extension, /from "@earendil-works\/pi-coding-agent"/);
  assert.match(extension, /\.\."\s*,\s*"norms\.md"/);
  assert.match(extension, /before_agent_start/);
  assert.match(extension, /systemPrompt/);
});

test("Codex plugin manifest declares the session-wide integration", async () => {
  const manifest = JSON.parse(await readText(".codex-plugin/plugin.json"));
  const hooks = JSON.parse(await readText("hooks/hooks.json"));

  assert.equal(manifest.name, "epistemic-norms");
  assert.equal(manifest.version, "1.3.0");
  assert.equal(manifest.interface.displayName, "Epistemic Norms");
  assert.equal(manifest.hooks, undefined);
  assert.match(
    hooks.hooks.SessionStart[0].hooks[0].command,
    /PLUGIN_ROOT:-\$\{CLAUDE_PLUGIN_ROOT\}/,
  );
});

test("README documents Claude Code, Codex, and pi installation", async () => {
  const readme = await readText("README.md");

  assert.match(readme, /### Claude Code/);
  assert.match(readme, /### Codex/);
  assert.match(readme, /### pi/);
  assert.match(readme, /pi install git:github\.com\/iltempo\/epistemic-norms/);
  assert.match(readme, /extensions\/epistemic-norms\.ts/);
});
