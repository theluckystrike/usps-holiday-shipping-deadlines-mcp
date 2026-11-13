# usps-holiday-shipping-deadlines-mcp

USPS holiday shipping deadlines for AI assistants. Ask "is it too late to ship for Christmas?" and get the USPS recommended send-by date for each mail class, the days left from today, and which service still makes December 25.

This is a Model Context Protocol (MCP) server. It reads the USPS holiday shipping dates page at call time. It needs no API key. If usps.com cannot be read, it answers from a built-in copy of the 2026 table and says so in `data_source` and `live_check`.

## Tools

| Tool | What it returns |
| --- | --- |
| `get_usps_holiday_shipping_deadlines` | Every 2026 USPS send-by date for delivery before December 25: lower 48, Alaska, Hawaii, Puerto Rico and territories, nine international regions and APO/FPO/DPO ZIP groups, with days left from today (US Eastern). |
| `check_holiday_ship_by_date` | For a ship date (default today) and a destination ("lower48", a state or territory, a country, a USPS region or an APO ZIP), each service with its send-by date, days left and whether it is still on time, plus the slowest service still on time. |
| `get_military_mail_deadline` | Send-by dates for one APO/FPO/DPO ZIP code (090-099, 340, 962-966). |

Every result has structured JSON, a one-paragraph summary, `as_of`, `source` and `more` (a page on [mcpstamp.com](https://www.mcpstamp.com/servers/?utm_source=mcp&utm_medium=usps-holiday-shipping-deadlines-mcp)).

## What it knows that your model does not

- This year's dates. USPS publishes new send-by dates every fall, so a model's remembered dates are last year's.
- Today's date in US Eastern time, so "how many days do I have" is exact.
- The fine print. Ground Advantage to Alaska and Hawaii has no single date (USPS gives a 10-day or more service expectation), and Priority Mail Express Military is not offered to APO ZIP 093.

## Install

### Hosted (Claude.ai custom connector, ChatGPT developer mode)

Paste this URL. No token, no sign-up. It works now.

```
https://usps-holiday-shipping-deadlines-mcp.lipmichal.workers.dev/mcp
```

### Claude Code

```
claude mcp add --transport http usps-holiday-deadlines https://usps-holiday-shipping-deadlines-mcp.lipmichal.workers.dev/mcp
```

### Claude Desktop

Claude Desktop adds remote servers under Settings, Connectors, Add custom connector. Paste the URL above.

### Cursor

Add to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "usps-holiday-deadlines": { "url": "https://usps-holiday-shipping-deadlines-mcp.lipmichal.workers.dev/mcp" }
  }
}
```

### VS Code

Add to `.vscode/mcp.json`:

```json
{
  "servers": {
    "usps-holiday-deadlines": { "type": "http", "url": "https://usps-holiday-shipping-deadlines-mcp.lipmichal.workers.dev/mcp" }
  }
}
```

### Local stdio (after npm release)

The npm package is not published yet. After it is, run it locally with Node 20 or newer:

```
claude mcp add usps-holiday-deadlines -- npx -y usps-holiday-shipping-deadlines-mcp
```

## Example prompts

- "Is it too late to ship a package for Christmas?"
- "What is the last day to mail Christmas cards with USPS this year?"
- "I'm mailing a gift to Germany on December 10. Which USPS service still gets there by Christmas?"
- "When do I need to ship to APO 09021 for Christmas?"
- "What are the USPS holiday shipping deadlines for Hawaii?"

## Data sources

Full list with fetch dates in [DATA_SOURCES.md](DATA_SOURCES.md).

- [USPS 2026 Holiday Shipping Deadlines](https://www.usps.com/holiday/holiday-shipping-dates.htm), read at call time.
- [USPS service commitments](https://postcalc.usps.com/ServiceCommitments) for ZIP-to-ZIP estimates (linked, not read).

## Limitations

- USPS dates are recommendations for expected delivery, not guarantees.
- USPS only. UPS and FedEx publish their own holiday dates; their pages block automated reads, so they are not included.
- Country to region mapping covers about 120 common countries. Others can be given as a USPS region name ("Europe", "Middle East").
- The hosted server caches the USPS page for up to 6 hours.

## More

More MCP servers that answer questions your assistant cannot answer alone are on [mcpstamp.com](https://www.mcpstamp.com/servers/?utm_source=mcp&utm_medium=usps-holiday-shipping-deadlines-mcp).

Part of the Zovo MCP collection: https://mcp.zovo.one

Built by [theluckystrike](https://github.com/theluckystrike).

## Development

```
npm install
npm test                              # builds, then runs the fixture tests and an offline stdio test
node scripts/stdio-transcript.mjs     # live stdio round trip, writes .live/stdio-transcript.jsonl
```

## License

MIT

## More from zovo

- [All free zovo VS Code extensions](https://marketplace.visualstudio.com/publishers/zovo) — file viewers, database clients, formatters. Offline, no telemetry, no sign-up.
- [Full MCP server catalogue](https://theluckystrike.github.io/mcp/) — local-first MCP servers for back-office work: invoices, VAT, PDFs, spreadsheets, payroll.
- [Hosted no-install MCP endpoints](https://mcp.zovo.one) — paste a URL in Claude / Cursor, nothing to install.
