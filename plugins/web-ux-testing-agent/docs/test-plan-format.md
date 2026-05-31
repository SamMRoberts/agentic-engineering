# Test plan format

Test plans are authored in **YAML** and validated against
`schemas/test-plan.schema.json` (which references `test-step.schema.json` and
`environment.schema.json`). The authoritative validator is
`lib/plan-validator.mjs`, exposed through the `plan-authoring` skill and
`npm run validate:plan`.

## Top-level fields

| Field | Required | Description |
| --- | --- | --- |
| `id` | ✅ | Stable kebab-case id; also the spec file base name. |
| `title` | ✅ | Human-readable title; becomes the Playwright `test()` name. |
| `environment` | ✅ | Target environment + runtime config (see below). |
| `steps` | ✅ | Ordered list of deterministic steps. |
| `schema_version` | | Defaults to `"1.0"`. |
| `description`, `tags` | | Documentation / filtering. |
| `preconditions` | | Human-readable prerequisites. |
| `assertions` | | Success-criteria steps (same shape as steps). |
| `cleanup` | | Steps to undo created/mutated data. |
| `metadata` | | Author, source workflow, etc. |

## Environment

```yaml
environment:
  name: staging
  base_url: ${BASE_URL}          # env indirection, never a literal secret
  stage: staging
  test_id_attribute: data-testid
  browsers: [chromium]
  auth:
    required: true
    strategy: storage_state
    storage_state_path: .auth/staging.json
  destructive_actions_allowed: true
```

## Steps

Each step maps 1:1 to a Playwright `test.step()`.

| Field | Description |
| --- | --- |
| `id` | Stable kebab-case id, unique in the plan. |
| `action` | One of `navigate`, `click`, `dblclick`, `fill`, `select`, `check`, `uncheck`, `press`, `hover`, `upload`, `wait_for`, `assert_visible`, `assert_hidden`, `assert_text`, `assert_value`, `assert_url`, `assert_count`, `capture`. |
| `target` | Accessible-first locator (see below). Required for DOM actions. |
| `value` | Action payload (fill text, option, key(s), expected text/value/count, file path(s)). |
| `url` | For `navigate` / `assert_url`. |
| `state` | For `wait_for`: `visible`/`hidden`/`attached`/`detached`/`enabled`/`disabled`. |
| `timeout_ms` | Per-step timeout override. |
| `optional` | A failure is reported but does not fail the test. |
| `needs_discovery` | Selector unknown; resolve via Playwright MCP before CLI run. |
| `notes` | Authoring notes; never executed. |

## Locators (accessible-first)

```yaml
target: { role: button, name: Add New }
target: { label: Title }
target: { text: Page created }
target: { test_id: submit }
target:
  role: menuitem
  name: Page
  within: { role: dialog, name: Add New }   # scope to a container
```

Priority is `getByRole` → `getByLabel` → `getByText` → `getByTestId`. `css` and
`xpath` exist as discouraged fallbacks; prefer marking a step `needs_discovery`
over guessing a brittle selector.

## Example

See `examples/create-page.plan.yaml` (the create-page workflow) and
`examples/login-and-save-auth.plan.yaml` (auth capture).

## Validate & normalize

```bash
npm run validate:plan examples/create-page.plan.yaml
npm run normalize:plan examples/create-page.plan.yaml -- --write
```
