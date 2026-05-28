# Regression Test Candidate Checklist

Mark a scenario or finding as a Playwright CLI regression candidate when:

- The behavior is important to a primary workflow.
- The failure is reproducible.
- The expected result is clear.
- Stable selectors exist or can be added.
- The setup can be automated safely.
- The test does not depend on production-only data.
- The scenario protects against a high-value user-facing regression.

Avoid converting scenarios that are purely exploratory, subjective, or heavily dependent on external services unless those services can be mocked or controlled.
