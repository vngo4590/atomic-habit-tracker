# Project-local Copilot CLI config

## Playwright MCP

`mcp-config.json` registers the [Playwright MCP](https://github.com/microsoft/playwright-mcp)
server so an agent can drive a real browser for exploratory checks.

This is **separate** from the project's Playwright E2E suite under `e2e/`
(run via `npm run test:e2e`). The MCP server is for ad-hoc agent browser
automation, not for the test suite.

### Use it for this session only

From the repo root:

```powershell
copilot --additional-mcp-config "@.copilot/mcp-config.json"
```

Verify inside the CLI:

```
/mcp
```

You should see a `playwright` server with tools like `browser_navigate`,
`browser_click`, `browser_type`, `browser_snapshot`, etc.

### First-run notes

- `npx -y @playwright/mcp@latest` downloads the package on first launch.
- If browsers are missing, run `npx playwright install chromium` once.
- `--isolated` gives each session a fresh browser profile (no leaked
  cookies/state between runs). Drop it if you want a persistent profile.

### Common flag tweaks

Edit `args` in `mcp-config.json`:

- `--headless` — no visible window
- `--browser firefox|webkit` — non-Chromium engines
- `--viewport-size=1280,720`
- `--save-trace` — write Playwright traces for debugging
