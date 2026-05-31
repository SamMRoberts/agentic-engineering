# Test plan schema

A test plan is a YAML file under `.web-ux-testing/plans/<id>.yaml` that conforms to `schemas/test-plan.schema.yaml`.

## Top-level fields

| Field | Required | Notes |
| --- | --- | --- |
| `id` | yes | Kebab-case, used in run IDs and generated spec file names. Pattern: `^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$`. |
| `name` | yes | Short human-readable name. |
| `description` | no | Up to 4000 characters. |
| `target.baseUrl` | yes | Fully-qualified URL. |
| `target.browser` | no | `chromium` (default), `firefox`, `webkit`. |
| `auth.required` | no | Boolean. |
| `auth.mode` | no | `none` (default) or `storageState`. |
| `auth.storageStatePath` | conditional | Required when `auth.required: true` and `auth.mode: storageState`. |
| `execution.timeoutMs` | no | 1000–600000. Default 60000. |
| `execution.retries` | no | 0–5. Default 0. |
| `execution.headless` | no | Default `true`. |
| `plan[]` | yes | At least one step. |

## Step fields

Each step has `id`, `action`, and action-specific required fields:

| Action | Required additional fields |
| --- | --- |
| `goto` | `target` |
| `click` | `selector` |
| `waitFor` | `selector` |
| `assertVisible` | `selector` |
| `assertHidden` | `selector` |
| `type` | `selector`, `value` |
| `press` | `key` |
| `fillForm` | `fields[]` (each with `selector` and `value`) |

Each step may include `description` (up to 500 chars) and `expect[]`.

## Expectations

Each expectation has a `type` and action-specific fields:

| Type | Required additional fields |
| --- | --- |
| `visible` | `selector` |
| `hidden` | `selector` |
| `textContains` | `selector`, `text` |
| `urlMatches` | `pattern` (JavaScript RegExp source) |
| `formValid` | (none) |

## Example

See `test/fixtures/plan-valid-example.yaml`.

## Validation

```bash
web-ux-test plan validate .web-ux-testing/plans/<id>.yaml
```

The validator emits one `ERROR <path>: <issue>` line per violation to stderr and exits 1 on any schema error.
