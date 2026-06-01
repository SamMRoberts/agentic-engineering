# Explain Code Example

## Prompt

"Explain how `RetryPolicy` decides whether to retry. Do not change files."

## Expected Agent Behavior

- Select `level_1_analyze_only`.
- State which files it will inspect before reading them.
- Inspect the named implementation and directly related tests.
- Explain the retry decision path, edge cases, and uncertainty.
- Record no file modifications.

## Useful Output

The summary should tell the engineer which conditions are retryable, where the retry limit is enforced, which tests cover the behavior, and what remains uncertain.
