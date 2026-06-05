# Run Contract Checklist

Use this file when `web-ux-gremlin` needs to plan, generate, run, heal, or report a UX bug hunt.

## Required Fields

- `mode`: `standard` or `gremlin`.
- `intensity`: `1`-`5` for gremlin mode, `n/a` for standard.
- `browser`: `chrome_headless`, `chrome_headed`, `chromium`, `firefox`, `webkit`, `edge`, or an exact custom launcher.
- `tool`: `mcp`, `cli`, or an exact remote runner command.
- `headed_auth`: `yes` or `no`.
- `run_mode`: `single` or `full`.
- `tests`: `replace`, `append`, or `untouched`.
- `safe_fixtures`: `yes` or `no`.
- `high_chaos_approved`: `yes`, `no`, or `na`.
- `report`: `md`, `html`, or `both`.

## Single-Line Format

```text
Run contract: mode=<standard|gremlin>, intensity=<1-5|n/a>, browser=<chrome_headless|chrome_headed|chromium|firefox|webkit|edge|custom>, tool=<mcp|cli|custom>, headed_auth=<yes|no>, run_mode=<single|full>, tests=<replace|append|untouched>, safe_fixtures=<yes|no>, high_chaos_approved=<yes|no|na>, report=<md|html|both>
```

## Validation

- Ask for exact alternatives when browser or tool is `Other`.
- Ask whether headed execution requires manual authentication before tests begin.
- For gremlin intensity `4` or `5`, proceed only when `high_chaos_approved=yes`.
- Treat `safe_fixtures=no` as a block for mutating flows.
- Keep the exact run contract in every plan, generated handoff, execution note, healer handoff, and report.
