import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { EVENTS } from '../src/events.js';
import { head, body, rootHead, rootBody } from './template.js';

/** Fills <!--seat:head--> / <!--seat:body--> in each page shell from vite/template.js. */
export function pages() {
  let base = '/';
  return {
    name: 'seat:pages',
    configResolved(config) {
      base = config.base;
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const page = html.match(/data-page="(\w+)"/)?.[1];
        if (page === 'root') {
          return html.replace('<!--seat:head-->', rootHead(base)).replace('<!--seat:body-->', rootBody(base));
        }
        const ev = EVENTS[html.match(/data-event="(\w+)"/)?.[1]];
        if (!ev) return html;
        return html.replace('<!--seat:head-->', head(ev, base)).replace('<!--seat:body-->', body(ev, base));
      },
    },
  };
}

/**
 * Production-only polish for first paint on a weak connection:
 *  - inline the (small) stylesheet so the page needs no second round trip to render
 *  - preload the two fonts visible above the fold, so text settles sooner
 */
export function criticalAssets() {
  let base = '/';
  return {
    name: 'seat:critical-assets',
    apply: 'build',
    configResolved(config) {
      base = config.base;
    },
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (!ctx.bundle) return html;
        let out = html.replace(/<link rel="stylesheet"[^>]*href="([^"]+\.css)"[^>]*>/g, (tag, href) => {
          const file = href.slice(base.length);
          const asset = ctx.bundle[file];
          return asset ? `<style>${String(asset.source)}</style>` : tag;
        });
        const fonts = Object.keys(ctx.bundle).filter((f) =>
          /(cormorant-garamond-latin-500-normal|jost-latin-400-normal)[^/]*\.woff2$/.test(f),
        );
        if (out.includes('data-event=') && fonts.length) {
          const links = fonts
            .map((f) => `<link rel="preload" href="${base}${f}" as="font" type="font/woff2" crossorigin>`)
            .join('');
          out = out.replace('<meta name="viewport"', `${links}<meta name="viewport"`);
        }
        return out;
      },
    },
  };
}

async function walk(dir) {
  const out = [];
  for (const name of await readdir(dir)) {
    const full = path.join(dir, name);
    if ((await stat(full)).isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

/**
 * Writes dist/sw.js after the build with the list of files to keep offline.
 * Photos are left out of the up-front download (a phone only ever shows one
 * size and format); each is kept the first time it is viewed.
 * The cache version is a hash of every file, so any change ships a new worker.
 */
export function serviceWorker() {
  let outDir = 'dist';
  return {
    name: 'seat:service-worker',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    async closeBundle() {
      const files = (await walk(outDir))
        .map((f) => path.relative(outDir, f).split(path.sep).join('/'))
        .filter((f) => !/^(sw\.js|qr\/|og\/|print\/|robots\.txt|assets\/photo-|.*\.map$)/.test(f))
        .sort();
      const hash = createHash('sha256');
      for (const f of files) hash.update(f).update(await readFile(path.join(outDir, f)));
      const assets = files.map((f) => (f === 'index.html' ? './' : f.replace(/index\.html$/, '')));
      const template = await readFile(new URL('./sw-template.js', import.meta.url), 'utf8');
      const sw = template
        .replace('__VERSION__', hash.digest('hex').slice(0, 12))
        .replace('__ASSETS__', JSON.stringify(assets));
      await writeFile(path.join(outDir, 'sw.js'), sw);
    },
  };
}
