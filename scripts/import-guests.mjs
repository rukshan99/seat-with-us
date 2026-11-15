#!/usr/bin/env node
/**
 * Convert the guest-list spreadsheet into the JSON files the site reads.
 *
 *   npm run import-guests -- "/path/to/Wedding_Guest_List.xlsx"
 *
 * Expected layout (one sheet per event, sheet names WEDDING / HOMECOMING):
 *   - A group heading row: text in column A, nothing in B/C   e.g. "Relations"
 *   - A header row: "No." | "Name / Relation" | "Quantity" | … | "Table No."
 *   - Guest rows: number in column A, party name in column B, quantity in C,
 *     table number in whichever column the header row labels "Table No."
 *   - Subtotal rows are ignored.
 *
 * Only the name, bracketed hint, party size and table are written. The group
 * heading is used only to keep ids stable; it is not published.
 * Rows with quantity 0 (declined) are skipped.
 */
import readXlsxFile from 'read-excel-file/node';
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const SHEETS = { WEDDING: 'wedding', HOMECOMING: 'homecoming' };

const clean = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();
const isNumberLike = (v) => v !== null && v !== '' && !Number.isNaN(Number(v));

/** "A / B / C" → "A, B & C"; strips "(notes)" into a separate hint. */
export function splitName(raw) {
  const text = clean(raw);
  const hints = [...text.matchAll(/\(([^)]*)\)/g)].map((m) => clean(m[1])).filter(Boolean);
  const base = clean(text.replace(/\([^)]*\)/g, ' '));
  const parts = base.split(/\s*(?:\/|&)\s*/).map(clean).filter(Boolean);
  const name =
    parts.length <= 1 ? parts[0] ?? '' : `${parts.slice(0, -1).join(', ')} & ${parts.at(-1)}`;
  return { name, hint: hints.join(', ') || undefined };
}

/** Small, stable, URL-safe id so a remembered lookup survives list updates. */
function stableId(...parts) {
  let h = 0x811c9dc5;
  for (const ch of parts.join('|').toLowerCase()) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

export function parseSheet(rows, eventKey) {
  const guests = [];
  let group = null;
  let tableCol = -1;
  const seen = new Map();

  for (const row of rows) {
    const cells = row.map((c) => (c === null ? '' : c));
    const [a, b, c] = cells;
    const aText = clean(a);

    if (/^no\.?$/i.test(aText)) {
      tableCol = cells.findIndex((cell) => /table/i.test(clean(cell)));
      continue;
    }
    if (aText && !isNumberLike(a) && !clean(b) && !clean(c)) {
      if (!/total/i.test(aText)) group = aText;
      continue;
    }
    if (!isNumberLike(a) || !clean(b)) continue;

    const party = isNumberLike(c) ? Number(c) : null;
    if (party === 0) continue;

    const { name, hint } = splitName(b);
    if (!name) continue;
    const tableRaw = tableCol >= 0 ? clean(cells[tableCol]) : '';

    let id = stableId(eventKey, group, b);
    const n = (seen.get(id) ?? 0) + 1;
    seen.set(id, n);
    if (n > 1) id = `${id}-${n}`;

    guests.push({
      id,
      name,
      ...(hint && { hint }),
      ...(party && { party }),
      table: tableRaw || null,
    });
  }
  return guests;
}

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: npm run import-guests -- "/path/to/guest-list.xlsx"');
    process.exit(1);
  }
  const sheets = await readXlsxFile(file);
  const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data');
  await mkdir(outDir, { recursive: true });

  for (const { sheet, data } of sheets) {
    const eventKey = SHEETS[clean(sheet).toUpperCase()];
    if (!eventKey) {
      console.warn(`Skipping sheet "${sheet}" (not one of ${Object.keys(SHEETS).join(', ')})`);
      continue;
    }
    const guests = parseSheet(data, eventKey);
    const seated = guests.filter((g) => g.table).length;
    const json = '[\n' + guests.map((g) => '  ' + JSON.stringify(g)).join(',\n') + '\n]\n';
    await writeFile(path.join(outDir, `${eventKey}.json`), json);
    console.log(
      `${eventKey.padEnd(11)} ${String(guests.length).padStart(4)} parties, ` +
        `${guests.reduce((s, g) => s + (g.party ?? 1), 0)} guests, ${seated} with a table`,
    );
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
