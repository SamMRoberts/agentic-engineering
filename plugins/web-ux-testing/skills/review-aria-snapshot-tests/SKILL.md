---
name: review-aria-snapshot-tests
description: 'Use when reviewing existing ARIA snapshot scenarios, Playwright toMatchAriaSnapshot tests, .aria.yml baselines, or snapshot diffs for stability, privacy, and semantic coverage. Use for baseline review, dynamic-content risk, accessible role/name/state regressions, and snapshot scope quality. Do not use for creating new ARIA coverage from scratch.'
argument-hint: 'Provide plan path, test files, .aria.yml baselines, snapshot diff, target components, or review scope.'
user-invocable: true
---

# Review ARIA Snapshot Tests

Review ARIA snapshot coverage and baseline diffs as user-facing semantic UX artifacts, not as harmless snapshot churn.

## Required inputs

- Plan path, ARIA scenario, Playwright test file, `.aria.yml` baseline, or snapshot diff
- Target page, region, component, or workflow when known
- Dynamic content policy when known
- Whether the review is for a new baseline, changed baseline, or existing coverage audit

If no baseline, test file, scenario, or diff is provided, ask for the artifact to review before approving or rejecting changes.

## Procedure

1. Identify the snapshot scope: page, locator, region, form, dialog, menu, navigation, component, or app shell.
2. Check whether the scope is small and stable enough. Prefer locator-scoped snapshots over broad page snapshots.
3. Review roles, accessible names, headings, landmarks, states, focus behavior, and validation semantics.
4. Check for unstable dynamic content such as timestamps, generated IDs, randomized content, large changing lists, or personalized content.
5. Check for private user content in `.aria.yml` baselines and require removal or masking before accepting the baseline.
6. Treat removed roles, names, states, landmarks, focus behavior, or validation semantics as potential regressions until reviewed by a human.
7. Recommend baseline names, snapshot scopes, or Playwright locator changes when the current test is too broad or brittle.
8. Do not approve baseline changes automatically.

## Review criteria

Flag these as problems:

- snapshots that are too broad
- dynamic content in baselines without regex, mask, omit, or avoid-snapshot policy
- missing role/name/state checks
- missing landmark, heading, form, dialog, menu, or status-region coverage
- private or personalized user data in `.aria.yml` baselines
- missing manual-review policy for snapshot updates
- Playwright tests that use brittle CSS where role, label, text, or test-id locators would be better

## Output

Return:

1. Summary judgment
2. High-risk snapshot problems
3. Potential semantic regressions
4. Privacy or dynamic-content concerns
5. Recommended snapshot scopes and baseline names
6. Suggested Playwright test changes

When evidence is incomplete, say what artifact or diff is missing instead of approving the baseline.