# epistemic-norms

A Claude Code plugin and pi package that injects anti-sycophancy norms into every session.

## Why

Models are trained partly on human preference, so their answers tend to *feel* right to the person asking — your phrasing leaks what you already believe, and the model polishes it back at you. "I like this answer" and "this answer is better than mine" are two different measurements.

This plugin adds a short set of epistemic norms to Claude's context at session start:

- Don't adopt the user's framing silently — flag questions that presuppose their answer.
- Give the strongest case against a stated position before evaluating it.
- Label claims as externally checkable vs. judgment calls.
- Flag answers that would change under a rephrasing or an opposite stake.
- Lay out both sides before recommending; prefer primary sources over narration.
- No manufactured pushback — genuine agreement gets stated plainly, with what evidence would change it.
- For consequential decisions, recommend a fresh-session re-ask with neutral phrasing.

The full text lives in [`norms.md`](norms.md).

## Install

### Claude Code

```text
/plugin marketplace add iltempo/claude-plugins
/plugin install epistemic-norms@iltempo-claude-plugins
```

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

Both integrations use the same [`norms.md`](norms.md), so there is one source of truth to audit.

Claude Code uses a single `SessionStart` hook that runs `cat norms.md`; the file's content is added to Claude's context before your first prompt.

pi loads the package's extension from `extensions/epistemic-norms.ts`. On each prompt, the extension appends `norms.md` to pi's system prompt with the `before_agent_start` lifecycle hook.

That's the entire mechanism; there is nothing else to audit.

## Honest limits

These norms constrain *adaptive* bias (the kind that tracks your framing), not *fixed* bias — no instruction makes a model a neutral curator, only a flagged one. They can also produce performative criticism: pushback that exists because it was requested. Treat instructed disagreement with the same scrutiny as instructed agreement, and keep some of your evaluation outside the conversation: re-ask important questions in fresh sessions, compare answers across opposed framings, and check predictions against outcomes.

## License

MIT
