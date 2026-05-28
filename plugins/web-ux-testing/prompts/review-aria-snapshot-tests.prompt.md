---
description: 'Use when reviewing ARIA snapshot scenarios, Playwright toMatchAriaSnapshot tests, or .aria.yml baselines for stability, privacy, and semantic coverage.'
agent: web-ux-testing-agent
argument-hint: 'Plan path, test files, .aria.yml baselines, or snapshot diff to review.'
---

Review the ARIA snapshot testing coverage.

Check for:

- too-broad page snapshots
- unstable dynamic content in baselines
- missing landmark, heading, form, dialog, menu, or status-region coverage
- accessible names that are missing or too generic
- states such as expanded, selected, disabled, invalid, checked, or required
- snapshots that include private or personalized user data
- Playwright tests that use brittle CSS when role/label/test-id locators would be better

Return:

1. Summary judgment
2. High-risk snapshot problems
3. Recommended snapshot scopes
4. Suggested `.aria.yml` baseline names
5. Playwright test changes

Do not approve baseline changes automatically. Treat removed roles, names, states, landmarks, focus behavior, or validation semantics as potential regressions until reviewed.
