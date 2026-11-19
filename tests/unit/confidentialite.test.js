import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CONSERVATION_JOURS } from '../../src/config.js';
import { ajouterJours, dateDuJour, etatConservation } from '../../src/modele/confidentialite.js';
import { college } from '../fixtures/college.js';

test('dateDuJour utilise la date locale', () => {
  assert.equal(dateDuJour(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
});

test('ajouterJours traverse les fins de mois et d’année', () => {
  assert.equal(ajouterJours('2026-12-15', 30), '2027-01-14');
  assert.equal(ajouterJours('2028-02-28', 1), '2028-02-29');
});

test('rien à signaler avant ou le jour de la soirée, ni sans date ni élève', () => {
  const etat = college({ date: '2026-12-01' });
  assert.equal(etatConservation(etat, '2026-11-30'), null);
  assert.equal(etatConservation(etat, '2026-12-01'), null);
  assert.equal(etatConservation(college({ date: '' }), '2027-06-01'), null);
  const sansEleve = college({ date: '2026-12-01' });
  sansEleve.eleves = [];
  assert.equal(etatConservation(sansEleve, '2027-06-01'), null);
});

test('après la soirée : date limite, puis dépassement', () => {
  const etat = college({ date: '2026-12-01' });
  const limite = ajouterJours('2026-12-01', CONSERVATION_JOURS);
  assert.deepEqual(etatConservation(etat, '2026-12-02'), { limite, depassee: false });
  assert.deepEqual(etatConservation(etat, limite), { limite, depassee: false });
  assert.deepEqual(etatConservation(etat, ajouterJours(limite, 1)), { limite, depassee: true });
});
