# epistemic-norms

A Claude and Codex plugin, plus a pi package, that gives the model a set of anti-sycophancy norms: in every session for Claude Code and pi, and as an on-demand skill for supported chat surfaces and Codex.

## Why

Models are trained partly on human preference, so their answers tend to *feel* right to the person asking — your phrasing leaks what you already believe, and the model polishes it back at you. "I like this answer" and "this answer is better than mine" are two different measurements.

The same posture shows up toward text that is not yours: an agent reads far more repository text than user text, and none of it pushes back. A ticked task, a rationale comment, or the model's own earlier conclusion gets taken as settled when the check that would settle it is cheap and at hand.

This plugin adds a short set of epistemic norms to the model's context at session start:

- Flag questions that presuppose their answer or signal a preferred conclusion.
- For contested judgments, state the strongest credible objection, weighted by evidence. No manufactured disagreement; genuine agreement gets stated plainly. Revise on evidence, not on insistence or confidence. Give a clear recommendation when the evidence warrants one.
- Say what a checkable claim rests on, make cheap checks before asserting, scope claims like "fixed", "safe", or "unrelated" to the evidence, and link primary sources for material external claims.

The full text lives in [`norms.md`](norms.md).

## Install

### Claude Code

```text
/plugin marketplace add iltempo/claude-plugins
/plugin install epistemic-norms@iltempo-claude-plugins
```

### Codex

Add the marketplace, then install the plugin:

```sh
codex plugin marketplace add iltempo/claude-plugins
codex plugin add epistemic-norms@iltempo-claude-plugins
```

The Codex plugin ships no hooks, so there is nothing to approve after installing or updating.

### pi

Install directly from this repository:

```sh
pi install git:github.com/iltempo/epistemic-norms
```

To try it for one pi run without installing:

```sh
pi -e git:github.com/iltempo/epistemic-norms
```

### Claude Chat and ChatGPT Chat

The plugin includes skills for chat, with their bodies generated from the same `norms.md` as the other integrations. Claude Chat uses [`skills/epistemic-norms/SKILL.md`](skills/epistemic-norms/SKILL.md); the OpenAI plugin uses the Codex skill. Hooks do not run in Claude Chat.

For updates without manually uploading a new skill, use a repository-backed plugin marketplace where your account supports it:

- Claude allows users to [add a marketplace from a Git repository](https://support.claude.com/en/articles/13837440-use-plugins-in-claude). Organization marketplaces can [sync from GitHub](https://support.claude.com/en/articles/13837433-manage-plugins-for-your-organization), with plan, repository visibility, and administrator requirements.
- ChatGPT workspace administrators can [import a marketplace from GitHub](https://help.openai.com/en/articles/20001504-importing-and-syncing-plugin-marketplaces-from-github); automatic daily sync is enabled for new marketplaces. Access depends on workspace and plan settings.

These routes require a compatible marketplace and its own configuration; the repository's existing marketplace is `iltempo/claude-plugins`. GitHub receives changes only after they are pushed. Sync can lag or fail, and individual chat skill selection is not guaranteed. Confirm the version and behavior in the intended product after setup.

## How it works

All three integrations use the same [`norms.md`](norms.md). Its version, date, and SHA-256 fingerprint live in [`norms-metadata.json`](norms-metadata.json), giving reviewers a compact provenance record to audit.

Claude Code uses a `SessionStart` hook in `hooks/hooks.json`. It prints `norms.md` followed by the provenance line from [`provenance.txt`](provenance.txt), which Claude Code adds to the model's context, and shows a one-line "loaded" banner. It runs at startup, after `/clear`, and after compaction; a resumed session already holds the norms in its transcript. The hook script, [`hooks/session-start`](hooks/session-start), uses only POSIX shell builtins, so it needs no Node and keeps working when the hook runs with an empty `PATH`. It supports macOS and Linux; Windows is not supported.

Codex loads the norms as a skill, [`codex/skills/epistemic-norms/SKILL.md`](codex/skills/epistemic-norms/SKILL.md), whose body is `norms.md` plus the provenance line. The Codex manifest sets `"hooks": {}`, so Codex skips the hook and only the skill's description sits in context; the model loads the full norms when a question asks for an opinion, judgment, or recommendation, or signals a preferred answer. You can also load it yourself with `$epistemic-norms`.

pi loads the package's extension from `extensions/epistemic-norms.ts`. On each prompt, the extension verifies the fingerprint and appends `norms.md` plus its provenance record to pi's system prompt with the `before_agent_start` lifecycle hook.

Every pull request runs the synchronization tests. A change fails verification unless the package and plugin versions match the provenance version, the date is valid, the recorded fingerprint matches the exact bytes of `norms.md`, `provenance.txt` matches the metadata, the hook banner shows the same version, and both skill bodies match `norms.md` plus `provenance.txt`. To bump the version, run `npm run sync -- <version>`; after editing the norms text, run `npm run sync` to refresh the fingerprint and every file that carries it.

That's the entire mechanism; there is nothing else to audit.

## Honest limits

In Codex the norms apply only in turns where the model loads the skill. In a small headless test (Codex 0.169, five opinion prompts run twice each) it loaded the skill in 7 of 10 runs, including both runs of a leading "…objectively better, right?" question, and missed one run of another leading question. Load it yourself with `$epistemic-norms` when it matters.

These norms aim to reduce framing-driven agreement and unsupported reliance on apparently authoritative claims. Their effectiveness has not yet been established by comparative evaluation. They do not establish model neutrality or eliminate fixed biases. They can also produce performative criticism: pushback that exists because it was requested. Treat instructed disagreement with the same scrutiny as instructed agreement, and keep some of your evaluation outside the conversation: re-ask important questions in fresh sessions, compare answers across opposed framings, and check predictions against outcomes.

Sound epistemic advice and an instruction that measurably changes model output are different things. In [AISI's "Ask Don't Tell" (2026)](https://www.aisi.gov.uk/blog/ask-dont-tell-reducing-sycophancy-in-large-language-models-2), reframing the input as a question outperformed a generic anti-sycophancy instruction on GPT-4o, GPT-5, and Claude Sonnet 4.5. The study supports question reframing in the tested setting; it does not validate this norms block or establish the benefit of restarting a conversation. Its synthetic single-turn tasks and model-based grading limit generalization. A fresh-session assessment is not itself independent evidence that a conclusion is correct.

A small A/B check in November 2026 (Claude Opus 5.5 and Sonnet 5.5, GPT-6 Astra, GPT-6.1 Terra, GPT-6 Luna; synthetic prompts; answers graded by Opus 5.5) found no measurable gain in correctness: without the norms the models already resisted opposite framings, caught ticked tasks and comments that the code contradicted, and held correct answers through three turns of insistence. The measured differences on Opus were that leading questions were flagged more often (24 of 24 answers versus 16 of 24) and answers ran about 15–20% longer. The samples were small, the cases easy, and no rule was tested on its own. Version 1.5.0 therefore keeps three rules and drops the ones about framing sensitivity, user goals, and fresh-session re-asks; that cut is a judgment call, not a measured result.

The "cheap check" rule may increase tool calls and, in permission modes that require confirmation, approval prompts. The evaluation plan from [#5](https://github.com/iltempo/epistemic-norms/issues/5) is consolidated in [PR #6](https://github.com/iltempo/epistemic-norms/pull/6); comparative evaluation remains outstanding.

## License

MIT
