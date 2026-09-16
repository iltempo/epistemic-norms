# epistemic-norms

A Claude Code and Codex plugin, plus a pi package, that injects anti-sycophancy norms into every session.

## Why

Models are trained partly on human preference, so their answers tend to *feel* right to the person asking — your phrasing leaks what you already believe, and the model polishes it back at you. "I like this answer" and "this answer is better than mine" are two different measurements.

The same posture shows up toward text that is not yours: an agent reads far more repository text than user text, and none of it pushes back. A ticked task, a rationale comment, or the model's own earlier conclusion gets taken as settled when the check that would settle it is cheap and at hand.

This plugin adds a short set of epistemic norms to the model's context at session start:

- Don't adopt the user's framing silently — flag questions that presuppose their answer.
- For contested judgments, state the strongest credible alternative or objection that materially affects the conclusion, weighted by evidence; do not manufacture disagreement or equal balance.
- Label claims as externally checkable vs. judgment calls, say what a checkable claim rests on, and make cheap checks before asserting. Match checks to claims, scope completion, safety, and relevance claims ("fixed", "safe", "unrelated") to the evidence, and use and link primary sources for material claims.
- Flag answers that would change under a rephrasing or an opposite stake.
- Respect user goals and preferences without treating confidence or a preferred factual conclusion as evidence.
- No manufactured pushback — genuine agreement gets stated plainly, with what evidence would change it. Revise on evidence, not on insistence. Give a clear recommendation when the evidence warrants one.
- For consequential decisions, recommend a fresh-session re-ask with neutral phrasing and independent verification of the key claims.

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

All three integrations use the same [`norms.md`](norms.md). Its version, date, and SHA-256 fingerprint live in [`norms-metadata.json`](norms-metadata.json), giving reviewers a compact provenance record to audit.

Claude Code uses a single `SessionStart` hook that verifies and emits `norms.md`; its content and provenance record are added to Claude's context before your first prompt.

Codex discovers the same hook from `hooks/hooks.json`. It runs at session start, resume, clear, and compaction, adding the norms to the model-visible context throughout the thread lifecycle.

pi loads the package's extension from `extensions/epistemic-norms.ts`. On each prompt, the extension verifies the fingerprint and appends `norms.md` plus its provenance record to pi's system prompt with the `before_agent_start` lifecycle hook.

Every pull request runs the synchronization tests. A change fails verification unless the package and plugin versions match the provenance version, the date is valid, and the recorded fingerprint matches the exact bytes of `norms.md`.

That's the entire mechanism; there is nothing else to audit.

## Honest limits

These norms aim to reduce framing-driven agreement and unsupported reliance on apparently authoritative claims. Their effectiveness has not yet been established by comparative evaluation. They do not establish model neutrality or eliminate fixed biases. They can also produce performative criticism: pushback that exists because it was requested. Treat instructed disagreement with the same scrutiny as instructed agreement, and keep some of your evaluation outside the conversation: re-ask important questions in fresh sessions, compare answers across opposed framings, and check predictions against outcomes.

Sound epistemic advice and an instruction that measurably changes model output are different things. In [AISI's "Ask Don't Tell" (2026)](https://www.aisi.gov.uk/blog/ask-dont-tell-reducing-sycophancy-in-large-language-models-2), reframing the input as a question outperformed a generic anti-sycophancy instruction on GPT-4o, GPT-5, and Claude Sonnet 4.5. The study supports question reframing in the tested setting; it does not validate this norms block or establish the benefit of restarting a conversation. Its synthetic single-turn tasks and model-based grading limit generalization. A fresh-session assessment is not itself independent evidence that a conclusion is correct.

The "cheap check" rule may increase tool calls and, in permission modes that require confirmation, approval prompts. The evaluation plan from [#5](https://github.com/iltempo/epistemic-norms/issues/5) is consolidated in [PR #6](https://github.com/iltempo/epistemic-norms/pull/6); comparative evaluation remains outstanding.

## License

MIT
