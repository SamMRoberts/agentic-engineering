---
description: 'Use when reviewing a web UX YAML test plan for quality, safety, coverage, schema validity, and Playwright execution readiness.'
agent: web-ux-testing-agent
argument-hint: 'Plan path or YAML content, target runner, environment, and any known constraints.'
---

Use [review-web-ux-test-plan](../skills/review-web-ux-test-plan/SKILL.md).

Review this web UX testing YAML plan. Default to `web-ux-test/plan.yaml` if no plan path is provided and it exists.

Evaluate it for:

- execution suitability
- frontend testing best practices
- auth/session handling
- conditional branches
- accessibility coverage
- network and console validation
- destructive action safety
- scenario clarity
- selector stability
- conversion potential to Playwright CLI tests

Return:

1. Summary judgment
2. Critical problems
3. Recommended improvements
4. Missing scenarios
5. Suggested Playwright CLI regression candidates
6. Revised YAML patches only when requested or when the change is small enough to be clearer than prose

Run `npm run validate:plan -- web-ux-test/plan.yaml` when a plan file is available. If validation cannot run, explain why.
