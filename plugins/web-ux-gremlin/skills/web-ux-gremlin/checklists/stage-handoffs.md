# Stage Handoffs

Use these templates when routing from the public `web-ux-gremlin` skill to private stage skills.

## Shared Context

```text
Scope:
Assumptions:
Out of scope:
Selected runner:
Auth policy:
Safety constraints:
Known artifacts:
Validation required:
Blockers:
Run contract:
```

## Plan Handoff

```text
Target app or URL:
Scope / flows:
UX risks or bug classes:
Mode:
Gremlin intensity:
High-chaos approval:
Auth and starting state:
Safety constraints:
Plan output path:
Out of scope:
Run contract:
```

## Generate Handoff

```xml
<test-suite>Plan section name</test-suite>
<test-name>Scenario name</test-name>
<test-file>tests/path/to/scenario-name.spec.ts</test-file>
<seed-file>tests/seed.spec.ts or n/a</seed-file>
<mode>standard or gremlin</mode>
<intensity>1-5 or n/a</intensity>
<high-chaos-confirmed>yes | no | n/a</high-chaos-confirmed>
<run-contract>mode=..., intensity=..., browser=..., tool=..., headed_auth=..., run_mode=..., tests=..., safe_fixtures=..., high_chaos_approved=..., report=...</run-contract>
<body>Scenario steps, expected outcomes, and UX failure mode from the saved plan</body>
```

## Heal Handoff

```text
Failing command:
Failing test file:
Failing test name:
Browser/project:
Observed error:
Expected behavior:
Mode:
Gremlin intensity:
High-chaos approval:
Run contract:
Suspected UX bug or failure mode:
Safety constraints:
```
