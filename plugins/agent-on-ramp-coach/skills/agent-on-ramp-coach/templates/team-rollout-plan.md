# Team Rollout Plan

## Week 1: read-only explanation and repo orientation

Use `level_0_explain_only` and `level_1_analyze_only` for code walkthroughs, file summaries, terminology, and test-failure explanations. Require session summaries. Do not allow code edits.

## Week 2: test suggestions and debugging plans

Use `level_2_plan_only` for test strategy, debug plans, reproduction notes, and risk mapping. Agents may write only `.agent/session/` artifacts.

## Week 3: PR/diff review assistance

Use `level_1_analyze_only` and `level_2_plan_only` for PR summaries, review findings, and change-impact maps. Engineers remain responsible for accepting or rejecting findings.

## Week 4: small patch proposals

Use `level_3_propose_patch` so agents can show intended changes without applying them. Require a human to approve scope and verification before edits.

## Week 5+: bounded implementation with verification

Use `level_4_make_small_scoped_change` or `level_5_agent_executes_bounded_task` only for tasks with explicit scope, allowed files, verification commands, and rollback expectations.
