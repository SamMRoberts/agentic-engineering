---
description: 'Use when converting selected web UX findings or stable exploratory scenarios into durable Playwright CLI regression tests.'
agent: web-ux-testing-agent
argument-hint: 'Finding IDs or scenario IDs, source plan/findings path, target test directory, auth strategy, and test data setup.'
---

Use [convert-web-ux-plan-to-playwright-tests](../skills/convert-web-ux-plan-to-playwright-tests/SKILL.md).

Convert selected web UX findings into durable Playwright CLI regression tests.

Rules:

- Prefer role, label, text, and test-id locators.
- Do not use pixel coordinates.
- Do not use arbitrary fixed sleeps.
- Use explicit assertions.
- Use isolated test data when possible.
- Avoid production-destructive actions.
- Preserve the user-facing regression behavior.
- Add comments only where they clarify intent.
- Include the command to run the test.
- Do not convert manual-only, production-dependent, or nondeterministic scenarios without first recommending a safer fixture or narrower regression case.

For each converted finding, include:

- source finding id
- target test file path
- generated Playwright test
- required setup
- required test data
- limitations or assumptions
