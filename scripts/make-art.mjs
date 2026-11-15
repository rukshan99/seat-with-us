#!/usr/bin/env node
/**
 * Generates the site's original artwork as SVG:
 *   src/art/petals.svg   ruffled fan petals with pleats, veins and a curled lip (still images)
 *   src/art/petals.html  the same petals as separate layers, so each can sway on the page
 *   src/art/petal-loose.html  one small petal, drifting down when a table is found
 *   src/art/palms.svg    soft palm-frond shadows for the wedding page
 *   src/art/and.svg     the script "and" between the couple's names, as a path
 *
 *   npm run art
 *
 * Colours are not baked in: every fill/stroke references a CSS class whose
 * colour comes from the active theme (see .p-* rules in src/styles/main.css),
 * so one drawing serves the ivory/olive wedding and the oxblood/rose homecoming.
 * A seeded random generator keeps the output identical between runs.
 */
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import opentype from 'opentype.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'src', 'art');

/* ---------- helpers ---------- */

function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const f = (n) => (Math.round(n * 10) / 10).toString();
const pt = ([x, y]) => `${f(x)} ${f(y)}`;
/** Veins are random anyway; whole units are plenty and keep the file small. */
const ipt = ([x, y]) => `${Math.round(x)} ${Math.round(y)}`;
const rad = (deg) => (deg * Math.PI) / 180;
const polar = ([bx, by], angle, r) => [bx + Math.cos(angle) * r, by + Math.sin(angle) * r];

/** Smooth path through points (Catmull-Rom → cubic Bézier). */
function smooth(points, { move = true } = {}) {
  let d = move ? `M${pt(points[0])}` : `L${pt(points[0])}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${pt(c1)} ${pt(c2)} ${pt(p2)}`;
  }
  return d;
}

/* ---------- one petal ---------- */

let uid = 0;

/**
 * A fan-shaped petal radiating from `base`.
 *   dir      direction the petal opens towards (degrees, SVG coords: 0 = right, 90 = down)
 *   spread   half-angle of the fan
 *   R        length
 *   k, amp   number and depth of ruffles along the outer edge
 *   twist    how much the veins sweep sideways (gives a sense of the petal turning)
 *   curl     [from, to] range along the edge (-1…1) that folds back as a lighter lip
 *   tone     'back' petals sit deeper in shadow than 'front' ones
 */
function petal({ base, dir, spread, R, k, amp, twist = 0.08, curl, seed, tone = 'front', veins = 80, lean = 0, bend = 0, photo = false }) {
  const rnd = mulberry32(seed);
  const id = `p${++uid}`;
  const ph = rnd() * Math.PI * 2;
  const ph2 = rnd() * Math.PI * 2;
  const a0 = rad(dir);
  const sp = rad(spread);

  const ph3 = rnd() * Math.PI * 2;
  // Organic, not mechanical: ruffles vary in depth, one side of the fan is longer
  // (lean), and the whole petal curves slightly (bend).
  const radius = (u) => {
    const shoulder = Math.sqrt(Math.max(0, 1 - Math.abs(u) ** 3));
    const depth = amp * (1 + 0.55 * Math.sin(1.4 * u * Math.PI + ph3));
    const ruffle = 1 + depth * Math.sin(k * u * Math.PI + ph) + amp * 0.18 * Math.sin(2.3 * k * u * Math.PI + ph2);
    return R * (0.22 + 0.78 * shoulder) * ruffle * (1 + lean * u);
  };
  const angleAt = (u) => a0 + u * sp + bend * u * u;
  const edge = (u, scale = 1) => polar(base, angleAt(u), radius(u) * scale);

  const N = 64;
  const us = Array.from({ length: N + 1 }, (_, i) => -1 + (2 * i) / N);
  const outline = `M${pt(base)}${smooth(us.map((u) => edge(u)), { move: false })}Z`;

  const tip = polar(base, a0, R);
  const parts = [];
  const defs = [];

  defs.push(
    `<clipPath id="${id}c"><path d="${outline}"/></clipPath>`,
    `<linearGradient id="${id}g" gradientUnits="userSpaceOnUse" x1="${f(base[0])}" y1="${f(base[1])}" x2="${f(tip[0])}" y2="${f(tip[1])}">` +
      `<stop offset="0" class="p-deep"/><stop offset=".5" class="p-mid"/><stop offset="1" class="p-light"/></linearGradient>`,
    `<radialGradient id="${id}s" gradientUnits="userSpaceOnUse" cx="${f(base[0])}" cy="${f(base[1])}" r="${f(R * 1.05)}">` +
      `<stop offset=".1" class="p-crease" stop-opacity="0"/><stop offset=".55" class="p-crease" stop-opacity=".45"/>` +
      `<stop offset="1" class="p-crease" stop-opacity=".12"/></radialGradient>`,
    `<radialGradient id="${id}h" gradientUnits="userSpaceOnUse" cx="${f(base[0])}" cy="${f(base[1])}" r="${f(R * 1.05)}">` +
      `<stop offset=".25" class="p-rim" stop-opacity="0"/><stop offset=".8" class="p-rim" stop-opacity=".5"/>` +
      `<stop offset="1" class="p-rim" stop-opacity=".2"/></radialGradient>`,
  );

  // A petal can carry a photo, filled in per page by vite/template.js. It sits in an
  // isolated group with the petal's own colour so it can borrow that colour (the
  // blend never reaches the page behind), and under the pleats and veins so the
  // texture runs across it like a print on silk.
  const fill = `<path d="${outline}" fill="url(#${id}g)"/>`;
  parts.push(photo ? `<g class="petal-print">${fill}<!--petal-photo:${id}c--></g>` : fill);

  // Pleats: dark wedges in the ruffle valleys, light wedges on the ridges.
  const valleys = [];
  const ridges = [];
  const steps = 400;
  let prev = radius(-1);
  let prevSlope = 0;
  for (let i = 1; i <= steps; i++) {
    const u = -1 + (2 * i) / steps;
    const r = radius(u);
    const slope = r - prev;
    if (prevSlope < 0 && slope >= 0) valleys.push(u);
    if (prevSlope > 0 && slope <= 0) ridges.push(u);
    prev = r;
    prevSlope = slope;
  }
  const halfWidth = 1 / k / 2.2;
  const wedge = (u) =>
    `M${pt(base)}L${pt(edge(u - halfWidth, 1.15))}L${pt(edge(u, 1.2))}L${pt(edge(u + halfWidth, 1.15))}Z`;
  parts.push(`<g clip-path="url(#${id}c)">`);
  parts.push(`<path d="${valleys.map(wedge).join('')}" fill="url(#${id}s)" class="p-pleats"/>`);
  parts.push(`<path d="${ridges.map(wedge).join('')}" fill="url(#${id}h)" class="p-pleats"/>`);

  // Veins: fine lines from near the base to the edge, sweeping slightly.
  const light = [];
  const dark = [];
  for (let i = 0; i <= veins; i++) {
    const u = -1 + (2 * i) / veins + (rnd() - 0.5) * (1 / veins);
    const angle = angleAt(u);
    const r1 = radius(u) * 1.04;
    const start = polar(base, angle, R * (0.12 + rnd() * 0.12));
    const end = polar(base, angle, r1);
    const mid = polar(base, angle + twist * (0.6 + rnd() * 0.4), r1 * 0.55);
    const d = `M${ipt(start)}Q${ipt(mid)} ${ipt(end)}`;
    (i % 3 === 0 ? dark : light).push(d);
  }
  parts.push(`<path d="${light.join('')}" class="p-vein" fill="none" stroke-width=".7"/>`);
  parts.push(`<path d="${dark.join('')}" class="p-vein-dark" fill="none" stroke-width=".6"/>`);
  parts.push(`</g>`);

  // Rim light along the outer edge.
  parts.push(`<path d="${smooth(us.map((u) => edge(u)))}" class="p-rim-line" fill="none" stroke-width="1.3"/>`);

  // Curled lip: a band along part of the edge that has turned over, showing the paler underside.
  if (curl) {
    const [c0, c1] = curl;
    const M = 28;
    const cu = Array.from({ length: M + 1 }, (_, i) => c0 + ((c1 - c0) * i) / M);
    const width = (u) => R * 0.1 * Math.sin((Math.PI * (u - c0)) / (c1 - c0));
    const outer = cu.map((u) => edge(u));
    const inner = cu.map((u) => polar(base, angleAt(u) + 0.012, radius(u) - width(u)));
    const lip = `${smooth(outer)}${smooth([...inner].reverse(), { move: false }).slice(0)}Z`;
    defs.push(
      `<linearGradient id="${id}l" gradientUnits="userSpaceOnUse" x1="${f(base[0])}" y1="${f(base[1])}" x2="${f(tip[0])}" y2="${f(tip[1])}">` +
        `<stop offset=".6" class="p-mid"/><stop offset="1" class="p-rim"/></linearGradient>`,
    );
    const lipVeins = cu
      .filter((_, i) => i % 1 === 0)
      .map((u, i) => `M${pt(outer[i])}L${pt(inner[i])}`)
      .join('');
    parts.push(`<path d="${smooth(inner)}" class="p-crease-line" fill="none" stroke-width="5" stroke-linecap="round"/>`);
    parts.push(`<path d="${lip}" fill="url(#${id}l)"/>`);
    parts.push(`<path d="${lipVeins}" class="p-vein-dark" fill="none" stroke-width=".5"/>`);
    parts.push(`<path d="${smooth(inner)}" class="p-rim-line" fill="none" stroke-width="1"/>`);
  }

  return {
    defs: defs.join(''),
    body: `<g class="petal petal--${tone}${photo ? ' petal--print' : ''}">${parts.join('')}</g>`,
    shadow: `<path d="${outline}"/>`,
    base,
  };
}

/* ---------- composition ---------- */

const W = 600;
const H = 800;

const PETALS = [
  { base: [640, -70], dir: 166, spread: 27, R: 390, k: 4, amp: 0.035, seed: 11, tone: 'back', veins: 60, lean: 0.12, bend: 0.06 },
  { base: [660, 10], dir: 146, spread: 36, R: 500, k: 5, amp: 0.045, seed: 7, curl: [-0.4, 0.45], veins: 96, lean: -0.1, bend: 0.1, photo: true },
  { base: [690, 350], dir: 121, spread: 28, R: 400, k: 4, amp: 0.05, seed: 23, twist: -0.1, curl: [0.05, 0.8], veins: 76, lean: 0.15, bend: -0.08 },
];

const shadowFilter = (id) =>
  `<filter id="${id}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="16"/></filter>`;

/** One flat SVG, used for still images (link previews, print signs). */
function petalsStill() {
  const list = PETALS.map((spec) => petal({ ...spec, photo: false }));
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" class="petals-art" aria-hidden="true" focusable="false">` +
    `<defs>${shadowFilter('ps')}${list.map((p) => p.defs).join('')}</defs>` +
    `<g class="p-shadow" filter="url(#ps)" transform="translate(-10 18)">${list.map((p) => p.shadow).join('')}</g>` +
    list.map((p) => p.body).join('') +
    `</svg>\n`
  );
}

/**
 * For the page: each petal is its own layer so it can sway in the wind.
 * The browser paints each layer once and then only rotates the finished image
 * (on the GPU), instead of redrawing thousands of veins on every frame.
 * --origin is the petal's base, which it pivots around; overflow is visible so
 * the edges of the drawing area never show as a straight cut while it moves.
 */
function petalsLayered() {
  const layers = PETALS.map((spec, i) => {
    const p = petal(spec);
    const origin = `${f((p.base[0] / W) * 100)}% ${f((p.base[1] / H) * 100)}%`;
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" class="petal-layer" style="--origin: ${origin}" focusable="false">` +
      `<defs>${shadowFilter(`ps${i}`)}${p.defs}</defs>` +
      `<g class="p-shadow" filter="url(#ps${i})" transform="translate(-10 18)">${p.shadow}</g>` +
      p.body +
      `</svg>`
    );
  });
  return `<div class="petals-art">${layers.join('')}</div>\n`;
}

/* ---------- loose petal (drifts down when a guest finds their table) ---------- */

/**
 * One small petal from the same generator, drawn at full scale so every stroke
 * keeps its proportions when shown tiny. Defined once in a hidden <svg>; each
 * drifting petal is just <use href="#loose-petal">, so no ids are duplicated.
 */
function loosePetal() {
  const p = petal({ base: [240, 440], dir: -90, spread: 36, R: 380, k: 3, amp: 0.05, seed: 31, veins: 40, curl: [-0.3, 0.4], twist: 0.06 });
  return (
    `<svg class="loose-defs" width="0" height="0" aria-hidden="true" focusable="false">` +
    `<defs>${p.defs}<g id="loose-petal">${p.body}</g></defs></svg>\n`
  );
}
const LOOSE_VIEWBOX = '0 30 480 420'; // also used in vite/template.js

/* ---------- palm shadows (the wedding page's noon light) ---------- */

/**
 * The soft shadow of coconut-palm fronds, as if the card were lying on a table
 * at the resort around midday. Each frond is a curved rib with long, drooping
 * leaflets either side. Drawn once and blurred; the page only moves it.
 */
function palmShadows() {
  const rnd = mulberry32(5);
  const frond = ([x0, y0], [cx, cy], [x1, y1], { leaflets = 34, maxLen = 150, droop = 0.35 } = {}) => {
    const at = (t) => [
      (1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t * t * x1,
      (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t * t * y1,
    ];
    const tangent = (t) => Math.atan2(2 * (1 - t) * (cy - y0) + 2 * t * (y1 - cy), 2 * (1 - t) * (cx - x0) + 2 * t * (x1 - cx));
    let d = `M${pt([x0, y0])}Q${pt([cx, cy])} ${pt([x1, y1])}`;
    const rib = d;
    d = '';
    for (let i = 0; i < leaflets; i++) {
      const t = 0.06 + (0.92 * i) / leaflets;
      const [bx, by] = at(t);
      const a = tangent(t);
      const len = maxLen * Math.sin(Math.PI * Math.min(1, t * 1.08)) ** 0.6 * (0.85 + rnd() * 0.3);
      for (const side of [-1, 1]) {
        // Leaflets point forward along the rib and hang down a little.
        const ang = a + side * rad(52 + rnd() * 14) + droop * (side > 0 ? 0.25 : -0.25) + droop * 0.4;
        const tip = [bx + Math.cos(ang) * len, by + Math.sin(ang) * len + len * droop * 0.5];
        const mid = [(bx + tip[0]) / 2, (by + tip[1]) / 2];
        const nx = -Math.sin(ang) * (5 + len * 0.035);
        const ny = Math.cos(ang) * (5 + len * 0.035);
        d += `M${pt([bx, by])}Q${pt([mid[0] + nx, mid[1] + ny])} ${pt(tip)}Q${pt([mid[0] - nx * 0.6, mid[1] - ny * 0.6])} ${pt([bx, by])}Z`;
      }
    }
    return { leaves: d, rib };
  };
  const fronds = [
    frond([-90, -70], [140, 40], [360, 250], { maxLen: 160 }),
    frond([-110, 430], [80, 470], [300, 640], { maxLen: 130, droop: 0.45 }),
    frond([700, 560], [560, 640], [400, 880], { maxLen: 120, droop: 0.3 }),
  ];
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 900" preserveAspectRatio="xMidYMid slice" class="palms" aria-hidden="true" focusable="false">` +
    `<defs><filter id="palm-blur" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="7"/></filter></defs>` +
    `<g class="palms__shade" filter="url(#palm-blur)">` +
    fronds.map((f) => `<path d="${f.leaves}"/><path d="${f.rib}" fill="none" stroke-width="9" class="palms__rib"/>`).join('') +
    `</g></svg>\n`
  );
}

/* ---------- script "and" ---------- */

async function andMark(fontFile) {
  const buf = await readFile(fontFile);
  const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  const p = font.getPath('and', 0, 0, 100);
  const bb = p.getBoundingBox();
  const pad = 4;
  const w = bb.x2 - bb.x1 + pad * 2;
  const h = bb.y2 - bb.y1 + pad * 2;
  // Serialised by hand: opentype.js's toPathData() can emit "NaN" when rounding.
  const num = (v) => String(Number(v.toFixed(1)));
  const d = p.commands
    .map((c) =>
      c.type === 'Z'
        ? 'Z'
        : c.type === 'Q'
          ? `Q${num(c.x1)} ${num(c.y1)} ${num(c.x)} ${num(c.y)}`
          : c.type === 'C'
            ? `C${num(c.x1)} ${num(c.y1)} ${num(c.x2)} ${num(c.y2)} ${num(c.x)} ${num(c.y)}`
            : `${c.type}${num(c.x)} ${num(c.y)}`,
    )
    .join('');
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f(bb.x1 - pad)} ${f(bb.y1 - pad)} ${f(w)} ${f(h)}" ` +
    `class="and-mark" role="img" aria-label="and"><path d="${d}" fill="currentColor"/></svg>\n`
  );
}

await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, 'petals.svg'), petalsStill());
await writeFile(path.join(outDir, 'petals.html'), petalsLayered());
await writeFile(path.join(outDir, 'petal-loose.html'), loosePetal());
await writeFile(path.join(outDir, 'palms.svg'), palmShadows());
const scriptFont = process.env.AND_FONT ?? 'pinyon-script/files/pinyon-script-latin-400-normal.woff';
await writeFile(path.join(outDir, 'and.svg'), await andMark(path.join(root, 'node_modules/@fontsource', scriptFont)));
console.log('wrote src/art/: petals.svg, petals.html, petal-loose.html, palms.svg, and.svg');
