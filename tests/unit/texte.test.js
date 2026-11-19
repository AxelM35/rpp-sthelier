import assert from 'node:assert/strict';
import { test } from 'node:test';
import { creerAlea } from '../../src/utils/alea.js';
import { comparer, echapper, formaterHeure, nouvelId, versMinutes } from '../../src/utils/texte.js';

test('echapper neutralise le HTML', () => {
  assert.equal(echapper('<img src=x onerror="a">'), '&lt;img src=x onerror=&quot;a&quot;&gt;');
  assert.equal(echapper("l'élève & co"), 'l&#39;élève &amp; co');
  assert.equal(echapper(null), '');
});

test('heures : conversion dans les deux sens', () => {
  assert.equal(versMinutes('17:45'), 1065);
  assert.equal(versMinutes('9:05'), 545);
  assert.equal(versMinutes('17h45'), null);
  assert.equal(versMinutes(''), null);
  assert.equal(formaterHeure(1065), '17h45');
  assert.equal(formaterHeure(1080), '18h00');
});

test('comparer : ordre français, chiffres et accents', () => {
  assert.deepEqual(['6C', '6a', '6B'].sort(comparer), ['6a', '6B', '6C']);
  assert.deepEqual(['Émile', 'Eva', 'Ethan'].sort(comparer), ['Émile', 'Ethan', 'Eva']);
});

test('nouvelId produit des identifiants valides', () => {
  for (let i = 0; i < 200; i++) assert.match(nouvelId(), /^[a-z0-9]{8}$/);
});

test('creerAlea est reproductible', () => {
  const a = creerAlea(42);
  const b = creerAlea(42);
  const suite = Array.from({ length: 5 }, () => a());
  assert.deepEqual(
    suite,
    Array.from({ length: 5 }, () => b()),
  );
  assert.ok(suite.every((x) => x >= 0 && x < 1));
});
