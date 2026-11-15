#!/usr/bin/env node
/**
 * Favicon, home-screen icon and the link-preview images shown when the URL is
 * shared on WhatsApp / iMessage / Facebook.
 *
 *   npm run icons
 *
 * Writes to public/ (copied as-is into the site by Vite):
 *   favicon.svg, favicon-32.png, apple-touch-icon.png, og/wedding.jpg, og/homecoming.jpg
 * Photos come from assets/photos/ (reduced copies of the engagement shoot).
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { root, THEMES, fonts, text, petals, andMark, placeAnd } from './lib/brand.mjs';
import { EVENTS } from '../src/events.js';

const pub = path.join(root, 'public');
await mkdir(path.join(pub, 'og'), { recursive: true });

/* ---------- Monogram icon ---------- */

function monogram(size, { rounded }) {
  const t = THEMES.wedding;
  const a = text(fonts.display, 'A', { x: size * 0.33, y: size * 0.7, size: size * 0.56, anchor: 'middle' });
  const p = text(fonts.display, 'P', { x: size * 0.67, y: size * 0.7, size: size * 0.56, anchor: 'middle' });
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">` +
    `<rect width="${size}" height="${size}" rx="${rounded ? size * 0.22 : 0}" fill="${t.muted}"/>` +
    `<path d="${a.d}${p.d}" fill="${t.surface}"/></svg>`
  );
}

await writeFile(path.join(pub, 'favicon.svg'), monogram(64, { rounded: true }));
await sharp(Buffer.from(monogram(64, { rounded: true }))).resize(32, 32).png().toFile(path.join(pub, 'favicon-32.png'));
// iOS rounds the corners itself.
await sharp(Buffer.from(monogram(180, { rounded: false }))).png().toFile(path.join(pub, 'apple-touch-icon.png'));

/* ---------- Link previews (1200 × 630) ---------- */

const W = 1200;
const H = 630;
const PHOTO_W = 470;
const mark = await andMark();

async function preview(key) {
  const ev = EVENTS[key];
  const t = THEMES[key];
  const x = PHOTO_W + 72;
  const [first, second] = ev.names;

  const eyebrow = text(fonts.sansMedium, ev.eyebrow, { x, y: 196, size: 17, tracking: 0.24, upper: true });
  const name1 = text(fonts.display, first, { x, y: 290, size: 72, tracking: 0.045, upper: true });
  const name2 = text(fonts.display, second, { x, y: 438, size: 72, tracking: 0.045, upper: true });
  const date = text(fonts.sansMedium, ev.dateLabel, { x, y: 504, size: 17, tracking: 0.22, upper: true });
  const venue = text(fonts.display, ev.venue, { x, y: 544, size: 27, tracking: 0.1, upper: true });

  const art = (await petals(key)).replace('<svg ', `<svg x="${W - 330}" y="-24" width="400" height="${(400 * 800) / 600}" `);

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    `<rect width="${W}" height="${H}" fill="${t.bg}"/>` +
    art +
    `<path d="${eyebrow.d}${date.d}" fill="${t.muted}"/>` +
    `<path d="${name1.d}${name2.d}${venue.d}" fill="${t.ink}"/>` +
    placeAnd(mark, { x: x + 54, y: 306, height: 58, fill: t.muted }) +
    `</svg>`;

  const photo = await sharp(path.join(root, 'assets/photos', `${key}.jpg`))
    .resize(PHOTO_W, H, { fit: 'cover', position: 'centre' })
    .toBuffer();

  await sharp(Buffer.from(svg))
    .composite([{ input: photo, left: 0, top: 0 }])
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(path.join(pub, 'og', `${key}.jpg`));
}

for (const key of Object.keys(EVENTS)) await preview(key);
console.log('wrote favicon.svg, favicon-32.png, apple-touch-icon.png, og/wedding.jpg, og/homecoming.jpg');
