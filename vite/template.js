/**
 * Server-side (build-time) HTML for each page. Everything a guest sees before
 * typing is real HTML, so it paints instantly; JavaScript only adds the search.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { EVENTS, SITE_URL, SWITCH_TO_HOMECOMING_ON } from '../src/events.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const art = (name) => readFileSync(path.join(root, 'src/art', name), 'utf8').trim();

const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** The script "and", reused between names and on the back of the escort card. */
const andMark = (cls) => art('and.svg').replace('class="and-mark"', `class="and-mark ${cls}"`);

const closeIcon =
  '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">' +
  '<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';

export function head(ev, base) {
  const url = `${SITE_URL}${ev.key}/`;
  const image = `${SITE_URL}og/${ev.key}.jpg`;
  const dark = ev.key === 'homecoming';
  return `
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <title>${esc(ev.title)}</title>
    <meta name="description" content="${esc(ev.description)}">
    <link rel="canonical" href="${url}">
    <meta name="theme-color" content="${ev.themeColor}">
    <meta name="color-scheme" content="${dark ? 'dark' : 'light'}">
    <link rel="icon" href="${base}favicon.svg" type="image/svg+xml">
    <link rel="icon" href="${base}favicon-32.png" sizes="32x32" type="image/png">
    <link rel="apple-touch-icon" href="${base}apple-touch-icon.png">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Ashinsana &amp; Pasindu">
    <meta property="og:title" content="${esc(`${ev.names.join(' & ')} · ${ev.label}`)}">
    <meta property="og:description" content="${esc(`Find your table. ${ev.dateLabel} · ${ev.venue}`)}">
    <meta property="og:url" content="${url}">
    <meta property="og:image" content="${image}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:alt" content="${esc(`${ev.names.join(' and ')} on the beach at dusk`)}">
    <meta name="twitter:card" content="summary_large_image">
    <script>(function(h){try{localStorage.getItem('seat-with-us:${ev.key}')&&h.classList.add('is-remembered')}catch(e){}setTimeout(function(){h.classList.add('is-ready')},2500)})(document.documentElement)</script>`;
}

export function body(ev, base) {
  const [first, second] = ev.names;
  const other = EVENTS[ev.key === 'wedding' ? 'homecoming' : 'wedding'];
  const otherDay = other.dateLabel.split(', ')[1];

  return `
  <div class="frame">
    <main class="card">
      <div class="petals" aria-hidden="true">${art('petals.svg')}</div>

      <header class="hero">
        <p class="eyebrow">${esc(ev.eyebrow)}</p>
        <h1 class="names">
          <span class="names__one">${esc(first)}</span>
          <span class="names__and">${andMark('names__and-mark')}</span>
          <span class="names__two">${esc(second)}</span>
        </h1>
        <p class="meta"><span class="meta__date">${esc(ev.dateLabel)}</span><span class="meta__venue">${esc(ev.venue)}</span></p>
      </header>

      <section class="finder" aria-label="Find your table">
        <form class="finder__form" role="search" novalidate>
          <label class="label finder__label" for="guest-name">Find your table</label>
          <div class="field">
            <input id="guest-name" class="field__input" type="text" name="name" placeholder="Your name"
              role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="matches"
              aria-describedby="finder-help" autocomplete="off" autocapitalize="words" autocorrect="off"
              spellcheck="false" enterkeyhint="search">
            <button class="field__clear" type="button" aria-label="Clear name" hidden>${closeIcon}</button>
          </div>
          <p class="help" id="finder-help">First name or surname is enough.</p>
          <ul class="matches" id="matches" role="listbox" aria-label="Guests matching your name" hidden></ul>
          <div class="notice" id="notice" hidden></div>
        </form>
      </section>

      <section class="result" id="result" aria-labelledby="result-name" hidden>
        <div class="escort">
          <div class="escort__top">
            <p class="label">Welcome</p>
            <h2 class="escort__name" id="result-name" tabindex="-1"></h2>
            <p class="escort__hint" hidden></p>
          </div>
          <div class="escort__flap">
            <div class="escort__face escort__face--front">
              <div class="escort__seat">
                <p class="label">Table</p>
                <p class="escort__table"></p>
                <p class="escort__party" hidden></p>
              </div>
              <div class="escort__pending" hidden>
                <p class="escort__pending-title">Your seat is being arranged</p>
                <p class="escort__pending-text">An usher at the entrance will walk you to it.</p>
              </div>
            </div>
            <div class="escort__face escort__face--back" aria-hidden="true">
              <span class="monogram">${esc(first[0])}${andMark('monogram__and')}${esc(second[0])}</span>
            </div>
          </div>
        </div>
        <p class="result__meta">${esc(ev.venue)} · ${esc(ev.time)}</p>
        <button class="again" type="button">Search another name</button>
      </section>

      <nav class="other" aria-label="Other event">
        <a class="other__link" href="${base}${other.key}/">Here for the ${other.label.toLowerCase()} on ${esc(otherDay)}?<span class="other__arrow" aria-hidden="true">→</span></a>
      </nav>

      <p class="sr-only" id="status" role="status" aria-live="polite"></p>
    </main>
  </div>
  <noscript><p class="noscript">This page needs JavaScript to look up your table. Our ushers at the entrance will help you find your seat.</p></noscript>`;
}

/** The bare URL: choose the event by today's date in Sri Lanka, then hand over. */
export function rootHead(base) {
  return `
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Find your table · Ashinsana &amp; Pasindu</title>
    <meta name="description" content="Find your table at Ashinsana &amp; Pasindu’s wedding and homecoming.">
    <link rel="canonical" href="${SITE_URL}">
    <meta name="theme-color" content="#EEE7DA">
    <link rel="icon" href="${base}favicon.svg" type="image/svg+xml">
    <link rel="apple-touch-icon" href="${base}apple-touch-icon.png">
    <meta property="og:title" content="Ashinsana &amp; Pasindu · Find your table">
    <meta property="og:description" content="Wedding · 10 December · Homecoming · 13 December">
    <meta property="og:url" content="${SITE_URL}">
    <meta property="og:image" content="${SITE_URL}og/wedding.jpg">
    <meta name="twitter:card" content="summary_large_image">
    <script>(function(){var d;try{d=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Colombo'}).format(new Date())}catch(e){d=new Date().toISOString().slice(0,10)}location.replace((d>='${SWITCH_TO_HOMECOMING_ON}'?'homecoming':'wedding')+'/'+location.search)})()</script>
    <style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#EEE7DA;color:#1F1E17;font:18px/1.6 system-ui,sans-serif}a{color:#55542F;margin:0 .5em}</style>`;
}

export function rootBody(base) {
  return `<p><a href="${base}wedding/">Wedding · 10 Dec</a><a href="${base}homecoming/">Homecoming · 13 Dec</a></p>`;
}
