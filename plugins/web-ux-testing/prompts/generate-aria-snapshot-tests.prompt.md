---
description: 'Use when adding ARIA snapshot, accessibility-tree, or Playwright toMatchAriaSnapshot coverage to a web UX test plan or regression test set.'
agent: web-ux-testing-agent
argument-hint: 'Plan path, target pages or components, stable locators, dynamic content policy, and desired output.'
---

Use [generate-aria-snapshot-tests](../skills/generate-aria-snapshot-tests/SKILL.md).

Generate ARIA snapshot testing coverage for this web UX test plan. Default to `web-ux-test/plan.yaml` when no plan path is provided.

Use Playwright CLI regression tests for durable ARIA checks and Playwright MCP or an agent browser for exploratory inspection.

Add or update:

- accessibility scenarios for ARIA snapshots
- `.aria.yml` baseline names
- locator-scoped snapshot targets
- dynamic content policy
- conversion candidates for Playwright CLI

Rules:

- Prefer locator-scoped snapshots over full-page snapshots.
- Use page-level snapshots only for stable app shells.
- Prefer role, label, text, and test-id locators.
- Do not snapshot sensitive user content.
- Do not accept generated snapshots without review.
- Use regex or scoped snapshots for dynamic content.
- Include findings when accessible roles, names, states, or landmarks are missing.

When `.aria.yml` baselines are created or changed, validate with `npm run validate:aria -- tests/aria` when available and require human review before accepting baseline updates.
