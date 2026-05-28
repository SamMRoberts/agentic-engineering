# Web UX Testing Anti-Patterns

## Vague checks

Avoid:

- Verify page works.
- Check UI.
- Make sure flow is good.

Prefer:

- Verify the dashboard heading is visible.
- Verify the save button is disabled during submit.
- Verify failed API requests show a user-facing error message.

## Pixel-coordinate interactions

Avoid:

- Click at x=420 y=300.
- Click the third button from the top.

Prefer:

- Click the button with accessible name "Save".
- Click `[data-testid="save-button"]`.

## Fixed sleeps

Avoid:

- Wait 5 seconds.

Prefer:

- Wait for the dashboard heading.
- Wait for the save request to complete.
- Wait for the loading indicator to disappear.

## Credentials in plans

Avoid storing:

- passwords
- tokens
- session cookies
- API keys

Prefer:

- saved browser session
- manual login pause
- test user via environment variables
- secret manager

## Missing state coverage

Do not only test happy paths.

Include:

- loading states
- empty states
- error states
- reload behavior
- expired session
- failed network calls
- duplicate submit
