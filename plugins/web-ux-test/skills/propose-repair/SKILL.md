---
name: propose-repair
description: "Use when a failing run has been classified and a fix is being proposed. Use for authoring a schema-valid repair proposal that targets only the allowlisted paths."
argument-hint: "<path to repair-proposal YAML>"
user-invocable: false
---

# Propose repair

## Scope

Author or validate a repair proposal YAML that:

- Conforms to `schemas/repair-proposal.schema.yaml`.
- Sets `requiresApproval: true` (auto-apply is rejected by schema).
- Targets only files under `.web-ux-testing/plans/**` or `generated-tests/**`.

The CLI rejects out-of-scope targets and never auto-applies.

## Procedure

1. Author a YAML file matching the schema (see `schemas/repair-proposal.schema.yaml` and `test/repair/repair.test.mjs` for valid examples).
2. Validate and record:
   ```bash
   web-ux-test repair propose --proposal <path>
   ```
   Or:
   ```bash
   node skills/propose-repair/scripts/validate-proposal.mjs <path>
   ```
3. Present `before`/`after` diffs to the user.
4. On explicit approval: `web-ux-test repair approve` then `web-ux-test repair apply`.

## Output

- Validated proposal stored under `.web-ux-testing/repairs/<proposalId>.yaml`.
- Workflow state updated: `pendingRepairId` set; phase becomes `repair_proposed`.

## Safety

- Never propose changes to source files outside the allowlist.
- Never call `repair approve` without explicit user approval.
- The applied edit always writes a backup under `.web-ux-testing/runs/<runId>/repair-backup/`; if `before` is missing in the target file, the apply rolls back automatically.
