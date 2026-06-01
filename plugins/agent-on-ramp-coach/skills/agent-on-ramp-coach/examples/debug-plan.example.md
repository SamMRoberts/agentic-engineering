# Debug Plan Example

## Prompt

"This test fails in CI but passes locally. Build a debug plan without changing code."

## Expected Agent Behavior

- Select `level_2_plan_only`.
- Inspect failure output, test setup, environment assumptions, and nearby fixtures.
- Avoid edits and state-changing commands.
- Produce a reproduction plan and prioritized hypotheses.

## Useful Output

The plan should separate likely causes from low-confidence guesses and list the exact commands a human can run next.
