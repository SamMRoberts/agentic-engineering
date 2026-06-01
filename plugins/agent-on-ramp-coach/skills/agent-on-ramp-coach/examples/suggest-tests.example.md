# Suggest Tests Example

## Prompt

"I am about to change invoice rounding. Suggest tests before I touch the code."

## Expected Agent Behavior

- Select `level_2_plan_only`.
- Inspect current tests and rounding behavior.
- Suggest success, edge, regression, and failure cases.
- Do not add tests until the user approves a higher confidence level.

## Useful Output

The engineer should get a compact test plan with exact behaviors, input examples, expected results, and which existing tests may need updates.
