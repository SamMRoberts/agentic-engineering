# Changelog

## 0.2.0

- Change generated host instruction files into compact routing stubs.
- Add per-agent reference file generation under host-specific `references/` folders.
- Enforce a 100-line limit for generated stubs and reference files.

## 0.1.0

- Add the initial `agent-compat` plugin.
- Add CLI commands to scan, validate, generate, and install Codex/Claude instruction overlays from Copilot `*.agent.md` files.
- Add deterministic validation for duplicate names, missing private-agent references, invalid frontmatter, unsupported host-specific fields, and credential-shaped literals.
