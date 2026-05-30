# Agentic Tooling Instructions

Use these instructions when creating or modifying repository-level agent tooling: agent skills, custom agents, plugins, MCP servers, MCP apps, prompts, hooks, schemas, templates, and supporting validation scripts.

## Working Principles

- Design agent tooling as production workflow infrastructure, not as one-off prompt text.
- Prefer small, explicit, composable artifacts over large all-purpose agents or skills.
- Keep user-facing entrypoints few and clear. Put specialized behavior in private agents, skills, scripts, schemas, and templates.
- Preserve safety boundaries across every handoff: scope, assumptions, out-of-scope items, credentials policy, destructive-action policy, selected runtime, and known artifacts.
- Use deterministic validation wherever possible. Instructions guide agent behavior; schemas, tests, and scripts enforce contracts.
- Never store credentials, tokens, private keys, session cookies, or production secrets in generated plans, examples, fixtures, or documentation.
- Ask concise clarification questions when missing inputs affect safety, execution, data mutation, authentication, or scope.

## Choose the Right Primitive

Use the smallest primitive that fits the job:

| Need | Prefer |
| --- | --- |
| Always-on repository behavior | `AGENTS.md` or repository instructions |
| File-pattern-specific guidance | `*.instructions.md` |
| Repeatable multi-step workflow with assets | Skill with `SKILL.md` |
| User-selectable persona or orchestrator | `*.agent.md` custom agent |
| Complex workflow with isolated stages | User-facing orchestrator agent plus private subagents |
| Single parameterized task | Prompt file |
| Deterministic lifecycle enforcement | Hook |
| External API, system, or data integration | MCP server tool |
| Interactive UI over MCP tools | MCP app |

Do not introduce a new primitive when an existing skill, agent, script, or schema can be extended cleanly. When an existing artifact cannot be extended cleanly (e.g., incompatible schemas, conflicting ownership, or divergent workflows), create a new skill with a distinct scope and document the boundary between the two skills in the orchestrator agent.

When extending an existing skill, agent, or schema, check for downstream dependents. Preserve backward compatibility in public interfaces or bump the version and update dependents.

When a new skill overlaps with an existing skill in another plugin, branch on ownership:

- Same owning plugin: extend the existing skill.
- Different owning plugin: do not modify the other plugin's skill. Instead:
  1. Ensure an orchestrator agent exists in your plugin. Create one following the Custom Agent Authoring section if none exists.
  2. Document the overlap and routing criteria in that orchestrator agent.
  3. Add a TODO comment in the orchestrator noting that the owning plugin maintainer should be consulted before merging.
  4. Create a new skill in your plugin with a distinct scope rather than extending the other plugin's skill.

Before acting under either branch, confirm the overlap by comparing skill scope, triggers, and outputs.

Use semantic versioning (semver) for plugin versions. Document breaking changes in `CHANGELOG.md` under a new version heading. Bump the major version for breaking public interface changes, minor for new features, patch for fixes.

## Deprecation and Removal
- Mark deprecated skills/agents with a `deprecated: true` frontmatter field and a notice in the description.
- Keep deprecated artifacts until at least one major version of the owning plugin has been released after the version in which the deprecation was introduced.
- Update orchestrator routing and documentation to redirect users to replacements.
- Remove entries from `plugin.json` only after dependents have migrated.

## Repository Shape

For plugin-style packs, follow this structure unless the existing package already has a documented directory layout in its README or contributing guide, in which case preserve that layout:

```text
plugins/<plugin-name>/
	README.md
	CHANGELOG.md
	LICENSE
	package.json
	plugin.json
	agents/
	skills/
	schemas/
	templates/
	checklists/
	profiles/
	lib/
	test/
```

- Keep `plugin.json` minimal and accurate. It should identify the agent directory, skill directory, entrypoint agent, and private agents when applicable.
- Keep `package.json` scripts aligned with the package's validation surface: tests, schema validation, scaffolding, generation, and linting.
- Put reusable logic in `lib/`, executable helpers under the owning skill's `scripts/`, and generated examples in `templates/`.
- Prefer YAML for user-editable plans, profiles, scenarios, and findings. Validate YAML with schemas and lint rules rather than relying on prose.

## Skill Authoring

Each skill must live in its own directory with a `SKILL.md` file.

Skill frontmatter must include:

- `name`: stable kebab-case name matching the directory.
- `description`: quoted when it contains colons; written as trigger-oriented discovery text using phrases such as `Use when...` and `Use for...`.
- `argument-hint`: when the skill is user-invocable or benefits from structured input.
- `user-invocable`: set deliberately. Use `true` for direct user workflows and `false` for private/internal helpers.

Skill bodies should include:

- Scope and stop conditions.
- Required inputs and which missing inputs require clarification.
- Step-by-step procedure.
- Output format and files produced or changed.
- Validation commands and expected success criteria.
- Safety rules for credentials, destructive actions, production data, and external services.

Keep the `SKILL.md` body to 200 lines or fewer (counting only lines in the `SKILL.md` file itself, after the YAML frontmatter closing `---` delimiter). Content moved to sibling folders does not count toward this limit. Move large examples, templates, reference material, and executable logic into sibling folders such as `templates/`, `checklists/`, or `scripts/`. If the 200-line limit cannot be met while covering all required sections, move procedure details and safety rules into sibling files (e.g., `checklists/safety.md`) and reference them from `SKILL.md`.

When a skill generates structured artifacts:

- Provide a schema in `schemas/` or reuse an existing schema.
- Provide a validation script or test that fails clearly on malformed output.
- Prefer structured parsers such as YAML or JSON parsers over ad hoc string manipulation.
- Include stable examples or templates that match the schema exactly.

## Custom Agent Authoring

Use custom agents for role separation, tool restrictions, and workflow orchestration.

Agent frontmatter should be explicit:

- `name`: stable kebab-case name.
- `description`: discovery-oriented and specific.
- `argument-hint`: describes the inputs the agent needs.
- `tools`: the minimum tool set required.
- `agents`: private agents the agent is allowed to delegate to.
- `model`: only when a specific model is required by the workflow.
- `user-invocable`: `true` only for entrypoints meant to be selected by users.

Prefer one user-facing orchestrator per plugin. Put stage-specific work in private agents with narrow responsibilities, such as requirements, planning, execution, results, reporting, or troubleshooting.

Orchestrator agents must:

- Classify the user's requested stage before delegating.
- Run scope and safety gates before execution, conversion, or external effects.
- Preserve scope summary, assumptions, out-of-scope items, selected runner, auth policy, safety constraints, and known artifacts across handoffs.
- Stop when required skills, agents, tools, credentials policy, or safety details are unavailable.
- Summarize files changed, validation performed, blockers, and recommended next steps.

Use this handoff context block when delegating between agents:

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
```

Private agents should not be user-invocable unless there is a clear, documented reason.

## MCP Servers, Tools, And Apps

Use MCP when the agent needs controlled access to external systems, local services, APIs, databases, filesystems outside the repository, or long-lived domain capabilities.

MCP tool design requirements:

- Expose small, purpose-specific tools with typed input schemas and predictable output shapes.
- Validate all inputs at the MCP boundary and return actionable errors.
- Use least privilege. Request only the credentials, scopes, and filesystem/network access required.
- Separate read-only tools from mutating tools. Mutating tools must describe side effects clearly and require explicit user intent.
- Make pagination, filtering, dry-run, idempotency, and retry behavior explicit for APIs that need them.
- Avoid hidden ambient state. If a tool depends on workspace, tenant, account, environment, or profile, make that dependency visible in input or configuration.
- Do not log secrets. Redact tokens, cookies, authorization headers, connection strings, and personal data from diagnostics.

For MCP apps or interactive MCP views:

- Keep the MCP server contract independent from the UI implementation.
- Register UI resources intentionally and document the lifecycle between tool calls, view state, and host messages.
- Treat UI actions that call mutating tools as explicit commands with confirmation where data loss or external side effects are possible.

Add tests or validation fixtures for MCP tool schemas, representative success responses, error responses, and permission failures.

## Scripts, Schemas, And Validation

Prefer deterministic validation scripts for anything an agent is expected to create or edit repeatedly.

- Use Node ESM scripts in this repository unless the package already uses another runtime.
- Keep script entrypoints small and place shared logic in `lib/`.
- Validate structured artifacts with schemas and targeted lint rules.
- Print warnings to stderr with `WARN:` and errors with `ERROR:` when following existing plugin script conventions.
- Exit with non-zero status when validation errors should block use.
- Include tests for schema utilities, generators, converters, and validators.

Before declaring work complete, run the narrowest relevant validation:

- `npm test` from the plugin directory when code or scripts changed.
- Package-specific validation scripts when schemas, templates, generated artifacts, or plans changed.
- Targeted generator or scaffold commands when template output is part of the change.

If validation cannot be run, state why and list the residual risk.

## Safety And Quality Gates

Agent tooling must fail closed when scope or safety is unclear.

Stop and ask or report a blocker when:

- The request is too broad, vague, conflicting, or likely to cause workflow drift.
- Required auth, environment, or destructive-action policy is missing.
- The workflow would touch production data without explicit approval.
- A required agent, skill, MCP tool, schema, or script is unavailable.
- A generated plan, scenario, or config fails validation.
- Evidence is insufficient to support a finding or report.

Avoid these anti-patterns:

- One giant skill that tries to cover unrelated workflows.
- User-facing agents that bypass private agents, validators, or safety gates.
- Prose-only contracts for structured artifacts.
- Hard-coded credentials, URLs, tenant IDs, or local absolute paths in reusable assets.
- Generated tests that rely on sleeps, pixel coordinates, hidden implementation details, or brittle selectors when accessible selectors are available.
- Silent fallbacks that change runner, environment, scope, auth strategy, or mutation behavior.

## Documentation Expectations

Every plugin or major tooling pack should document:

- What the pack provides.
- Recommended lifecycle.
- Install and usage steps.
- Example user requests.
- Safety defaults.
- Package structure.
- Agent architecture and delegation model.
- Validation commands.
- Known limitations or required host capabilities.

Every new or changed skill, agent, MCP tool, schema, or script should have enough documentation for another maintainer to understand when it is invoked, what inputs it needs, what files it may change, and how to validate it.

## Implementation Workflow

A change is non-trivial if it modifies code, schemas, scripts, agent definitions, skill definitions, or any generated artifact. Documentation-only edits that do not change behavior are trivial.

1. Define the expected behavior and out-of-scope behavior.
2. Identify risks, dependencies, safety gates, and validation needs.
3. Sketch the artifact/data flow before editing.
4. Add or update schemas, tests, fixtures, or validation commands before changing generators or workflow logic when practical.
5. Implement the smallest focused change.
6. Run relevant validation.
7. Review for over-broad instructions, missing stop conditions, hidden side effects, and stale documentation.

For trivial documentation-only edits, keep the change focused and explain why broader validation was unnecessary.
