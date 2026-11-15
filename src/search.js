/**
 * Forgiving name search, tuned for Sri Lankan names written in English.
 *
 * Pipeline for every name and every query:
 *   normalize  → lower-case, strip accents and punctuation  ("Rukshán" → "rukshan")
 *   tokenize   → words                                       ("parakkarama", "achini")
 *   fold       → collapse spelling variants of the same sound
 *                ("Jayawardhana" and "Jayawardena" both → "jayavardana")
 *
 * Then each query word is matched against each name word by, in order of
 * confidence: exact → prefix (still typing) → small typo (edit distance).
 * Every query word must match something (AND), so adding words narrows results.
 */

/** Kinship words and titles: searchable, but never outrank a real name. */
const SOFT_WORDS = new Set(
  (
    'mr mrs miss ms dr sir madam master aunty auntie aunt uncle unlce akka ayya aiya aiyya ' +
    'malli nangi mama mami amma nande bappa punchi loku podi chuty chuti putha duwa ' +
    'wife husband family son daughter and'
  ).split(' '),
);
const SOFT_WEIGHT = 0.35;
const HINT_WEIGHT = 0.85;
const MIN_SCORE = 0.42;

export function normalize(text) {
  return String(text ?? '')
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/** Ordered rules: digraphs first, then vowels, then doubled letters. */
const FOLD_RULES = [
  [/th/g, 't'],
  [/dh/g, 'd'],
  [/bh/g, 'b'],
  [/kh/g, 'k'],
  [/gh/g, 'g'],
  [/sh/g, 's'],
  [/ph/g, 'f'],
  [/ck/g, 'k'],
  [/w/g, 'v'],
  [/ee/g, 'i'],
  [/oo/g, 'u'],
  [/ai(?=y)/g, 'a'], // aiya → aya, same as ayya
  [/(.)\1+/g, '$1'], // malli → mali, kasun stays
];

export function fold(token) {
  let t = token;
  for (const [re, to] of FOLD_RULES) t = t.replace(re, to);
  return t;
}

/** Optimal-string-alignment distance (Levenshtein + adjacent swaps), capped. */
export function editDistance(a, b, max = 2) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const prev2 = new Array(b.length + 1);
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, prev2[j - 2] + 1);
      }
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    for (let j = 0; j <= b.length; j++) prev2[j] = prev[j];
    prev = cur;
  }
  return prev[b.length];
}

/**
 * `pos` counts only real name words, so in "Mr. Ranjith Pannala" the first
 * name is still "ranjith" (pos 0). Titles and kinship words get pos -1.
 */
function tokens(text, weight = 1) {
  let pos = 0;
  return normalize(text)
    .split(' ')
    .filter(Boolean)
    .map((raw) => {
      const soft = SOFT_WORDS.has(raw);
      return {
        raw,
        folded: fold(raw),
        pos: soft ? -1 : pos++,
        weight: soft ? SOFT_WEIGHT * weight : weight,
      };
    });
}

/** Pre-compute tokens once per guest list; search() runs on every keystroke. */
export function buildIndex(guests) {
  return guests.map((guest) => ({
    guest,
    full: normalize(guest.name),
    tokens: [...tokens(guest.name), ...tokens(guest.hint, HINT_WEIGHT).map((t) => ({ ...t, pos: 99 }))],
  }));
}

function typoBudget(len) {
  if (len >= 8) return 2;
  if (len >= 4) return 1;
  return 0;
}

/** How well one query word matches one name word, 0…1. */
export function wordScore(q, t) {
  if (t.folded === q.folded || t.raw === q.raw) return 1;
  if (t.folded.startsWith(q.folded) || t.raw.startsWith(q.raw)) {
    return 0.72 + 0.2 * (q.folded.length / t.folded.length);
  }
  const max = typoBudget(q.folded.length);
  if (!max) return 0;
  // Typos rarely happen on the first letter; requiring it keeps short-name noise down.
  if (q.folded[0] !== t.folded[0] && q.folded.length < 6) return 0;
  const whole = editDistance(q.folded, t.folded, max);
  if (whole <= max) return 0.7 - 0.12 * whole;
  if (t.folded.length > q.folded.length) {
    const partial = editDistance(q.folded, t.folded.slice(0, q.folded.length), max);
    if (partial <= max) return 0.6 - 0.12 * partial;
  }
  return 0;
}

function scoreEntry(entry, queryTokens, queryFull) {
  let total = 0;
  let counted = 0;
  let firstWordHit = false;

  for (const q of queryTokens) {
    let best = 0;
    let bestPos = -1;
    // If the guest deliberately typed a kinship word ("akka"), honour it in full.
    const queryIsSoft = q.weight < 1;
    for (const t of entry.tokens) {
      const s = wordScore(q, t) * (queryIsSoft ? Math.max(t.weight, HINT_WEIGHT) : t.weight);
      if (s > best) {
        best = s;
        bestPos = t.pos;
      }
    }
    const optional = q.raw.length === 1; // initials like "D." shouldn't veto a match
    if (best === 0 && !optional) return 0;
    if (!optional) {
      total += best;
      counted++;
    }
    if (q === queryTokens[0] && bestPos === 0) firstWordHit = true;
  }
  if (!counted) return 0;

  let score = total / counted;
  if (firstWordHit) score += 0.08;
  if (entry.full === queryFull) score += 0.3;
  else if (entry.full.startsWith(queryFull)) score += 0.12;
  // Prefer names the query covers more completely ("Kasun" → "Kasun" before "Kasun Perera").
  const nameWords = entry.tokens.filter((t) => t.pos >= 0 && t.pos !== 99).length;
  score -= 0.015 * Math.max(0, nameWords - counted);
  return score;
}

/**
 * @returns {{ guest: object, score: number }[]} best first, at most `limit`
 */
export function search(index, query, { limit = 5 } = {}) {
  const queryTokens = tokens(query);
  if (!queryTokens.length) return [];
  const queryFull = queryTokens.map((t) => t.raw).join(' ');

  const results = [];
  for (const entry of index) {
    const score = scoreEntry(entry, queryTokens, queryFull);
    if (score >= MIN_SCORE) results.push({ guest: entry.guest, score });
  }
  results.sort((a, b) => b.score - a.score || a.guest.name.localeCompare(b.guest.name));
  return results.slice(0, limit);
}
