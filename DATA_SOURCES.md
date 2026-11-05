# Data sources

All sources below were fetched on 2026-11-06 while building version 1.0.0.

| Data | URL | Notes |
|---|---|---|
| 2026 holiday send-by dates (lower 48, Alaska and Hawaii, international, military) | https://www.usps.com/holiday/holiday-shipping-dates.htm | Read at call time, cached 6 hours. Parsed after removing HTML comments (the page keeps an old APO row inside a comment). Lower 48: Ground Advantage and First-Class Mail Thursday Dec. 17, Priority Mail Friday Dec. 18, Priority Mail Express Saturday Dec. 19. International: Dec. 9, Dec. 9, Dec. 16 for every region. Military Ground Advantage Wednesday Nov. 4. A built-in copy of this table (checked 2026-11-06) answers if the page cannot be read. |
| Landing page (cross-check) | https://www.usps.com/holiday/ | "DEC 17 Last Day to Ship First Class Mail & USPS Ground Advantage, DEC 18 Priority Mail, DEC 19 Priority Mail Express". |

The test fixture in `test/fixtures/` is the holiday shipping dates page downloaded on 2026-11-06.
