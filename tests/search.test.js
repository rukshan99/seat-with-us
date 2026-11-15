import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalize, fold, editDistance, buildIndex, search } from '../src/search.js';

const load = (name) => JSON.parse(readFileSync(new URL(`../src/data/${name}.json`, import.meta.url)));

const guests = [
  { id: '1', name: 'Kasun Perera', group: "Pasindu's friends", table: '3' },
  { id: '2', name: 'Kasun Perera', group: "Mahesh's guests", party: 2, table: '7' },
  { id: '3', name: 'Kasuni Karunarathne', table: '4' },
  { id: '4', name: 'Parakkarama & Achini', table: '1' },
  { id: '5', name: 'Hichchi Ayya', hint: 'Ranjith', table: '1' },
  { id: '6', name: 'Tharu Jayawardhana', table: '5' },
  { id: '7', name: 'Kusum Akka', table: '1' },
  { id: '8', name: 'Mahesh Nanayakkara', table: '1' },
  { id: '9', name: 'Lucky Mama', table: '9' },
  { id: '10', name: 'Rukshan Jayasekara', table: '2' },
  { id: '11', name: 'Rajitha Abeygunawardana', table: '6' },
];
const index = buildIndex(guests);
const names = (q, opts) => search(index, q, opts).map((r) => r.guest.name);
const ids = (q, opts) => search(index, q, opts).map((r) => r.guest.id);

describe('normalize', () => {
  test('lower-cases and strips accents and punctuation', () => {
    assert.equal(normalize('  Rukshán  JAYASEKARA. '), 'rukshan jayasekara');
    assert.equal(normalize('D.S.P. Rajakaruna'), 'd s p rajakaruna');
    assert.equal(normalize("Ashinsana's"), 'ashinsana s');
  });
});

describe('fold', () => {
  test('treats common Sri Lankan romanisations as the same sound', () => {
    assert.equal(fold('jayawardhana'), fold('jayavardana'));
    assert.equal(fold('sooriya'), fold('suriya'));
    assert.equal(fold('aiya'), fold('ayya'));
    assert.equal(fold('weerasinghe'), fold('virasinghe'));
    assert.equal(fold('thilina'), fold('tilina'));
  });
});

describe('editDistance', () => {
  test('counts substitutions, insertions, deletions and swaps', () => {
    assert.equal(editDistance('kasun', 'kasun'), 0);
    assert.equal(editDistance('kasn', 'kasun'), 1);
    assert.equal(editDistance('ksaun', 'kasun'), 1);
    assert.equal(editDistance('abc', 'xyz', 1), 2); // capped at max + 1
  });
});

describe('search', () => {
  test('is case- and accent-insensitive', () => {
    assert.deepEqual(names('RUKSHÁN'), ['Rukshan Jayasekara']);
  });

  test('matches the start of any word, while typing', () => {
    assert.deepEqual(names('achi'), ['Parakkarama & Achini']);
    assert.equal(names('jayas')[0], 'Rukshan Jayasekara');
  });

  test('tolerates typos', () => {
    assert.equal(names('Mahesh Nanayakara')[0], 'Mahesh Nanayakkara');
    assert.equal(names('Rukshna')[0], 'Rukshan Jayasekara');
    assert.equal(names('Kasn Perera')[0], 'Kasun Perera');
  });

  test('tolerates spelling variants', () => {
    assert.deepEqual(names('Jayawardena'), ['Tharu Jayawardhana']);
    assert.deepEqual(names('Hichchi Aiya'), ['Hichchi Ayya']);
  });

  test('returns every guest with an ambiguous name so they can choose', () => {
    const r = ids('kasun perera');
    assert.deepEqual(r.slice(0, 2).sort(), ['1', '2']);
  });

  test('more words narrow the results', () => {
    assert.ok(names('kasun').length >= 3);
    assert.ok(!names('kasun per').includes('Kasuni Karunarathne'));
  });

  test('finds a guest by the note in brackets', () => {
    assert.deepEqual(names('Ranjith'), ['Hichchi Ayya']);
  });

  test('kinship words never outrank a real name', () => {
    const r = names('ma');
    assert.equal(r[0], 'Mahesh Nanayakkara');
    assert.ok(!r.includes('Lucky Mama') || r.indexOf('Lucky Mama') > 0);
  });

  test('a fully typed kinship word still finds people', () => {
    assert.deepEqual(names('akka'), ['Kusum Akka']);
    assert.deepEqual(names('mama'), ['Lucky Mama']);
  });

  test('ranks an exact full-name match first', () => {
    assert.equal(names('Kasuni Karunarathne')[0], 'Kasuni Karunarathne');
  });

  test('returns nothing for unknown or empty queries', () => {
    assert.deepEqual(names('zzzzqq'), []);
    assert.deepEqual(names(''), []);
    assert.deepEqual(names('  .  '), []);
  });

  test('respects the result limit', () => {
    assert.equal(names('ka', { limit: 2 }).length, 2);
  });
});

describe('real guest lists', () => {
  const wedding = buildIndex(load('wedding'));
  const homecoming = buildIndex(load('homecoming'));
  const top = (idx, q) => search(idx, q)[0]?.guest.name;

  test('every guest can find themselves by their exact name', () => {
    for (const [label, idx] of [['wedding', wedding], ['homecoming', homecoming]]) {
      for (const { guest } of idx) {
        const found = search(idx, guest.name, { limit: 10 }).map((r) => r.guest);
        assert.ok(found.includes(guest), `${label}: "${guest.name}" not found by its own name`);
      }
    }
  });

  test('common lookups land on the right person', () => {
    assert.equal(top(wedding, 'achini'), 'Achini Nanayakkara');
    assert.equal(top(wedding, 'swarna'), 'Swarna Akka');
    assert.equal(top(homecoming, 'kasun'), 'Kasun Perera');
    assert.equal(search(homecoming, 'kasun perera').filter((r) => r.guest.name === 'Kasun Perera').length, 2);
  });
});
