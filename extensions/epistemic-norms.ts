import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

interface ExtensionAPI {
  on(
    event: "before_agent_start",
    handler: (event: { systemPrompt: string }) => Promise<{
      systemPrompt: string;
    }>,
  ): void;
}

const extensionDir = dirname(fileURLToPath(import.meta.url));
const root = join(extensionDir, "..");
const normsSource = readFileSync(join(root, "norms.md"), "utf8");
const metadata = JSON.parse(
  readFileSync(join(root, "norms-metadata.json"), "utf8"),
);
const sha256 = createHash("sha256").update(normsSource).digest("hex");

if (sha256 !== metadata.sha256) {
  throw new Error(
    `norms.md SHA-256 mismatch: expected ${metadata.sha256}, got ${sha256}`,
  );
}

const norms =
  `${normsSource.trimEnd()}\n\n` +
  `Epistemic norms provenance: version ${metadata.version}; ` +
  `dated ${metadata.date}; SHA-256 ${metadata.sha256}.`;

export default function epistemicNorms(pi: ExtensionAPI) {
  pi.on("before_agent_start", async (event) => {
    return {
      systemPrompt: `${event.systemPrompt}\n\n${norms}`,
    };
  });
}
