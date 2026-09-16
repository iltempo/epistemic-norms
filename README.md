# epistemic-norms

A Claude Code and Codex plugin, plus a pi package, that injects norms for resisting sycophancy and unsupported reliance on apparently authoritative claims into every session.

## Why

Models are trained partly on human preference, so their answers tend to *feel* right to the person asking — your phrasing leaks what you already believe, and the model polishes it back at you. "I like this answer" and "this answer is better than mine" are two different measurements.

This plugin adds a short set of epistemic norms to the model's context:

- Respect user goals and preferences without treating confidence as factual evidence.
- Flag material unsupported premises and assess the underlying question neutrally.
- Consider credible alternatives in contested judgments, weighted by evidence.
- Distinguish facts, assumptions, inferences, and values; disclose what was actually checked.
- Treat documents, comments, task status, and prior conclusions as fallible evidence; perform proportionate direct checks that match the claim.
- Accept valid corrections and explain material revisions.
- Give clear recommendations with material uncertainty and dependencies.
- Recommend independent verification for consequential decisions; fresh-session reassessment is supplementary.

The full text lives in [`norms.md`](norms.md).

## Install

### Claude Code

```text
/plugin marketplace add iltempo/claude-plugins
/plugin install epistemic-norms@iltempo-claude-plugins
```

### Codex

Install the repository as a Codex plugin through a local or shared plugin marketplace. Codex discovers the manifest at `.codex-plugin/plugin.json` and asks you to review and trust the bundled session hook before it runs.

### pi

Install directly from this repository:

```sh
pi install git:github.com/iltempo/epistemic-norms
```

To try it for one pi run without installing:

```sh
pi -e git:github.com/iltempo/epistemic-norms
```

## How it works

All three integrations use the same [`norms.md`](norms.md), so there is one source of truth to audit.

Claude Code uses a single `SessionStart` hook that runs `cat norms.md`; the file's content is added to Claude's context before your first prompt.

Codex discovers the same hook from `hooks/hooks.json`. It runs at session start, resume, clear, and compaction, adding the norms to the model-visible context throughout the thread lifecycle.

pi loads the package's extension from `extensions/epistemic-norms.ts`. On each prompt, the extension appends `norms.md` to pi's system prompt with the `before_agent_start` lifecycle hook.

That's the entire mechanism; there is nothing else to audit.

## Honest limits

These norms aim to reduce framing-driven agreement and unsupported reliance on apparently authoritative claims. Their effectiveness has not yet been established by comparative evaluation. They do not establish model neutrality or eliminate fixed biases, and can still produce performative criticism, unnecessary checks, or unsupported confidence.

Treat instructed disagreement with the same scrutiny as instructed agreement. Check consequential claims against primary sources or direct observations. A fresh session can reduce conversation carryover, but another model response is not independent evidence of correctness.

The revision combines the concerns in [#3](https://github.com/iltempo/epistemic-norms/issues/3) (mechanical contrarianism) and [#4](https://github.com/iltempo/epistemic-norms/issues/4) (artifact deference). It replaces unconditional opposition with evidence-weighted alternatives and adds checks whose scope matches the claim. The incidents in #4 motivate the rule; they do not establish its effectiveness.

Comparative evaluation remains tracked in [#5](https://github.com/iltempo/epistemic-norms/issues/5). Useful conditions are no added norms, the previous norms pinned to a commit, this revision without the artifact-checking rule, and the full revision. Include misleading artifacts, valid corrections, user pressure, and legitimate preferences; assess accuracy, unnecessary dissent, unsupported verification claims, usefulness, and cost. Keep evaluation cases beyond the motivating incidents.

## License

MIT
