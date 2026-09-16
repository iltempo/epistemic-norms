# epistemic-norms

A Claude Code and Codex plugin, plus a pi package, that injects anti-sycophancy norms into every session.

## Why

Models are trained partly on human preference, so their answers tend to *feel* right to the person asking — your phrasing leaks what you already believe, and the model polishes it back at you. "I like this answer" and "this answer is better than mine" are two different measurements.

The same posture shows up toward text that is not yours: an agent reads far more repository text than user text, and none of it pushes back. A ticked task, a rationale comment, or the model's own earlier conclusion gets taken as settled when the check that would settle it is cheap and at hand.

This plugin adds a short set of epistemic norms to the model's context at session start:

- Don't adopt the user's framing silently — flag questions that presuppose their answer.
- On contested or consequential questions, give the strongest case against a stated position before evaluating it; where no credible dispute exists, say so.
- Label claims as externally checkable vs. judgment calls, say what a checkable claim rests on, and make cheap checks before asserting. Closure claims ("fixed", "safe", "unrelated") name what would falsify them.
- Flag answers that would change under a rephrasing or an opposite stake.
- Lay out both sides before recommending, weighted by evidence rather than balanced for symmetry; prefer primary sources over narration.
- No manufactured pushback — genuine agreement gets stated plainly, with what evidence would change it. Revise on evidence, not on insistence.
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

All three integrations use the same [`norms.md`](norms.md), so there is one source of truth to audit.

Claude Code uses a single `SessionStart` hook that runs `cat norms.md`; the file's content is added to Claude's context before your first prompt.

Codex discovers the same hook from `hooks/hooks.json`. It runs at session start, resume, clear, and compaction, adding the norms to the model-visible context throughout the thread lifecycle.

pi loads the package's extension from `extensions/epistemic-norms.ts`. On each prompt, the extension appends `norms.md` to pi's system prompt with the `before_agent_start` lifecycle hook.

That's the entire mechanism; there is nothing else to audit.

## Honest limits

These norms constrain *adaptive* bias (the kind that tracks your framing), not *fixed* bias — no instruction makes a model a neutral curator, only a flagged one. They can also produce performative criticism: pushback that exists because it was requested. Treat instructed disagreement with the same scrutiny as instructed agreement, and keep some of your evaluation outside the conversation: re-ask important questions in fresh sessions, compare answers across opposed framings, and check predictions against outcomes.

The norms describe intended behaviour; their effectiveness has not been measured. Sound epistemic advice and an instruction that measurably changes model output are different things. The one external result we know of points the other way for most of this file: in [AISI's "Ask Don't Tell" (2026)](https://www.aisi.gov.uk/blog/ask-dont-tell-reducing-sycophancy-in-large-language-models-2), reframing the input as a neutral question outperformed a generic anti-sycophancy instruction on GPT-4o, GPT-5, and Claude Sonnet 4.5 (single-turn, synthetic prompts, model-graded). That is evidence for the fresh-session rule, not for the six bullets above it. The "cheap check" rule adds tool calls the previous text never triggered; in a permission mode that confirms each call, those are prompts for you to approve. See [#5](https://github.com/iltempo/epistemic-norms/issues/5) for the open evaluation question.

## License

MIT
