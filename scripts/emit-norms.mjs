import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const norms = await readFile(new URL("norms.md", root), "utf8");
const metadata = JSON.parse(
  await readFile(new URL("norms-metadata.json", root), "utf8"),
);
const sha256 = createHash("sha256").update(norms).digest("hex");

if (sha256 !== metadata.sha256) {
  throw new Error(
    `norms.md SHA-256 mismatch: expected ${metadata.sha256}, got ${sha256}`,
  );
}

if (process.argv.includes("--system-message")) {
  process.stdout.write(
    `${JSON.stringify({
      systemMessage: `Epistemic norms v${metadata.version} loaded.`,
    })}\n`,
  );
  process.exit(0);
}

process.stdout.write(
  `${norms.trimEnd()}\n\n` +
    `Epistemic norms provenance: version ${metadata.version}; ` +
    `dated ${metadata.date}; SHA-256 ${metadata.sha256}.\n`,
);
