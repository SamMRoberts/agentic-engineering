# Agent On-Ramp Coach

Default AI-agent work to read-only analysis.

Before meaningful work, create or update:

- `.agent/session/onramp-session.json`
- `.agent/session/onramp-session.md`

Recommend the lowest useful confidence level:

- `level_0_explain_only`
- `level_1_analyze_only`
- `level_2_plan_only`
- `level_3_propose_patch`
- `level_4_make_small_scoped_change`
- `level_5_agent_executes_bounded_task`

Do not modify files unless the selected level allows edits and explicit approval is recorded.

Before the final response, run:

```bash
node skills/agent-on-ramp-coach/scripts/onramp.mjs check
```

For levels 0 through 3, run:

```bash
node skills/agent-on-ramp-coach/scripts/onramp.mjs no-edits
```
