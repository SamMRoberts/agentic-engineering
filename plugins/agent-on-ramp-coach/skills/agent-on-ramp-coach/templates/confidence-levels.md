# Confidence Levels

| Level | What the agent may do | File changes | Typical use |
| --- | --- | --- | --- |
| `level_0_explain_only` | Explain code, concepts, errors, tests, or workflows | None | Learning what something means |
| `level_1_analyze_only` | Inspect files, logs, diffs, test output, and repo structure | None | Understanding a problem or PR |
| `level_2_plan_only` | Create a plan, risk assessment, test strategy, or implementation outline | Only `.agent/session/` | Deciding whether to proceed |
| `level_3_propose_patch` | Show intended changes or a patch proposal | None unless approved | Reviewing edits before applying |
| `level_4_make_small_scoped_change` | Make approved edits inside a narrow scope and run verification | Approved files only | Small local fix or test update |
| `level_5_agent_executes_bounded_task` | Complete a bounded task with tests and verification | Approved task contract only | Well-scoped implementation |
