/**
 * Shared brand pieces for generated images (icons, link previews, QR signs).
 * Text is converted to vector outlines with the site's own fonts, so images
 * render identically everywhere without installing fonts.
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import opentype from 'opentype.js';

export const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Mirrors the theme tokens in src/styles/main.css. */
export const THEMES = {
  wedding: {
    bg: '#EEE7DA',
    surface: '#F6F1E7',
    ink: '#1F1E17',
    muted: '#55542F',
    surround: '#6B6A46',
    qrDark: '#1F1E17',
    qrLight: '#F6F1E7',
    petal: {
      deep: '#5d5c38', mid: '#8c8966', light: '#d8d3bc', vein: '#f6f2e6',
      crease: '#46452b', rim: '#fbf8ef', shadow: '#3d3c25',
    },
  },
  homecoming: {
    bg: '#3A0709',
    surface: '#4E0C10',
    ink: '#F3E3DC',
    muted: '#D99789',
    surround: '#220304',
    qrDark: '#3A0709',
    qrLight: '#F3E3DC',
    petal: {
      deep: '#5e1015', mid: '#a8484a', light: '#eeb2a4', vein: '#ffe6dd',
      crease: '#33050a', rim: '#ffdcd2', shadow: '#0d0001',
    },
  },
};

/**
 * Serialise an opentype.js path ourselves: its own toPathData() occasionally
 * emits "NaN" when rounding, which makes renderers silently stop drawing.
 */
export function pathData(p, digits = 2) {
  const n = (v) => {
    const r = Number(v.toFixed(digits));
    return Object.is(r, -0) ? '0' : String(r);
  };
  let d = '';
  for (const c of p.commands) {
    if (c.type === 'M' || c.type === 'L') d += `${c.type}${n(c.x)} ${n(c.y)}`;
    else if (c.type === 'Q') d += `Q${n(c.x1)} ${n(c.y1)} ${n(c.x)} ${n(c.y)}`;
    else if (c.type === 'C') d += `C${n(c.x1)} ${n(c.y1)} ${n(c.x2)} ${n(c.y2)} ${n(c.x)} ${n(c.y)}`;
    else if (c.type === 'Z') d += 'Z';
  }
  return d;
}

async function loadFont(rel) {
  const buf = await readFile(path.join(root, 'node_modules/@fontsource', rel));
  return opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
}

export const fonts = {
  display: await loadFont('cormorant-garamond/files/cormorant-garamond-latin-500-normal.woff'),
  sans: await loadFont('jost/files/jost-latin-400-normal.woff'),
  sansMedium: await loadFont('jost/files/jost-latin-500-normal.woff'),
};

/**
 * Outline a line of text.
 * @returns {{ d: string, width: number }} path data positioned at (x, y baseline)
 */
export function text(font, str, { x = 0, y = 0, size = 16, tracking = 0, anchor = 'start', upper = false } = {}) {
  const s = upper ? str.toUpperCase() : str;
  const glyphs = font.stringToGlyphs(s);
  const scale = size / font.unitsPerEm;
  let width = 0;
  glyphs.forEach((g, i) => {
    width += g.advanceWidth * scale;
    if (i < glyphs.length - 1) width += tracking * size;
  });
  let cursor = anchor === 'middle' ? x - width / 2 : anchor === 'end' ? x - width : x;
  const parts = [];
  for (const g of glyphs) {
    parts.push(pathData(g.getPath(cursor, y, size)));
    cursor += g.advanceWidth * scale + tracking * size;
  }
  return { d: parts.join(''), width };
}

/** The petal artwork with theme colours written in (image renderers don't do CSS variables). */
export async function petals(themeKey) {
  const p = THEMES[themeKey].petal;
  const svg = await readFile(path.join(root, 'src/art/petals.svg'), 'utf8');
  return svg
    .replace(/class="p-deep"/g, `stop-color="${p.deep}"`)
    .replace(/class="p-mid"/g, `stop-color="${p.mid}"`)
    .replace(/class="p-light"/g, `stop-color="${p.light}"`)
    .replace(/class="p-crease"/g, `stop-color="${p.crease}"`)
    .replace(/class="p-rim"/g, `stop-color="${p.rim}"`)
    .replace(/class="p-vein"/g, `stroke="${p.vein}" stroke-opacity=".38"`)
    .replace(/class="p-vein-dark"/g, `stroke="${p.crease}" stroke-opacity=".22"`)
    .replace(/class="p-rim-line"/g, `stroke="${p.rim}" stroke-opacity=".85"`)
    .replace(/class="p-crease-line"/g, `stroke="${p.crease}" stroke-opacity=".25"`)
    .replace(/class="p-shadow"/g, `fill="${p.shadow}" opacity=".22"`)
    .replace(/ class="petals-art"| aria-hidden="true"| focusable="false"/g, '');
}

/** Inner contents and viewBox of src/art/and.svg, for placing inside another SVG. */
export async function andMark() {
  const svg = await readFile(path.join(root, 'src/art/and.svg'), 'utf8');
  const [, minX, minY, w, h] = svg.match(/viewBox="([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+)"/).map(Number);
  const d = svg.match(/ d="([^"]+)"/)[1];
  return { d, minX, minY, w, h };
}

/** Place the "and" mark with its top-left at (x, y), `height` tall. */
export function placeAnd(mark, { x, y, height, fill }) {
  const s = height / mark.h;
  return `<path d="${mark.d}" fill="${fill}" transform="translate(${x - mark.minX * s} ${y - mark.minY * s}) scale(${s})"/>`;
}
