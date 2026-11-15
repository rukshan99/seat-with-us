#!/usr/bin/env node
/**
 * QR codes pointing at the live site, plus print-ready entrance signs.
 *
 *   npm run qr                       # uses SITE_URL from src/events.js
 *   npm run qr -- https://example.com/seat-with-us/   # any other address
 *
 * Writes to public/qr/:
 *   wedding.svg / .png, homecoming.svg / .png, site.svg / .png   (screen + digital use)
 *   print/<event>-qr.png       3000 px, for a designer to drop into the invitation
 *   print/<event>-sign.svg     A6 table/entrance sign, vector (best for a print shop)
 *   print/<event>-sign.png     the same sign at 300 dpi
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import QRCode from 'qrcode';
import sharp from 'sharp';
import { root, THEMES, fonts, text, petals, andMark, placeAnd } from './lib/brand.mjs';
import { EVENTS, SITE_URL } from '../src/events.js';

const base = (process.argv[2] ?? SITE_URL).replace(/\/?$/, '/');
const outDir = path.join(root, 'public', 'qr');
const printDir = path.join(outDir, 'print');
await mkdir(printDir, { recursive: true });

/** QR modules as one path (each dark run on a row becomes a rectangle). */
function qrPath(url, { x = 0, y = 0, size }) {
  // Level Q survives ~25% damage: smudges, glare on glossy card, a thumb over a corner.
  const qr = QRCode.create(url, { errorCorrectionLevel: 'Q' });
  const n = qr.modules.size;
  const m = size / n;
  let d = '';
  for (let r = 0; r < n; r++) {
    let c = 0;
    while (c < n) {
      if (!qr.modules.get(r, c)) {
        c++;
        continue;
      }
      const start = c;
      while (c < n && qr.modules.get(r, c)) c++;
      d += `M${(x + start * m).toFixed(2)} ${(y + r * m).toFixed(2)}h${((c - start) * m).toFixed(2)}v${m.toFixed(2)}h${(-(c - start) * m).toFixed(2)}z`;
    }
  }
  return { d, modules: n };
}

/** A standalone QR with a 4-module quiet zone (the scanner needs that margin). */
function qrSvg(url, { dark, light, px = 1000 }) {
  const { modules } = qrPath(url, { size: 1 });
  const total = modules + 8;
  const { d } = qrPath(url, { x: 4, y: 4, size: modules });
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="${px}" height="${px}" shape-rendering="crispEdges">` +
    `<rect width="${total}" height="${total}" fill="${light}"/><path d="${d}" fill="${dark}"/></svg>`
  );
}

async function writeQr(name, url, theme) {
  const svg = qrSvg(url, { dark: theme.qrDark, light: theme.qrLight });
  await writeFile(path.join(outDir, `${name}.svg`), svg);
  await sharp(Buffer.from(svg)).png({ palette: true }).toFile(path.join(outDir, `${name}.png`));
}

/* ---------- A6 sign: 105 × 148 mm, drawn in tenths of a millimetre ---------- */

const mark = await andMark();

async function sign(key, url) {
  const ev = EVENTS[key];
  const t = THEMES[key];
  const W = 1050;
  const H = 1480;
  const x = 90;
  const [first, second] = ev.names;

  const eyebrow = text(fonts.sansMedium, ev.eyebrow, { x, y: 500, size: 25, tracking: 0.24, upper: true });
  const name1 = text(fonts.display, first, { x, y: 620, size: 96, tracking: 0.045, upper: true });
  const name2 = text(fonts.display, second, { x, y: 812, size: 96, tracking: 0.045, upper: true });
  const date = text(fonts.sansMedium, ev.dateLabel, { x, y: 900, size: 25, tracking: 0.22, upper: true });
  const venue = text(fonts.display, ev.venue, { x, y: 952, size: 36, tracking: 0.1, upper: true });

  const qrX = x;
  const qrY = 1036;
  const panel = 300;
  const pad = 26;
  const code = qrPath(url, { x: qrX + pad, y: qrY + pad, size: panel - pad * 2 });

  const tx = qrX + panel + 50;
  const label = text(fonts.sansMedium, 'Find your table', { x: tx, y: qrY + 70, size: 24, tracking: 0.24, upper: true });
  const line1 = text(fonts.sans, 'Scan with your phone', { x: tx, y: qrY + 140, size: 34 });
  const line2 = text(fonts.sans, 'camera, then type', { x: tx, y: qrY + 186, size: 34 });
  const line3 = text(fonts.sans, 'your name.', { x: tx, y: qrY + 232, size: 34 });
  const link = text(fonts.sans, url.replace(/^https?:\/\//, '').replace(/\/$/, ''), { x, y: H - 64, size: 22, tracking: 0.02 });

  const art = (await petals(key)).replace('<svg ', `<svg x="${W - 560}" y="-40" width="680" height="${(680 * 800) / 600}" `);

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="105mm" height="148mm" viewBox="0 0 ${W} ${H}">` +
    `<rect width="${W}" height="${H}" fill="${t.bg}"/>` +
    art +
    `<path d="${eyebrow.d}${date.d}${label.d}" fill="${t.muted}"/>` +
    `<path d="${link.d}" fill="${t.muted}"/>` +
    `<path d="${name1.d}${name2.d}${venue.d}${line1.d}${line2.d}${line3.d}" fill="${t.ink}"/>` +
    placeAnd(mark, { x: x + 72, y: 642, height: 76, fill: t.muted }) +
    `<rect x="${qrX}" y="${qrY}" width="${panel}" height="${panel}" rx="16" fill="${t.qrLight}"/>` +
    `<path d="${code.d}" fill="${t.qrDark}" shape-rendering="crispEdges"/>` +
    `</svg>`
  );
}

for (const key of Object.keys(EVENTS)) {
  const url = `${base}${key}/`;
  const theme = THEMES[key];
  await writeQr(key, url, theme);

  const big = qrSvg(url, { dark: theme.qrDark, light: theme.qrLight, px: 3000 });
  await sharp(Buffer.from(big)).png({ palette: true }).toFile(path.join(printDir, `${key}-qr.png`));

  const svg = await sign(key, url);
  await writeFile(path.join(printDir, `${key}-sign.svg`), svg);
  // 105 × 148 mm at 300 dpi = 1240 × 1748 px
  await sharp(Buffer.from(svg), { density: 300 }).resize(1240, 1748).png().toFile(path.join(printDir, `${key}-sign.png`));
  console.log(`${key.padEnd(11)} → ${url}`);
}
await writeQr('site', base, THEMES.wedding);
console.log(`site        → ${base}`);
