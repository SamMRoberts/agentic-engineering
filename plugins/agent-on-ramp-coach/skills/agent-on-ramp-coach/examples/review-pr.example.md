# Review PR Example

## Prompt

"Review this PR for risky behavior changes. I am not ready for the agent to edit anything."

## Expected Agent Behavior

- Select `level_1_analyze_only`.
- Inspect the diff and relevant tests.
- Focus on bugs, regressions, missing tests, and unclear behavior.
- Avoid style-only comments unless they affect maintainability.
- Produce findings with file references and review items.

## Useful Output

The engineer should get a short list of risks, why each risk matters, what evidence supports it, and what to review before merging.
