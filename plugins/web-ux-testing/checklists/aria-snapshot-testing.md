# ARIA Snapshot Testing Checklist

Use ARIA snapshot tests when semantic structure is important and reasonably stable.

## Good ARIA snapshot targets

- app shell
- primary navigation
- main page landmarks
- primary forms
- dialogs and menus
- tabs, accordions, comboboxes, and disclosure controls
- loading, empty, and error regions
- reusable components with important accessible states

## Avoid snapshotting

- personalized private content
- randomized IDs
- timestamps
- large dynamic lists
- search results that frequently change
- volatile marketing content
- generated content that is not part of the UX contract

## Good assertions

- headings have expected levels and names
- landmarks exist and are named when needed
- buttons and links have accessible names
- form fields have names and validation state
- menus/dialogs/tabs expose correct roles and selected/expanded states
- loading and error states are represented accessibly

## Review rules

- Do not auto-accept ARIA snapshot changes.
- Review diffs as user-facing semantic changes, not harmless snapshots.
- Prefer locator-scoped snapshots over full-page snapshots.
- Use regex matching for intentional dynamic text.
- Convert stable ARIA scenarios into Playwright CLI regression tests.
