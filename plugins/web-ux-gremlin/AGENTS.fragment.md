# Web UX Gremlin Workflow

Before creating or modifying Playwright or UX validation tests, use the Web UX Gremlin workflow.

Required artifact:

- `.agent/session/web-ux-gremlin-plan.yaml`

Every flow must include:

- baseline happy path
- at least three gremlin scenarios
- keyboard checks where applicable
- recovery expectations
- verification commands

Use workflow modes:

- `manual`: user-authored instructions
- `guided`: interactive prompts for target URLs, objectives, risk, and mutation depth
- `auto`: auto-augment for uncommon-path mutation coverage

Use execution modes:

- `playwright-cli` (default, alias `cli`): Playwright CLI execution
- `playwright-mcp` (alias `mcp`): Playwright MCP with persistent state and richer interaction loops

Validate before final response:

```bash
node skills/web-ux-gremlin/scripts/web-ux-gremlin.mjs workflow-status --phase plan
node skills/web-ux-gremlin/scripts/web-ux-gremlin.mjs check
node skills/web-ux-gremlin/scripts/web-ux-gremlin.mjs coverage
```

Before running Playwright, run:

```bash
node skills/web-ux-gremlin/scripts/web-ux-gremlin.mjs workflow-status --phase execute
```

If any `workflow-status --phase <next>` command fails, repair the reported plan, generated spec, Playwright JSON report, or results artifact and rerun the same gate before continuing.

Hooks and CI can enforce the artifact and validation result. They do not force agent selection.
