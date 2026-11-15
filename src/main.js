import './styles/main.css';
import { buildIndex, normalize, search } from './search.js';
import { EVENTS } from './events.js';

/* ---------- Setup ---------- */

const html = document.documentElement;
const eventKey = html.dataset.event;
const otherKey = eventKey === 'wedding' ? 'homecoming' : 'wedding';
const STORAGE_KEY = `seat-with-us:${eventKey}`;

// Guest lists load in the background as soon as the page runs; by the time
// someone has typed two letters they are ready.
const loaders = {
  wedding: () => import('./data/wedding.json'),
  homecoming: () => import('./data/homecoming.json'),
};
const indexes = {};
const loadIndex = (key) => (indexes[key] ??= loaders[key]().then((m) => buildIndex(m.default)));
const ready = loadIndex(eventKey);

const $ = (selector) => document.querySelector(selector);
const el = {
  input: $('#guest-name'),
  form: $('.finder__form'),
  clear: $('.field__clear'),
  help: $('#finder-help'),
  list: $('#matches'),
  notice: $('#notice'),
  finder: $('.finder'),
  result: $('#result'),
  name: $('#result-name'),
  hint: $('.escort__hint'),
  seat: $('.escort__seat'),
  table: $('.escort__table'),
  party: $('.escort__party'),
  pending: $('.escort__pending'),
  again: $('.again'),
  status: $('#status'),
};

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const smallScreen = matchMedia('(max-width: 719px)');

const state = { results: [], active: -1, noticeTimer: 0, announceTimer: 0 };

/* ---------- Helpers ---------- */

const WORDS = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const partyLabel = (n) => (n > 1 ? `Party of ${WORDS[n] ?? n}` : '');

function announce(message, delay = 0) {
  clearTimeout(state.announceTimer);
  state.announceTimer = setTimeout(() => {
    el.status.textContent = message;
  }, delay);
}

/** Smoothly morph between layouts where the browser supports it. */
function transition(update) {
  if (!document.startViewTransition || reducedMotion.matches) return update();
  document.startViewTransition(update);
}

function setCompact(on) {
  if (html.classList.contains('is-compact') === on) return;
  transition(() => html.classList.toggle('is-compact', on));
}

const storage = {
  read() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch {
      return null;
    }
  },
  write(guest) {
    try {
      const { id, name, hint, table, party } = guest;
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ id, name, hint, table, party }));
    } catch {
      /* private mode: remembering is a nicety, not a requirement */
    }
  },
  clear() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  },
};

/** Underline the part of each word the guest has typed ("Kas|un Perera"). */
function highlighted(name, query) {
  const typed = normalize(query).split(' ').filter(Boolean);
  const frag = document.createDocumentFragment();
  for (const part of name.split(/(\s+)/)) {
    const word = normalize(part);
    const hit = typed.find((t) => t.length > 1 && word.startsWith(t));
    if (hit && part.toLowerCase().startsWith(hit)) {
      const mark = document.createElement('mark');
      mark.textContent = part.slice(0, hit.length);
      frag.append(mark, part.slice(hit.length));
    } else {
      frag.append(part);
    }
  }
  return frag;
}

/* ---------- Suggestions ---------- */

function renderMatches(results, query = '') {
  state.results = results;
  state.active = -1;
  el.input.removeAttribute('aria-activedescendant');

  el.list.replaceChildren(
    ...results.map(({ guest }, i) => {
      const li = document.createElement('li');
      li.className = 'match';
      li.id = `match-${i}`;
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', 'false');

      const name = document.createElement('span');
      name.className = 'match__name';
      name.append(highlighted(guest.name, query));
      li.append(name);

      const details = [guest.hint, guest.group, partyLabel(guest.party).toLowerCase()].filter(Boolean);
      if (details.length) {
        const meta = document.createElement('span');
        meta.className = 'match__meta';
        meta.textContent = details.join(' · ');
        li.append(meta);
      }

      // Keep focus (and the keyboard) in the input while tapping a suggestion.
      li.addEventListener('pointerdown', (e) => e.preventDefault());
      li.addEventListener('click', () => choose(guest));
      return li;
    }),
  );

  const open = results.length > 0;
  el.list.hidden = !open;
  el.input.setAttribute('aria-expanded', String(open));
  el.help.hidden = open || !el.notice.hidden;
}

function setActive(index) {
  const items = el.list.children;
  if (!items.length) return;
  state.active = (index + items.length) % items.length;
  [...items].forEach((item, i) => item.setAttribute('aria-selected', String(i === state.active)));
  const item = items[state.active];
  el.input.setAttribute('aria-activedescendant', item.id);
  item.scrollIntoView({ block: 'nearest' });
}

function hideNotice() {
  clearTimeout(state.noticeTimer);
  el.notice.hidden = true;
  el.notice.replaceChildren();
}

async function showNotFound(query) {
  const typed = query.trim();
  const title = document.createElement('p');
  title.className = 'notice__title';
  title.textContent = `No match for “${typed}”.`;
  const advice = document.createElement('p');
  advice.textContent =
    'Try just your first name, or the name on your invitation. Our ushers at the entrance have the full list.';
  el.notice.replaceChildren(title, advice);
  el.notice.hidden = false;
  el.help.hidden = true;
  announce(`No match for ${typed}. Try just your first name, or ask an usher at the entrance.`);

  // Scanned the other event's QR code? Look there too, and offer the way across.
  const other = await loadIndex(otherKey);
  if (el.input.value !== query || el.notice.hidden) return;
  const [best] = search(other, query, { limit: 1 });
  if (!best || best.score < 0.8) return;
  const ev = EVENTS[otherKey];
  const line = document.createElement('p');
  line.className = 'notice__other';
  const link = document.createElement('a');
  link.href = `../${otherKey}/?name=${encodeURIComponent(typed)}`;
  link.textContent = `See the ${ev.label.toLowerCase()} list`;
  line.append(`${best.guest.name} is on the ${ev.label.toLowerCase()} list (${ev.dateLabel}). `, link);
  el.notice.append(line);
}

async function update() {
  const query = el.input.value;
  el.clear.hidden = !query;
  hideNotice();

  if (normalize(query).replace(/ /g, '').length < 2) {
    renderMatches([]);
    el.help.hidden = false;
    return;
  }
  const index = await ready;
  if (query !== el.input.value) return; // a newer keystroke has taken over

  const results = search(index, query);
  renderMatches(results, query);

  if (results.length) {
    announce(`${results.length} ${results.length === 1 ? 'match' : 'matches'}. Use the arrow keys to choose.`, 600);
  } else if (normalize(query).length >= 3) {
    // Only call it "not found" once they pause: never interrupt someone mid-name.
    state.noticeTimer = setTimeout(() => showNotFound(query), 700);
  }
}

function submit() {
  const { results, active } = state;
  if (active >= 0) return choose(results[active].guest);
  if (results.length === 1) return choose(results[0].guest);
  if (results.length > 1) {
    // A clear winner (e.g. the full name typed exactly) needs no extra tap.
    if (results[0].score - results[1].score >= 0.25) return choose(results[0].guest);
    return setActive(0);
  }
  if (normalize(el.input.value).length >= 2) {
    clearTimeout(state.noticeTimer);
    showNotFound(el.input.value);
  }
}

/* ---------- Result ---------- */

function fillCard(guest) {
  el.name.textContent = guest.name;
  el.hint.textContent = guest.hint ?? '';
  el.hint.hidden = !guest.hint;

  const seated = Boolean(guest.table);
  el.seat.hidden = !seated;
  el.pending.hidden = seated;
  el.table.textContent = guest.table ?? '';
  const party = partyLabel(guest.party);
  el.party.textContent = party;
  el.party.hidden = !party;
}

function showResult(guest, { animate, remembered = false }) {
  fillCard(guest);
  el.again.textContent = remembered ? 'Not you? Search another name' : 'Search another name';

  const reveal = () => {
    html.classList.add('is-compact', 'is-result');
    el.finder.hidden = true;
    el.result.hidden = false;
    el.result.classList.remove('is-revealing');
    if (animate) {
      void el.result.offsetWidth; // restart the animation
      el.result.classList.add('is-revealing');
    }
    // Focus only once the card is actually shown (a view transition applies this later).
    window.scrollTo({ top: 0 });
    el.name.focus({ preventScroll: true });
  };
  if (animate) transition(reveal);
  else reveal();

  announce(
    guest.table
      ? `${guest.name}, table ${guest.table}.`
      : `${guest.name}. Your seat is being arranged. An usher at the entrance will walk you to it.`,
  );
}

function choose(guest) {
  storage.write(guest);
  el.input.blur(); // put the keyboard away; the card is the point now
  showResult(guest, { animate: true });
}

/**
 * Back to the search. Done synchronously inside the tap, not in a view
 * transition: phones only open the keyboard for focus() inside a user gesture.
 */
function searchAgain({ focus = true } = {}) {
  storage.clear();
  html.classList.remove('is-result');
  if (!smallScreen.matches || !focus) html.classList.remove('is-compact');
  el.result.hidden = true;
  el.result.classList.remove('is-revealing');
  el.finder.hidden = false;
  el.input.value = '';
  renderMatches([]);
  hideNotice();
  el.clear.hidden = true;
  el.help.hidden = false;
  if (focus) el.input.focus();
}

/* ---------- Events ---------- */

el.input.addEventListener('input', update);

el.input.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown' && state.results.length) {
    e.preventDefault();
    setActive(state.active + 1);
  } else if (e.key === 'ArrowUp' && state.results.length) {
    e.preventDefault();
    setActive(state.active - 1);
  } else if (e.key === 'Escape') {
    if (!el.list.hidden) renderMatches([]);
    else if (el.input.value) {
      el.input.value = '';
      update();
    }
  }
});

el.form.addEventListener('submit', (e) => {
  e.preventDefault();
  submit();
});

el.clear.addEventListener('click', () => {
  el.input.value = '';
  update();
  el.input.focus();
});

// On a phone the keyboard covers half the screen: tuck the names away while typing.
el.input.addEventListener('focus', () => {
  if (smallScreen.matches) setCompact(true);
});
el.input.addEventListener('blur', () => {
  setTimeout(() => {
    const idle = document.activeElement !== el.input && !el.input.value && !html.classList.contains('is-result');
    if (idle) setCompact(false);
  }, 150);
});

el.again.addEventListener('click', () => searchAgain());

// Fade the keepsake photo in once it has actually arrived (it loads lazily).
const keepsake = $('.keepsake__img');
const keepsakeLoaded = () => keepsake.classList.add('is-loaded');
if (keepsake.complete && keepsake.naturalWidth) keepsakeLoaded();
else keepsake.addEventListener('load', keepsakeLoaded, { once: true });

/* ---------- Start ---------- */

const remembered = storage.read();
if (remembered?.id) {
  showResult(remembered, { animate: false, remembered: true });
  // Re-check against the current list: the seating plan may have changed since.
  ready.then((index) => {
    const fresh = index.find((entry) => entry.guest.id === remembered.id)?.guest;
    if (!fresh) return searchAgain({ focus: false }); // no longer on the list
    if (fresh.table !== remembered.table || fresh.name !== remembered.name) {
      storage.write(fresh);
      fillCard(fresh);
    }
  });
} else {
  const prefill = new URLSearchParams(location.search).get('name');
  if (prefill) {
    el.input.value = prefill;
    update();
  } else if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    // Desktop has no on-screen keyboard to get in the way, so start ready to type.
    el.input.focus({ preventScroll: true });
  }
}
html.classList.add('is-ready');

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
  });
}
