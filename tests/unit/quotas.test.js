import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calculerQuotas } from '../../src/algos/quotas.js';
import { ecartCharges } from '../../src/algos/equilibre.js';

test('répartit une classe entre ses binômes de façon équilibrée', () => {
  const q = calculerQuotas(
    [
      { id: 'a', classeIds: ['A'], cap: 12 },
      { id: 'b', classeIds: ['A'], cap: 12 },
    ],
    { A: 21 },
  );
  assert.equal(q.manque, 0);
  assert.deepEqual([q.charge.a, q.charge.b].sort(), [10, 11]);
});

test('passe par un binôme glissant pour libérer de la place (chaîne)', () => {
  // A : 13 élèves pour un binôme de 12 ; le glissant G (A+B) doit prendre l'élève de trop
  // en laissant ses élèves de B au binôme B.
  const bins = [
    { id: 'a', classeIds: ['A'], cap: 12 },
    { id: 'g', classeIds: ['B', 'A'], cap: 12 },
    { id: 'b', classeIds: ['B'], cap: 12 },
  ];
  const q = calculerQuotas(bins, { B: 20, A: 13 });
  assert.equal(q.manque, 0);
  assert.equal((q.x.a.A || 0) + (q.x.g.A || 0), 13);
  assert.ok(Math.max(...Object.values(q.charge)) - Math.min(...Object.values(q.charge)) <= 1);
});

test('signale les élèves sans place quand la capacité manque', () => {
  const q = calculerQuotas([{ id: 'a', classeIds: ['A'], cap: 10 }], { A: 13, B: 2 });
  assert.equal(q.manque, 5);
  assert.deepEqual(q.nonPlaces, { A: 3, B: 2 });
});

test('tient compte des élèves déjà placés (verrouillés)', () => {
  const q = calculerQuotas(
    [
      { id: 'a', classeIds: ['A'], cap: 12 },
      { id: 'b', classeIds: ['A'], cap: 12 },
    ],
    { A: 18 },
    { a: 4 },
  );
  assert.equal(q.charge.a + q.charge.b, 22);
  assert.ok(Math.abs(q.charge.a - q.charge.b) <= 1);
});

test('ecartCharges ignore les binômes pleins à capacité réduite', () => {
  assert.deepEqual(
    ecartCharges([
      { n: 9, cap: 9 },
      { n: 11, cap: 12 },
      { n: 12, cap: 12 },
    ]),
    { min: 11, max: 12, ecart: 1, reduit: true, limites: 0 },
  );
  assert.equal(ecartCharges([]).ecart, 0);
});
