# Gremlin Mode Checklist

Use this checklist when a web-ux-gremlin plan or generated Playwright spec should release the gremlins. Pick tactics that match the requested scope and safety constraints; do not use every tactic in every run.

## Interaction Mayhem

- Double-click primary actions and verify only one user-visible result occurs.
- Click submit, save, or navigation controls repeatedly while the page is updating.
- Navigate back, forward, or reload in the middle of a multi-step flow.
- Toggle filters, tabs, accordions, checkboxes, and switches out of the usual order.
- Cancel, retry, and resume operations without returning to a clean start state.

## Input Mischief

- Paste instead of typing into important fields.
- Enter emoji, accents, right-to-left text, mixed casing, whitespace-only values, and very long values.
- Try boundary numbers, invalid dates, special characters, duplicate names, and file names with spaces or punctuation.
- Skip optional fields, then return and fill them after validation has already fired.
- Mix keyboard shortcuts such as Enter and Escape with mouse interactions.

## State Disruption

- Resize the viewport or switch device profiles during a task.
- Open the same flow in a second tab and return to a stale first tab.
- Clear cookies, local storage, or session storage only when safe for the target flow.
- Simulate offline and online transitions for retryable operations.
- Change theme, locale, time zone, or reduced-motion settings when the app exposes those controls.

## Accessibility Mischief

- Complete the flow with keyboard-only navigation.
- Cycle focus through dialogs, drawers, menus, and validation errors.
- Press Escape inside modals, popovers, dropdowns, and date pickers.
- Verify visible names, roles, error messages, and focus recovery after gremlin actions.
- Confirm disabled or busy states are announced or otherwise visible to users.

## Recovery Expectations

- The app should avoid duplicate records, duplicate charges, or duplicated user-visible success messages.
- Validation should identify the exact field or action that needs attention.
- The user should be able to recover without losing safe in-progress work unexpectedly.
- Navigation and reloads should land on a coherent state, not a blank page or broken route.
- Errors should be visible, understandable, and actionable without exposing internals.

## Safety Boundaries

- Never target production data or real accounts unless the user explicitly approved safe test fixtures.
- Do not run uncontrolled load, fuzzing loops, denial-of-service patterns, or destructive actions.
- Do not capture or print credentials, tokens, cookies, private data, or secrets.
- Prefer deterministic gremlin actions over random behavior so failures can be reproduced.
- Avoid arbitrary sleeps, pixel coordinates, hidden implementation details, and brittle selectors.
