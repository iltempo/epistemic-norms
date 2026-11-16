// Keep every file that carries the norms version or fingerprint in sync.
//
//   npm run sync                      re-sync after editing norms.md
//   npm run sync -- 1.4.7             bump the version, dated today (UTC)
//   npm run sync -- 1.4.7 2026-12-01  bump with an explicit date
//
// The repository root defaults to the parent of this script; tests pass
// another root through EPISTEMIC_NORMS_ROOT.

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root =
  process.env.EPISTEMIC_NORMS_ROOT ??
  fileURLToPath(new URL("../", import.meta.url));
const file = (path) => join(root, path);
const read = (path) => readFile(file(path), "utf8");

async function write(path, content) {
  if ((await read(path)) === content) return;
  await writeFile(file(path), content);
  console.log(`updated ${path}`);
}

function replaceOnce(text, pattern, replacement, path) {
  if (!pattern.test(text)) throw new Error(`${path}: no match for ${pattern}`);
  return text.replace(pattern, replacement);
}

const metadata = JSON.parse(await read("norms-metadata.json"));
const [versionArg, dateArg] = process.argv.slice(2);
const version = versionArg ?? metadata.version;
const date =
  dateArg ??
  (versionArg && versionArg !== metadata.version
    ? new Date().toISOString().slice(0, 10)
    : metadata.date);

if (!/^\d+\.\d+\.\d+$/.test(version)) {
  throw new Error(`version must look like 1.2.3, got ${version}`);
}
if (
  !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
  new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date
) {
  throw new Error(`date must be a valid YYYY-MM-DD, got ${date}`);
}

// norms.md carries its own version and date; the fingerprint covers them.
let norms = await read("norms.md");
norms = replaceOnce(norms, /^Version: .*$/m, `Version: ${version}`, "norms.md");
norms = replaceOnce(norms, /^Date: .*$/m, `Date: ${date}`, "norms.md");
await write("norms.md", norms);

const sha256 = createHash("sha256").update(norms).digest("hex");
await write(
  "norms-metadata.json",
  `${JSON.stringify({ version, date, sha256 }, null, 2)}\n`,
);

const provenance =
  `Epistemic norms provenance: version ${version}; ` +
  `dated ${date}; SHA-256 ${sha256}.\n`;
await write("provenance.txt", provenance);

for (const path of [
  "package.json",
  ".claude-plugin/plugin.json",
  ".codex-plugin/plugin.json",
]) {
  const manifest = JSON.parse(await read(path));
  manifest.version = version;
  await write(path, `${JSON.stringify(manifest, null, 2)}\n`);
}

const hooksPath = "hooks/hooks.json";
await write(
  hooksPath,
  replaceOnce(
    await read(hooksPath),
    /Epistemic norms v\d+\.\d+\.\d+ loaded\./,
    `Epistemic norms v${version} loaded.`,
    hooksPath,
  ),
);

// Skills keep their own discovery descriptions, but share the hook's output.
for (const skillPath of [
  "codex/skills/epistemic-norms/SKILL.md",
  "skills/epistemic-norms/SKILL.md",
]) {
  const skill = await read(skillPath);
  const frontmatter = skill.match(/^---\n[\s\S]*?\n---\n/);
  if (!frontmatter) throw new Error(`${skillPath}: missing frontmatter`);
  await write(skillPath, `${frontmatter[0]}\n${norms.trimEnd()}\n\n${provenance}`);
}
