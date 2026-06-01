# Agent On-Ramp Coach

Use Agent On-Ramp Coach for safe AI-assisted engineering workflows.

Default to read-only analysis unless the user explicitly approves edits.

Before meaningful work, create or update:

- `.agent/session/onramp-session.json`
- `.agent/session/onramp-session.md`

Select the lowest useful confidence level:

- `level_0_explain_only`
- `level_1_analyze_only`
- `level_2_plan_only`
- `level_3_propose_patch`
- `level_4_make_small_scoped_change`
- `level_5_agent_executes_bounded_task`

Do not modify files unless the selected confidence level allows edits and approval is recorded.

Record:

- task and workflow type
- risk level
- allowed and forbidden actions
- files inspected
- commands run
- files modified
- findings
- recommendations
- human review items
- verification commands
- final status
- next suggested step

Before final response, run:

```bash
node skills/agent-on-ramp-coach/scripts/onramp.mjs check
```

For levels 0 through 3, also run:

```bash
node skills/agent-on-ramp-coach/scripts/onramp.mjs no-edits
```

Prefer the driveable commands over hand-editing the session JSON:

```bash
node skills/agent-on-ramp-coach/scripts/onramp.mjs menu
node skills/agent-on-ramp-coach/scripts/onramp.mjs start --task "<task>" --workflow <type> --risk <level> --selected-level <level>
node skills/agent-on-ramp-coach/scripts/onramp.mjs record --inspected <file> --command "<cmd>" --finding "<text>"
node skills/agent-on-ramp-coach/scripts/onramp.mjs status
node skills/agent-on-ramp-coach/scripts/onramp.mjs complete
```
