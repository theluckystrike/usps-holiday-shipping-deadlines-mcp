export const REPO = 'usps-holiday-shipping-deadlines-mcp';
export const SITE = 'https://www.mcpstamp.com';
export const UTM = `utm_source=mcp&utm_medium=${REPO}`;
export const USPS_PAGE = 'https://www.usps.com/holiday/holiday-shipping-dates.htm';
export const more = () => `${SITE}/servers/?${UTM}`;
export class InputError extends Error {
}
export class UpstreamError extends Error {
}
export const LABEL = {
    ground_advantage: 'USPS Ground Advantage',
    first_class_mail: 'First-Class Mail',
    priority_mail: 'Priority Mail',
    priority_mail_express: 'Priority Mail Express',
    first_class_package_international: 'First-Class Package International Service',
    priority_mail_international: 'Priority Mail International',
    priority_mail_express_international: 'Priority Mail Express International',
    priority_mail_express_military: 'Priority Mail Express Military Service (PMEMS)',
};
const OFFSHORE_GA_NOTE = 'USPS gives no single send-by date for Ground Advantage to or from Alaska, Hawaii, Puerto Rico and US territories. Packages between the contiguous US and those places have a 10-day or more service expectation, so check the estimated delivery date for the ZIP code at https://postcalc.usps.com/ServiceCommitments.';
/** Built-in copy of the USPS 2026 table, read from USPS_PAGE on 2026-11-06. Used only when the live page fails. */
export const BUILTIN_2026 = {
    year: 2026,
    lower48: { ground_advantage: '2026-12-17', first_class_mail: '2026-12-17', priority_mail: '2026-12-18', priority_mail_express: '2026-12-19' },
    offshore: { ground_advantage: null, first_class_mail: '2026-12-17', priority_mail: '2026-12-18', priority_mail_express: '2026-12-19' },
    offshore_ground_note: OFFSHORE_GA_NOTE,
    international: ['Africa', 'Asia/Pacific Rim', 'Australia/New Zealand', 'Canada', 'Caribbean', 'Central & South America', 'Europe', 'Mexico', 'Middle East'].map((region) => ({
        region, dates: { first_class_package_international: '2026-12-09', priority_mail_international: '2026-12-09', priority_mail_express_international: '2026-12-16' },
    })),
    military: [
        { zips: '090-092', from: 90, to: 92, dates: { ground_advantage: '2026-11-04', first_class_mail: '2026-12-09', priority_mail: '2026-12-09', priority_mail_express_military: '2026-12-16' } },
        { zips: '093', from: 93, to: 93, dates: { ground_advantage: '2026-11-04', first_class_mail: '2026-12-09', priority_mail: '2026-12-09', priority_mail_express_military: null } },
        { zips: '094-099', from: 94, to: 99, dates: { ground_advantage: '2026-11-04', first_class_mail: '2026-12-09', priority_mail: '2026-12-09', priority_mail_express_military: '2026-12-16' } },
        { zips: '340', from: 340, to: 340, dates: { ground_advantage: '2026-11-04', first_class_mail: '2026-12-09', priority_mail: '2026-12-09', priority_mail_express_military: '2026-12-16' } },
        { zips: '962-966', from: 962, to: 966, dates: { ground_advantage: '2026-11-04', first_class_mail: '2026-12-09', priority_mail: '2026-12-09', priority_mail_express_military: '2026-12-16' } },
    ],
};
const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const DATE_RE = /(?:(?:Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day,\s*)?(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2})\b|N\/A|See below/g;
/** HTML to flat text: drop scripts, styles and comments (the page keeps an old APO row inside a comment). */
export function pageText(html) {
    return html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<!--[\s\S]*?-->/g, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&reg;|®/g, ' ').replace(/&trade;|™/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&#39;|&rsquo;|’/g, "'")
        .replace(/\s+/g, ' ');
}
function dates(seg, year) {
    const out = [];
    for (const m of seg.matchAll(DATE_RE)) {
        if (!m[1]) {
            out.push(null);
            continue;
        }
        const mo = MONTHS[m[1].slice(0, 3).toLowerCase()];
        out.push(`${year}-${String(mo).padStart(2, '0')}-${m[2].padStart(2, '0')}`);
    }
    return out;
}
/** Text from the first `a` up to the next `b` (exclusive), or null when either is missing. */
const between = (t, a, b) => {
    const i = t.indexOf(a);
    if (i < 0)
        return null;
    const rest = t.slice(i + a.length);
    const j = typeof b === 'string' ? rest.indexOf(b) : rest.search(b);
    return j >= 0 ? a + rest.slice(0, j) : null;
};
/** Parse the USPS holiday shipping dates page. Throws UpstreamError when the layout is not recognised. */
export function parseUspsPage(html) {
    const t = pageText(html);
    const ym = /(\d{4}) Holiday Shipping (?:Deadlines|Dates)/.exec(t);
    if (!ym)
        throw new UpstreamError('the USPS page did not name a holiday shipping year');
    const year = Number(ym[1]);
    const l48 = between(t, 'Holiday Shipping Dates for Contiguous U.S.', 'Holiday Shipping Dates for Alaska');
    const off = between(t, 'Holiday Shipping Dates for Alaska', /\b1 Actual delivery date/);
    const intl = between(t, 'Holiday Shipping Dates for International Mail', 'Holiday Shipping Dates for Military Mail');
    const mil = between(t, 'Holiday Shipping Dates for Military Mail', /PMEMS is available|Helpful Links/);
    if (!l48 || !off || !intl || !mil)
        throw new UpstreamError('the USPS page layout changed (a table heading is missing)');
    const svc = (seg, name) => {
        const i = seg.indexOf(name);
        if (i < 0)
            return null;
        const d = dates(seg.slice(i + name.length, i + name.length + 40), year);
        return d.length ? d[0] : null;
    };
    const lower48 = {
        ground_advantage: svc(l48, 'Ground Advantage Service'),
        first_class_mail: svc(l48, 'First-Class Mail Service'),
        priority_mail: svc(l48, 'Priority Mail Service'),
        priority_mail_express: svc(l48, 'Priority Mail Express Service'),
    };
    if (Object.values(lower48).some((v) => !v))
        throw new UpstreamError('the USPS lower-48 table did not have four dates');
    // Offshore table: four service headings, then the cells in order. "See below" (a footnote) means no single date.
    const cells = dates(off.slice(off.indexOf('Priority Mail Express')), year);
    let offshore;
    let note = null;
    const real = cells.filter((c) => c !== null);
    if (/See below/.test(off) && real.length === 3) {
        offshore = { ground_advantage: null, first_class_mail: real[0], priority_mail: real[1], priority_mail_express: real[2] };
        note = OFFSHORE_GA_NOTE;
    }
    else if (real.length >= 4) {
        offshore = { ground_advantage: real[0], first_class_mail: real[1], priority_mail: real[2], priority_mail_express: real[3] };
    }
    else
        throw new UpstreamError('the USPS Alaska and Hawaii table was not recognised');
    const REGIONS = ['Africa', 'Asia/Pacific Rim', 'Australia/New Zealand', 'Canada', 'Caribbean', 'Central & South America', 'Europe', 'Mexico', 'Middle East'];
    const international = REGIONS.map((region) => {
        const i = intl.indexOf(` ${region} `);
        if (i < 0)
            throw new UpstreamError(`the USPS international table has no row for ${region}`);
        const d = dates(intl.slice(i + region.length + 1, i + region.length + 120), year).slice(0, 3);
        if (d.length < 3)
            throw new UpstreamError(`the USPS international row for ${region} has fewer than three dates`);
        return { region, dates: { first_class_package_international: d[0], priority_mail_international: d[1], priority_mail_express_international: d[2] } };
    });
    const military = [];
    for (const m of mil.matchAll(/APO\/FPO\/DPO\s+A[AEP]\s+ZIPs?\s+(\d{3})(?:\s*-\s*(\d{3}))?/g)) {
        const seg = mil.slice(m.index + m[0].length, m.index + m[0].length + 140);
        const d = dates(seg, year).slice(0, 4);
        if (d.length < 4)
            continue;
        military.push({ zips: m[2] ? `${m[1]}-${m[2]}` : m[1], from: Number(m[1]), to: Number(m[2] ?? m[1]), dates: { ground_advantage: d[0], first_class_mail: d[1], priority_mail: d[2], priority_mail_express_military: d[3] } });
    }
    if (!military.length)
        throw new UpstreamError('the USPS military table was not recognised');
    return { year, lower48, offshore, offshore_ground_note: note, international, military };
}
export async function loadTable(fetchText) {
    try {
        const html = await fetchText(USPS_PAGE, { cacheTtl: 21600, timeoutMs: 8000, accept: 'text/html,*/*' });
        const table = parseUspsPage(html);
        return { table, source: 'live', live_check: `read ${USPS_PAGE} at call time (${table.year} table)` };
    }
    catch (e) {
        return { table: BUILTIN_2026, source: 'builtin', live_check: `USPS page not usable (${e.message}); built-in 2026 table checked 2026-11-06 used` };
    }
}
// ---------------------------------------------------------------- dates
const day = (s) => Date.parse(`${s}T00:00:00Z`);
/** Today's date in US Eastern time as YYYY-MM-DD. */
export function todayEastern(nowMs = Date.now()) {
    const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(nowMs));
    return p;
}
export function parseDay(s) {
    const v = s.trim();
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
    if (!m || Number.isNaN(day(v)) || new Date(day(v)).toISOString().slice(0, 10) !== v)
        throw new InputError(`"${s}" is not a date. Use YYYY-MM-DD, for example 2026-12-15.`);
    return v;
}
const weekday = (d) => new Date(day(d)).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
const pretty = (d) => new Date(day(d)).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' });
const daysBetween = (a, b) => Math.round((day(b) - day(a)) / 86400000);
const list = (xs) => (xs.length <= 2 ? xs.join(' and ') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const left = (n) => (n === 0 ? 'today is the last day' : n === 1 ? '1 day left' : `${n} days left`);
function row(service, deadline, on) {
    if (!deadline)
        return { service, label: LABEL[service], send_by: null, weekday: null, days_left: null, on_time: null };
    const left = daysBetween(on, deadline);
    return { service, label: LABEL[service], send_by: deadline, weekday: weekday(deadline), days_left: left, on_time: left >= 0 };
}
// ---------------------------------------------------------------- destinations
const COUNTRY_REGION = {};
const add = (region, names) => names.split(',').forEach((n) => (COUNTRY_REGION[n.trim().toLowerCase()] = region));
add('Canada', 'canada');
add('Mexico', 'mexico');
add('Europe', 'united kingdom,uk,england,scotland,wales,northern ireland,ireland,france,germany,italy,spain,portugal,netherlands,belgium,switzerland,austria,poland,sweden,norway,denmark,finland,iceland,greece,czech republic,czechia,hungary,romania,ukraine,croatia,russia,luxembourg,slovakia,slovenia,bulgaria,serbia,estonia,latvia,lithuania,malta,cyprus');
add('Asia/Pacific Rim', 'japan,china,south korea,korea,taiwan,hong kong,singapore,philippines,vietnam,thailand,malaysia,indonesia,india,pakistan,bangladesh,sri lanka,nepal,cambodia,mongolia');
add('Australia/New Zealand', 'australia,new zealand');
add('Middle East', 'israel,united arab emirates,uae,saudi arabia,qatar,kuwait,bahrain,oman,jordan,lebanon,iraq,turkey,turkiye,egypt');
add('Africa', 'nigeria,south africa,kenya,ghana,ethiopia,morocco,tanzania,uganda,senegal,cameroon,zimbabwe,zambia,rwanda,algeria,tunisia');
add('Caribbean', 'jamaica,bahamas,dominican republic,haiti,trinidad and tobago,barbados,cuba,cayman islands,aruba,curacao,bermuda,antigua and barbuda,saint lucia,grenada');
add('Central & South America', 'brazil,argentina,chile,colombia,peru,ecuador,venezuela,bolivia,uruguay,paraguay,guatemala,honduras,el salvador,nicaragua,costa rica,panama,belize,guyana');
const OFFSHORE = new Set(['alaska', 'ak', 'hawaii', 'hi', 'puerto rico', 'pr', 'guam', 'gu', 'us virgin islands', 'virgin islands', 'vi', 'american samoa', 'as', 'northern mariana islands', 'mp']);
export function resolveDestination(dest, t) {
    const d = dest.trim().toLowerCase();
    if (!d)
        throw new InputError('destination is empty.');
    if (/^(lower ?48|contiguous( us| u\.s\.)?|domestic|us|usa|united states|mainland)$/.test(d))
        return { kind: 'lower48' };
    if (OFFSHORE.has(d))
        return { kind: 'offshore' };
    const z = /^(?:apo|fpo|dpo|military)?\s*(?:a[aep]\s*)?(\d{3})(?:\d{2})?$/.exec(d);
    if (z || /^(apo|fpo|dpo|military)/.test(d)) {
        if (!z)
            throw new InputError('For military mail give the APO/FPO/DPO ZIP code, for example "APO 09021" or "96601".');
        const n = Number(z[1]);
        if (!t.military.some((m) => n >= m.from && n <= m.to)) {
            throw new InputError(`ZIP ${z[1]}xx is not an APO/FPO/DPO ZIP code. For a US ZIP code in the lower 48 use "lower48"; for Alaska, Hawaii or a territory name it.`);
        }
        return { kind: 'military', zip3: n };
    }
    const region = t.international.find((r) => r.region.toLowerCase() === d)?.region ?? COUNTRY_REGION[d];
    if (region)
        return { kind: 'international', region };
    throw new InputError(`I do not know where "${dest}" is. Use "lower48", a state or territory such as "Alaska" or "Puerto Rico", an APO/FPO/DPO ZIP code, a country name, or one of the USPS regions: ${t.international.map((r) => r.region).join(', ')}.`);
}
// ---------------------------------------------------------------- tools
export async function getHolidayShippingDeadlines(fetchText, nowMs = Date.now()) {
    const { table: t, source, live_check } = await loadTable(fetchText);
    const today = todayEastern(nowMs);
    const l48 = Object.keys(t.lower48).map((k) => row(k, t.lower48[k], today));
    const off = Object.keys(t.offshore).map((k) => row(k, t.offshore[k], today));
    const intl = t.international.map((r) => ({ region: r.region, ...Object.fromEntries(Object.keys(r.dates).map((k) => [k, r.dates[k]])) }));
    const mil = t.military.map((m) => ({ apo_fpo_dpo_zips: m.zips, ...m.dates }));
    const next = l48.filter((r) => r.on_time).sort((a, b) => a.days_left - b.days_left)[0];
    return {
        summary: `USPS ${t.year} recommended send-by dates for delivery by December 25 in the lower 48 states: ` +
            l48.map((r) => `${r.label} ${pretty(r.send_by)}`).join(', ') + '. ' +
            `International mail is ${pretty(t.international[0].dates.first_class_package_international)} for First-Class Package International and Priority Mail International. ` +
            (next ? `Today (${today}, Eastern) ${next.days_left === 0 ? `is the last day for ${next.label}` : `there ${next.days_left === 1 ? 'is 1 day' : `are ${next.days_left} days`} left for ${next.label}`}.` : `Today (${today}, Eastern) every lower-48 send-by date has passed.`) +
            ' These are USPS recommendations, not guarantees.',
        year: t.year,
        today_eastern: today,
        lower_48: l48,
        alaska_hawaii_puerto_rico_territories: off,
        alaska_hawaii_ground_advantage_note: t.offshore_ground_note,
        international: intl,
        military_apo_fpo_dpo: mil,
        note: 'Send-by dates are for expected delivery before December 25. Actual delivery depends on origin, destination, Post Office acceptance time and other conditions. This server covers USPS only; UPS and FedEx publish their own holiday dates.',
        data_source: source === 'live' ? 'USPS holiday shipping dates page, read at call time' : 'built-in copy of the USPS 2026 table',
        live_check,
        as_of: new Date(nowMs).toISOString(),
        source: USPS_PAGE,
        more: more(),
    };
}
export async function checkShipByDate(fetchText, a, nowMs = Date.now()) {
    const { table: t, source, live_check } = await loadTable(fetchText);
    const on = a.ship_date ? parseDay(a.ship_date) : todayEastern(nowMs);
    const dest = resolveDestination(a.destination ?? 'lower48', t);
    let rows = [];
    let where = '';
    let extra = null;
    if (dest.kind === 'lower48') {
        where = 'the lower 48 states';
        rows = Object.keys(t.lower48).map((k) => row(k, t.lower48[k], on));
    }
    else if (dest.kind === 'offshore') {
        where = 'Alaska, Hawaii, Puerto Rico and US territories';
        rows = Object.keys(t.offshore).map((k) => row(k, t.offshore[k], on));
        extra = t.offshore_ground_note;
    }
    else if (dest.kind === 'international') {
        const r = t.international.find((x) => x.region === dest.region);
        where = `${a.destination} (USPS region ${r.region})`;
        rows = Object.keys(r.dates).map((k) => row(k, r.dates[k], on));
    }
    else {
        const m = t.military.find((x) => dest.zip3 >= x.from && dest.zip3 <= x.to);
        where = `APO/FPO/DPO ZIP ${m.zips}`;
        rows = Object.keys(m.dates).map((k) => row(k, m.dates[k], on));
        extra = m.dates.priority_mail_express_military ? null : 'Priority Mail Express Military Service is not offered to these ZIP codes.';
    }
    const ok = rows.filter((r) => r.on_time);
    const cheapest = ok[0] ?? null;
    const last = rows.filter((r) => r.send_by).sort((x, y) => (x.send_by < y.send_by ? 1 : -1))[0];
    const summary = cheapest
        ? `Shipping on ${pretty(on)} to ${where}, ${list(ok.map((r) => r.label))} ${ok.length === 1 ? 'is' : 'are'} still within the USPS recommended send-by date for December 25. ` +
            `The slowest service still on time is ${cheapest.label} (send by ${pretty(cheapest.send_by)}, ${left(cheapest.days_left)}).`
        : `Shipping on ${pretty(on)} to ${where} is after every USPS recommended send-by date for December 25. The last one was ${last ? `${last.label} on ${pretty(last.send_by)}` : 'not published'}. A package can still be sent, but USPS does not expect delivery by December 25.`;
    return {
        summary: `${summary} USPS ${t.year} recommendations, not guarantees.`,
        year: t.year,
        ship_date: on,
        destination: where,
        services: rows,
        slowest_on_time_service: cheapest?.service ?? null,
        note: extra,
        data_source: source === 'live' ? 'USPS holiday shipping dates page, read at call time' : 'built-in copy of the USPS 2026 table',
        live_check,
        as_of: new Date(nowMs).toISOString(),
        source: USPS_PAGE,
        more: more(),
    };
}
export async function getMilitaryMailDeadline(fetchText, a, nowMs = Date.now()) {
    const { table: t, source, live_check } = await loadTable(fetchText);
    const z = /^\s*(?:apo|fpo|dpo)?\s*(?:a[aep]\s*)?(\d{5}|\d{3})\s*$/i.exec(a.zip);
    if (!z)
        throw new InputError('zip must be an APO/FPO/DPO ZIP code, 5 digits like 09021 or the first 3 digits like 090.');
    const n = Number(z[1].slice(0, 3));
    const m = t.military.find((x) => n >= x.from && n <= x.to);
    if (!m)
        throw new InputError(`${z[1]} is not an APO/FPO/DPO ZIP code. Military ZIP codes start with 090-099 (AE), 340 (AA) or 962-966 (AP).`);
    const today = todayEastern(nowMs);
    const rows = Object.keys(m.dates).map((k) => row(k, m.dates[k], today));
    return {
        summary: `USPS ${t.year} send-by dates for December 25 delivery to APO/FPO/DPO ZIP ${m.zips}: ` +
            rows.map((r) => `${r.label} ${r.send_by ? pretty(r.send_by) : 'not offered'}`).join(', ') + '. ' +
            (rows.some((r) => r.on_time) ? `As of ${today} (Eastern) ${list(rows.filter((r) => r.on_time).map((r) => r.label))} still ${rows.filter((r) => r.on_time).length === 1 ? 'makes' : 'make'} it.` : `As of ${today} (Eastern) every date has passed.`),
        year: t.year,
        zip_group: m.zips,
        services: rows,
        note: 'PMEMS is available only at selected military and diplomatic Post Offices. Check with the local Post Office.',
        data_source: source === 'live' ? 'USPS holiday shipping dates page, read at call time' : 'built-in copy of the USPS 2026 table',
        live_check,
        as_of: new Date(nowMs).toISOString(),
        source: USPS_PAGE,
        more: more(),
    };
}
