# Copilot CLI adapter

**Status:** MVP — documented contract and CLI stubs only. The adapter is invoked through `web-ux-test agent <subcommand>` but does not yet call any external LLM tooling. A future release will implement these subcommands; the contract below is locked so that future implementation is additive.

## Why an adapter

`web-ux-test` keeps the CLI as the workflow authority. Copilot CLI (or any equivalent LLM worker) is useful for:

- Drafting test plans from a natural-language goal.
- Generating Playwright tests when the workflow's deterministic generator is insufficient (e.g., for non-standard interactions).
- Explaining failures in human-readable terms beyond the classifier's category.
- Proposing repairs.

In every case the worker's output is **validated** by the CLI. Invalid output is rejected and the workflow stays blocked. The worker is never the authority.

## Subcommands

| Subcommand | Stage | Purpose |
| --- | --- | --- |
| `web-ux-test agent draft-plan` | requirements → plan | Turn a goal description into a candidate plan YAML. |
| `web-ux-test agent generate-test` | plan → execute | Produce a Playwright spec for plan steps the deterministic generator cannot cover. |
| `web-ux-test agent explain-failure` | triage | Human-readable analysis of the latest failure. |
| `web-ux-test agent propose-repair` | repair | Draft a repair proposal YAML for human review. |

In the MVP, each subcommand exits 0 with a "not implemented" message and a pointer to this document.

## Required output shape

All adapter subcommands must emit JSON to stdout matching:

```json
{
  "status": "proposal",
  "summary": "Short, one-paragraph summary of what was produced.",
  "assumptions": ["..."],
  "risks": ["..."],
  "files": [
    {
      "path": "relative/path/under/repo",
      "content": "full file contents"
    }
  ],
  "nextRequiredGate": "test_reviewed"
}
```

Field rules:

- `status`: `proposal` (default) or `blocked`.
- `summary`: required, non-empty.
- `assumptions` and `risks`: arrays; may be empty but must be present.
- `files`: array of `{ path, content }`. Paths must be relative and limited to the same allowlist that `propose_repair` uses: `.web-ux-testing/plans/**`, `generated-tests/**`. Other paths are rejected.
- `nextRequiredGate`: the workflow phase the user must drive next.

## Validation

The CLI's adapter wrapper will:

1. Refuse to execute external tooling if no validated plan exists (when the subcommand requires one).
2. Capture stdout, parse JSON, and validate against the shape above.
3. Reject malformed JSON or out-of-scope file targets.
4. **Never apply changes**; written files are placed in the workflow's proposal directory for the human approval gate to consume.

If the adapter returns invalid output, the workflow remains in its current phase and the CLI surfaces the validation errors verbatim.

## Implementation notes for the future

- Spawn Copilot CLI (or another worker) via `child_process.spawn` and pipe stdin/stdout.
- Pass a strict prompt that includes:
  - The workflow phase the user is in.
  - The path of any existing plan, run record, or proposal the worker should use as context.
  - The shape required for the JSON output.
- Apply a hard timeout (default 60s) and surface timeouts as `status: "blocked"`.
