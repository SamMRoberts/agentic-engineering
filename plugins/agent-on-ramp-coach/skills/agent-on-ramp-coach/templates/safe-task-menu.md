# Safe Task Menu

Each workflow should record its `name`, `description`, `recommended_confidence_level`, `allowed_actions`, `forbidden_actions`, `expected_output`, and `example_prompt` in the session artifact.

## Read-Only Understanding

### explain_code
- description: Explain a file, function, module, error, or workflow in plain engineering terms.
- recommended_confidence_level: `level_0_explain_only`
- allowed_actions: Read user-provided snippets or explicitly named files.
- forbidden_actions: Modify files, run state-changing commands, infer hidden requirements.
- expected_output: Short explanation, assumptions, and follow-up questions.
- example_prompt: "Explain how this module handles retries without changing anything."

### summarize_file
- description: Summarize one file or a small set of files.
- recommended_confidence_level: `level_1_analyze_only`
- allowed_actions: Read named files and summarize structure, dependencies, and risks.
- forbidden_actions: Modify files or broaden to unrelated areas.
- expected_output: File summary, key decisions, and review notes.
- example_prompt: "Summarize this file for me before I edit it."

### find_risky_areas
- description: Identify likely risk points before a human changes code.
- recommended_confidence_level: `level_1_analyze_only`
- allowed_actions: Inspect relevant files and tests.
- forbidden_actions: Apply fixes or run destructive commands.
- expected_output: Risk list with evidence and suggested checks.
- example_prompt: "Where is this change likely to break behavior?"

### map_change_impact
- description: Map callers, tests, and contracts affected by a proposed change.
- recommended_confidence_level: `level_1_analyze_only`
- allowed_actions: Search references and inspect tests.
- forbidden_actions: Modify implementation.
- expected_output: Impact map and test targets.
- example_prompt: "What would be affected if I rename this API field?"

## Debugging Support

### create_debug_plan
- description: Turn a symptom or failure into a stepwise debug plan.
- recommended_confidence_level: `level_2_plan_only`
- allowed_actions: Read logs, errors, relevant files, and test output.
- forbidden_actions: Patch code without approval.
- expected_output: Reproduction steps, hypotheses, and next commands.
- example_prompt: "Help me debug this failure without changing code."

### explain_test_failure
- description: Explain why a test failed and what evidence supports the explanation.
- recommended_confidence_level: `level_1_analyze_only`
- allowed_actions: Read failure output and related test/source files.
- forbidden_actions: Change tests or source files.
- expected_output: Failure cause, uncertainty, and suggested next check.
- example_prompt: "Explain this test failure and what I should inspect next."

## Testing Support

### suggest_tests
- description: Suggest meaningful tests for a planned change.
- recommended_confidence_level: `level_2_plan_only`
- allowed_actions: Inspect current tests and contracts.
- forbidden_actions: Add tests without approval.
- expected_output: Test plan with success, edge, and regression cases.
- example_prompt: "Suggest tests for this change before I implement it."

## Review Support

### summarize_pr
- description: Summarize a PR or branch diff for human review.
- recommended_confidence_level: `level_1_analyze_only`
- allowed_actions: Inspect diffs and related files.
- forbidden_actions: Modify files or resolve comments.
- expected_output: Change summary, risks, and review checklist.
- example_prompt: "Summarize this PR so I can review it faster."

### review_diff
- description: Review a diff for bugs, regressions, missing tests, and safety issues.
- recommended_confidence_level: `level_1_analyze_only`
- allowed_actions: Inspect the diff and referenced files.
- forbidden_actions: Apply fixes without explicit approval.
- expected_output: Findings ordered by severity with file references.
- example_prompt: "Review this diff, but do not edit anything."

### review_agent_output
- description: Review another agent's changes or plan for correctness and scope drift.
- recommended_confidence_level: `level_1_analyze_only`
- allowed_actions: Inspect changed files, session artifacts, and verification output.
- forbidden_actions: Rewrite the work without approval.
- expected_output: Trust assessment, gaps, and recommended next step.
- example_prompt: "Check whether this agent output is safe to accept."

## Documentation Support

### draft_handoff_notes
- description: Draft concise notes for another engineer.
- recommended_confidence_level: `level_2_plan_only`
- allowed_actions: Inspect relevant files and summarize current state.
- forbidden_actions: Commit docs or code without approval.
- expected_output: Handoff summary, open questions, and next steps.
- example_prompt: "Draft handoff notes for what I learned here."

### generate_readme_update_plan
- description: Plan README updates without editing documentation.
- recommended_confidence_level: `level_2_plan_only`
- allowed_actions: Inspect README and implementation surfaces.
- forbidden_actions: Modify docs without approval.
- expected_output: Proposed README sections and examples to add.
- example_prompt: "Tell me how the README should change for this feature."

### identify_missing_docs
- description: Find documentation gaps for a feature or workflow.
- recommended_confidence_level: `level_1_analyze_only`
- allowed_actions: Inspect docs and code surfaces.
- forbidden_actions: Write docs without approval.
- expected_output: Missing docs list and priority.
- example_prompt: "What documentation is missing for this workflow?"

## Small Controlled Implementation

### create_small_refactor_plan
- description: Plan a small refactor with scope, risk, and verification.
- recommended_confidence_level: `level_2_plan_only`
- allowed_actions: Inspect source and tests.
- forbidden_actions: Refactor without explicit approval.
- expected_output: Refactor plan, safe boundaries, and rollback notes.
- example_prompt: "Plan a small refactor, but do not edit yet."
