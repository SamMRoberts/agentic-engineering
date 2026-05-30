---
name: scan-web-frontend-codebase
description: 'Use when auto-detecting testable surfaces in a web frontend repository for Playwright planning. Produces a structured Surface Inventory of framework, routes, interactive flows, auth surfaces, accessibility signals, destructive flows, and existing test coverage. Use for: codebase scan, route enumeration, form/flow discovery, auth surface detection, a11y signal detection, test coverage gap analysis. Do not use for: writing tests, running browsers, or executing scenarios.'
argument-hint: 'Repository root (workspace-relative), in-scope folders, out-of-scope folders, and any user-stated framework hints.'
user-invocable: false
---

# Scan Web Frontend Codebase

Produce a Surface Inventory from read-only repository evidence so the planning step has concrete targets.

## When to Use

- Before generating a Playwright test plan and the inventory is missing.
- When the user asks "what should I test?" or "scan my frontend".
- When user-stated scope must be reconciled with the actual repository.

## Inputs

- Repository root (default: workspace root).
- In-scope folders/globs (optional; default: framework's app/src/pages roots).
- Out-of-scope folders/globs (always honored).
- User-stated framework, if any (used to bias detection, never to override evidence).

## Procedure

Use `read` and `search` only. Do not run shell commands.

1. **Framework detection**
   - Read `package.json`. Match top-level deps against: `react`, `next`, `vue`, `nuxt`, `svelte`, `@sveltejs/kit`, `@angular/core`, `astro`, `@remix-run/react`, `solid-js`, `qwik`.
   - Record the highest-confidence match and the evidence path.

2. **Route enumeration**
   - Next.js app router: `app/**/page.{ts,tsx,js,jsx}` and `app/**/route.{ts,js}`.
   - Next.js pages router: `pages/**/*.{ts,tsx,js,jsx}` (exclude `_app`, `_document`, `api/**`).
   - SvelteKit: `src/routes/**/+page.svelte`.
   - Nuxt: `pages/**/*.vue`.
   - React Router / generic SPA: grep for `<Route\s+path=` and `createBrowserRouter`.
   - Angular: grep for `RouterModule.forRoot(` and `path:` in `*-routing.module.ts`.
   - Astro/Remix: `src/pages/**/*.astro`, `app/routes/**`.
   - Record each route as `{ path, file, framework_hint }`.

3. **Interactive surfaces**
   - Search for `<form`, `onSubmit`, `useForm(`, `handleSubmit`, `<button`, `<input type="file"`, `dialog`, `Modal`, `Drawer`.
   - Group results by file. Flag any file that owns a `<form>` with user inputs as an interactive flow.

4. **Auth surfaces**
   - Search for path/handler names containing `login`, `signin`, `signup`, `logout`, `auth`, `session`, `oauth`, `oidc`, `clerk`, `nextauth`, `supabase.auth`.
   - Record the most likely entry route and any storage-state hints (`storageState`, `cookies.set(`).

5. **A11y signals**
   - Grep for `role=`, `aria-`, `tabIndex=`, `Skip to content`, `<label`, `htmlFor=`, focus-trap utilities.
   - Record file counts and notable patterns (e.g., presence/absence of skip links, modal focus traps).

6. **Destructive flow detection**
   - Search handler names and routes for verbs: `delete`, `remove`, `destroy`, `send`, `purchase`, `pay`, `charge`, `transfer`, `archive`, `wipe`, `reset`, `admin`.
   - Flag each match as `destructive: true` and recommend `priority: P1` with explicit user confirmation.

7. **Existing test coverage**
   - Look for `playwright.config.*`, `cypress.config.*`, `vitest.config.*`, `jest.config.*`.
   - Enumerate `**/*.spec.{ts,tsx,js,jsx}`, `**/*.test.{ts,tsx,js,jsx}`, `e2e/**`, `tests/e2e/**`.
   - Map covered routes/flows by inspecting test file titles (`test(`, `describe(`).

8. **Coverage gap calculation**
   - For each route and interactive flow discovered in steps 2–3, mark `covered: true` if any existing test references it; otherwise `covered: false`.

## Output

Return a Surface Inventory object:

```yaml
framework:
  name: <string>
  evidence: <path>
routes:
  - path: <string>
    file: <path>
    covered: true | false
interactive_flows:
  - file: <path>
    kind: form | button-action | modal | file-upload
    destructive: true | false
auth_surfaces:
  - entry_route: <string>
    files: [<path>]
    storage_state_hint: <path or null>
a11y_signals:
  has_skip_link: true | false
  aria_attribute_files: <count>
  notes: [<string>]
destructive_flows:
  - file: <path>
    verb: <string>
    requires_explicit_user_confirmation: true
existing_tests:
  runners: [<playwright|cypress|vitest|jest>]
  files: [<path>]
  covered_routes: [<string>]
coverage_gaps:
  uncovered_routes: [<string>]
  uncovered_flows: [<path>]
notes: [<short observation>]
```

Surface this back to the orchestrator without modifying files.
