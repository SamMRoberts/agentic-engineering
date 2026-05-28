---
name: generate-aria-snapshot-tests
description: 'Use when adding ARIA snapshot, accessibility-tree, or Playwright toMatchAriaSnapshot() coverage to web UX plans or tests. Use for semantic regression tests of stable app shells, navigation, forms, dialogs, menus, components, landmarks, names, states, focus, and validation messages. Do not use for purely visual screenshot regression or highly dynamic personalized content.'
argument-hint: 'Describe target pages/components, stable locators, dynamic content policy, and desired plan or Playwright output.'
user-invocable: true
---

# Generate ARIA Snapshot Tests

Add ARIA-focused web UX scenarios or Playwright assertions that protect user-facing semantic structure.

## Purpose

ARIA tests validate the user-facing accessibility structure of a page or component. They are useful for catching regressions where visible UI may still render, but headings, landmarks, names, states, or semantic relationships are broken.

## When to recommend ARIA snapshot tests

Recommend ARIA snapshot tests for:

- stable app shells
- primary navigation
- dashboards and key landing pages
- forms with labels, required fields, validation messages, and disabled states
- menus, dialogs, tabs, accordions, comboboxes, and disclosure controls
- empty, loading, and error states
- critical user workflows where semantic structure matters

Avoid broad ARIA snapshots for:

- highly dynamic content lists
- timestamps, generated IDs, randomized content, or personalized content
- large pages where snapshots become noisy
- purely visual layout validation

If the user asks for visual layout or pixel diff testing, recommend a visual testing workflow instead and only add ARIA checks for semantic coverage.

## Procedure

1. Identify stable targets: app shell, landmarks, navigation, forms, dialogs, menus, tabs, or components with predictable roles and names.
2. Choose the smallest useful snapshot scope. Default to locator-scoped snapshots for components and regions; use page-level snapshots only for stable shells.
3. Define a dynamic content policy before generating baselines: `regex`, `mask`, `omit`, or `avoid_snapshot` for personalized, timestamped, generated, or frequently changing content.
4. Add ARIA metadata to relevant web UX scenarios and include `aria_snapshot` or `accessibility_snapshot` evidence.
5. For Playwright CLI output, prefer role and label locators, assert visibility first, then use `expect(locator).toMatchAriaSnapshot()` with a named baseline.
6. Require human review for changed `.aria.yml` baselines. Never auto-accept baseline changes as proof of correctness.
7. Validate generated baselines with `npm run validate:aria -- tests/aria` or `node scripts/validate-aria-snapshots.mjs tests/aria` when baseline files are created.

## Required output

When adding ARIA testing support to a plan, update or create:

- `web-ux-test/areas/accessibility.yaml`
- `web-ux-test/areas/aria-snapshots.yaml` when ARIA coverage is substantial
- scenario entries with `evidence: [aria_snapshot, accessibility_snapshot]`
- Playwright CLI regression candidates using `expect(locator).toMatchAriaSnapshot()`
- `.aria.yml` baseline names for stable pages/components

When generating files, use `npm run scaffold:aria -- --scenario=<id> --title=<title> --route=<route> --role=<role> --baseline=<name>.aria.yml` or `node scripts/scaffold-aria-snapshot-test.mjs` as a starting point, then tailor the locators and baseline content.

## ARIA scenario style

Use scoped snapshots where possible:

- Prefer `expect(locator).toMatchAriaSnapshot()` for components or regions.
- Use `expect(page).toMatchAriaSnapshot()` only for stable pages or app shells.
- Prefer role locators such as `getByRole`, `getByLabel`, and `getByText` before falling back to test IDs.
- Keep snapshots focused on meaningful structure, not every piece of text.
- Use regex or partial matching for dynamic names when appropriate.

## Required scenario fields

ARIA scenarios should include:

- target: page, region, form, dialog, navigation, menu, or component
- locator_strategy: role, label, test-id, or css fallback
- snapshot_scope: page, locator, or region
- baseline_name: stable `.aria.yml` file name
- dynamic_content_policy: mask, omit, regex, or avoid_snapshot
- checks for roles, names, states, landmarks, focus, and validation messages

## Safety and quality rules

- Do not use ARIA snapshots as a substitute for manual UX judgment.
- Do not snapshot unstable content unless it is intentionally matched with regex or scoped out.
- Do not store sensitive user content in ARIA baselines.
- Do not accept snapshots blindly; review diffs for user-facing semantic changes.
- Prefer smaller component or region snapshots over one huge page snapshot.
