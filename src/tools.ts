// Tool registry shared by the stdio and Worker entries.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { InputError, REPO, SITE, checkShipByDate, getHolidayShippingDeadlines, getMilitaryMailDeadline } from './core.js';
import type { FetchText } from './types.js';

export const VERSION = '1.0.0';

export const TOOL_INFO = [
  { name: 'get_usps_holiday_shipping_deadlines', blurb: 'All USPS recommended send-by dates for December 25 delivery this year: lower 48, Alaska and Hawaii, international regions and APO/FPO/DPO, with days left from today.' },
  { name: 'check_holiday_ship_by_date', blurb: 'Can I still ship for Christmas? For a ship date (default today) and a destination (lower 48, a state or territory, a country or an APO ZIP), which USPS services still make December 25.' },
  { name: 'get_military_mail_deadline', blurb: 'USPS holiday send-by dates for one APO/FPO/DPO ZIP code.' },
];

const RO = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true } as const;

function ok(data: Record<string, unknown> & { summary: string }) {
  return { content: [{ type: 'text' as const, text: `${data.summary}\n\n${JSON.stringify(data, null, 2)}` }], structuredContent: data };
}
function fail(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  return { isError: true, content: [{ type: 'text' as const, text: `${e instanceof InputError ? 'Error' : 'Upstream USPS error'}: ${msg}` }] };
}
const wrap = <A>(f: (a: A) => unknown) => async (a: A) => { try { return ok((await f(a)) as any); } catch (e) { return fail(e); } };

export function createServer(fetchText: FetchText): McpServer {
  const server = new McpServer({ name: REPO, version: VERSION, websiteUrl: SITE } as any, {
    instructions:
      'USPS holiday shipping deadlines (recommended send-by dates for delivery by December 25), read at call time from usps.com, with day counts from today in US Eastern time. ' +
      'Use check_holiday_ship_by_date for "is it too late to ship for Christmas" and name the service. These are USPS recommendations, not guarantees. UPS and FedEx are not covered.',
  });

  server.registerTool('get_usps_holiday_shipping_deadlines', {
    title: 'Get USPS holiday shipping deadlines',
    description:
      'The USPS recommended send-by dates for delivery before December 25 for the current holiday season, read at call time from usps.com: Ground Advantage, First-Class Mail, Priority Mail and Priority Mail Express ' +
      'to the lower 48 and to Alaska, Hawaii, Puerto Rico and territories; First-Class Package International, Priority Mail International and Priority Mail Express International by world region; and APO/FPO/DPO military mail by ZIP group. Includes days left from today.',
    inputSchema: {},
    annotations: { title: 'USPS holiday shipping deadlines', ...RO },
  }, wrap(() => getHolidayShippingDeadlines(fetchText)));

  server.registerTool('check_holiday_ship_by_date', {
    title: 'Check if a package still makes Christmas',
    description:
      'For a ship date (default today, US Eastern) and a destination, lists each USPS service with its send-by date, days left and whether it is still on time for December 25, and names the slowest (usually cheapest) service still on time. ' +
      'Destination can be "lower48", a state or territory ("Alaska", "Hawaii", "Puerto Rico", "Guam"), a country ("Canada", "Germany", "Japan"), a USPS region ("Europe") or an APO/FPO/DPO ZIP ("APO 09021").',
    inputSchema: {
      destination: z.string().max(60).optional().describe('Where the package goes. Default "lower48".'),
      ship_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Date you will drop it off, YYYY-MM-DD. Default today in US Eastern time.'),
    },
    annotations: { title: 'Can I still ship for Christmas', ...RO },
  }, wrap((a: any) => checkShipByDate(fetchText, a)));

  server.registerTool('get_military_mail_deadline', {
    title: 'Get military mail holiday deadline',
    description: 'USPS holiday send-by dates for December 25 delivery to one APO/FPO/DPO ZIP code (090-099 AE, 340 AA, 962-966 AP): Ground Advantage, First-Class Mail, Priority Mail and Priority Mail Express Military Service.',
    inputSchema: { zip: z.string().max(20).describe('APO/FPO/DPO ZIP code, for example "09021" or "96601".') },
    annotations: { title: 'Military mail deadline', ...RO },
  }, wrap((a: any) => getMilitaryMailDeadline(fetchText, a)));

  return server;
}
