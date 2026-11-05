// Fixture: test/fixtures/holiday-shipping-dates-2026-11-06.html is https://www.usps.com/holiday/holiday-shipping-dates.htm
// downloaded 2026-11-06. Expected dates are read off that page: lower 48 Ground Advantage and First-Class Mail Dec 17,
// Priority Mail Dec 18, Priority Mail Express Dec 19; international Dec 9 / Dec 9 / Dec 16; military Ground Advantage Nov 4.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import {
  parseUspsPage, pageText, loadTable, getHolidayShippingDeadlines, checkShipByDate, getMilitaryMailDeadline, resolveDestination,
  todayEastern, BUILTIN_2026, InputError, UpstreamError, UTM, USPS_PAGE,
} from '../dist/core.js';

const html = readFileSync(new URL('./fixtures/holiday-shipping-dates-2026-11-06.html', import.meta.url), 'utf8');
const f = async (url) => { assert.equal(url, USPS_PAGE); return html; };
const NOV6 = Date.UTC(2026, 10, 6, 15);

test('parse: 2026 lower 48 dates Dec 17, 17, 18, 19', () => {
  const t = parseUspsPage(html);
  assert.equal(t.year, 2026);
  assert.deepEqual(t.lower48, { ground_advantage: '2026-12-17', first_class_mail: '2026-12-17', priority_mail: '2026-12-18', priority_mail_express: '2026-12-19' });
});
test('parse: Alaska and Hawaii Ground Advantage has no single date (footnote), others Dec 17, 18, 19', () => {
  const t = parseUspsPage(html);
  assert.deepEqual(t.offshore, { ground_advantage: null, first_class_mail: '2026-12-17', priority_mail: '2026-12-18', priority_mail_express: '2026-12-19' });
  assert.match(t.offshore_ground_note, /10-day or more/);
});
test('parse: 9 international regions, all Dec 9, Dec 9, Dec 16', () => {
  const t = parseUspsPage(html);
  assert.equal(t.international.length, 9);
  for (const r of t.international) assert.deepEqual(r.dates, { first_class_package_international: '2026-12-09', priority_mail_international: '2026-12-09', priority_mail_express_international: '2026-12-16' });
});
test('parse: 5 military ZIP groups, the commented-out 340 row is ignored, 093 has no PMEMS', () => {
  const t = parseUspsPage(html);
  assert.deepEqual(t.military.map((m) => m.zips), ['090-092', '093', '094-099', '340', '962-966']);
  assert.equal(t.military[1].dates.priority_mail_express_military, null);
  assert.equal(t.military[3].dates.ground_advantage, '2026-11-04');
  assert.ok(!pageText(html).includes('Nov. 27'));
});
test('parse equals the built-in 2026 table', () => {
  assert.deepEqual(parseUspsPage(html), BUILTIN_2026);
});
test('parse: unrelated page is an upstream error; loadTable then falls back to the built-in table', async () => {
  assert.throws(() => parseUspsPage('<html><title>Access Denied</title></html>'), UpstreamError);
  const r = await loadTable(async () => { throw new Error('HTTP 403'); });
  assert.equal(r.source, 'builtin'); assert.match(r.live_check, /HTTP 403/);
});
test('today in US Eastern: 03:00 UTC on Nov 7 is still Nov 6', () => {
  assert.equal(todayEastern(Date.UTC(2026, 10, 7, 3)), '2026-11-06');
});
test('all deadlines on Nov 6: 41 days left for Ground Advantage', async () => {
  const r = await getHolidayShippingDeadlines(f, NOV6);
  assert.equal(r.lower_48[0].days_left, 41); assert.equal(r.lower_48[3].send_by, '2026-12-19'); assert.equal(r.lower_48[3].weekday, 'Saturday');
  assert.equal(r.data_source, 'USPS holiday shipping dates page, read at call time');
  assert.ok(r.more.includes(UTM));
});
test('check: Dec 18 to the lower 48, only Priority Mail and Express, Priority Mail is the last day', async () => {
  const r = await checkShipByDate(f, { ship_date: '2026-12-18' }, NOV6);
  assert.deepEqual(r.services.filter((s) => s.on_time).map((s) => s.service), ['priority_mail', 'priority_mail_express']);
  assert.equal(r.slowest_on_time_service, 'priority_mail'); assert.match(r.summary, /today is the last day/);
});
test('check: Dec 20 misses every date', async () => {
  const r = await checkShipByDate(f, { ship_date: '2026-12-20' }, NOV6);
  assert.equal(r.slowest_on_time_service, null); assert.match(r.summary, /after every USPS recommended send-by date/);
});
test('check: Germany on Dec 10 only Priority Mail Express International', async () => {
  const r = await checkShipByDate(f, { destination: 'Germany', ship_date: '2026-12-10' }, NOV6);
  assert.equal(r.slowest_on_time_service, 'priority_mail_express_international');
});
test('destinations: Hawaii offshore, APO 09021 military, Japan Asia, unknown and civil ZIP rejected', () => {
  const t = BUILTIN_2026;
  assert.equal(resolveDestination('Hawaii', t).kind, 'offshore');
  assert.deepEqual(resolveDestination('APO 09021', t), { kind: 'military', zip3: 90 });
  assert.equal(resolveDestination('Japan', t).region, 'Asia/Pacific Rim');
  assert.throws(() => resolveDestination('Atlantis', t), InputError);
  assert.throws(() => resolveDestination('10001', t), InputError);
});
test('military: 96601 is 962-966, Ground Advantage passed on Nov 4', async () => {
  const r = await getMilitaryMailDeadline(f, { zip: '96601' }, NOV6);
  assert.equal(r.zip_group, '962-966'); assert.equal(r.services[0].on_time, false); assert.equal(r.services[1].send_by, '2026-12-09');
  await assert.rejects(getMilitaryMailDeadline(f, { zip: '10001' }, NOV6), InputError);
});
test('stdio: initialize, tools/list and a tools/call over JSON-RPC', async () => {
  const child = spawn(process.execPath, [new URL('../dist/stdio.js', import.meta.url).pathname], { stdio: ['pipe', 'pipe', 'ignore'] });
  const lines = []; let buf = '';
  const got = (id) => new Promise((res) => { const iv = setInterval(() => { const m = lines.find((l) => l.id === id); if (m) { clearInterval(iv); res(m); } }, 10); });
  child.stdout.on('data', (d) => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { lines.push(JSON.parse(buf.slice(0, i))); buf = buf.slice(i + 1); } });
  const send = (m) => child.stdin.write(JSON.stringify({ jsonrpc: '2.0', ...m }) + '\n');
  send({ id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '1' } } });
  assert.equal((await got(1)).result.serverInfo.name, 'usps-holiday-shipping-deadlines-mcp');
  send({ method: 'notifications/initialized' });
  send({ id: 2, method: 'tools/list' });
  assert.deepEqual((await got(2)).result.tools.map((t) => t.name), ['get_usps_holiday_shipping_deadlines', 'check_holiday_ship_by_date', 'get_military_mail_deadline']);
  send({ id: 3, method: 'tools/call', params: { name: 'check_holiday_ship_by_date', arguments: { destination: 'nowhere-land' } } });
  const r3 = await got(3);
  assert.equal(r3.result.isError, true); assert.match(r3.result.content[0].text, /I do not know where/);
  child.kill();
});
