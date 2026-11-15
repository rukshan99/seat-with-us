import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import jsQR from 'jsqr';
import { fileURLToPath } from 'node:url';
import { SITE_URL } from '../src/events.js';

/** Decode a generated QR image, the way a phone camera would. */
async function decode(file) {
  const { data, info } = await sharp(fileURLToPath(new URL(`../public/qr/${file}`, import.meta.url)))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return jsQR(new Uint8ClampedArray(data), info.width, info.height)?.data;
}

for (const [file, url] of [
  ['wedding.png', `${SITE_URL}wedding/`],
  ['homecoming.png', `${SITE_URL}homecoming/`],
  ['site.png', SITE_URL],
  ['print/wedding-sign.png', `${SITE_URL}wedding/`],
  ['print/homecoming-sign.png', `${SITE_URL}homecoming/`],
]) {
  test(`${file} scans to ${url}`, async () => {
    assert.equal(await decode(file), url, 'QR is stale: run `npm run qr`');
  });
}
