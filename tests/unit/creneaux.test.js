import assert from 'node:assert/strict';
import { test } from 'node:test';
import { capacite, creneaux, familleDisponible, profDisponible } from '../../src/algos/creneaux.js';
import { formaterHeure } from '../../src/utils/texte.js';

const soiree = (o) => ({ debut: '17:00', fin: '20:00', duree: 15, pauses: [], ...o });
const heures = (s) => creneaux(s).map((c) => formaterHeure(c.d));

test('17h-20h, 15 minutes : 12 créneaux', () => {
  const l = creneaux(soiree());
  assert.equal(l.length, 12);
  assert.deepEqual(
    [l[0], l[11]],
    [
      { d: 1020, f: 1035 },
      { d: 1185, f: 1200 },
    ],
  );
});

test('une durée qui ne divise pas la soirée laisse un reliquat inutilisé', () => {
  assert.equal(creneaux(soiree({ duree: 20, fin: '18:10' })).length, 3);
});

test('une pause décale les créneaux suivants', () => {
  assert.deepEqual(heures(soiree({ fin: '18:30', pauses: [{ debut: '17:40', duree: 10 }] })), ['17h00', '17h15', '17h50', '18h05']);
});

test('horaires invalides : aucun créneau', () => {
  assert.equal(creneaux(soiree({ debut: '' })).length, 0);
  assert.equal(creneaux(soiree({ fin: '16:00' })).length, 0);
  assert.equal(creneaux(soiree({ duree: 0 })).length, 0);
});

test('disponibilités des professeurs et des familles', () => {
  const c = { d: 1050, f: 1065 }; // 17h30-17h45
  assert.ok(profDisponible({ dispoDe: '', dispoA: '' }, c));
  assert.ok(!profDisponible({ dispoDe: '17:45', dispoA: '' }, c));
  assert.ok(!profDisponible({ dispoDe: '', dispoA: '17:40' }, c));
  assert.ok(familleDisponible({ pasAvant: '17:30', pasApres: '17:45' }, c));
  assert.ok(!familleDisponible({ pasAvant: '18:00', pasApres: '' }, c));
});

test('capacité d’un binôme : créneaux où les deux professeurs sont présents', () => {
  const l = creneaux(soiree());
  assert.equal(capacite([{ dispoDe: '' }, { dispoDe: '' }], l), 12);
  assert.equal(capacite([{ dispoDe: '17:45' }, { dispoDe: '', dispoA: '19:30' }], l), 7);
  assert.equal(capacite([{}], l), 0, 'binôme incomplet');
});
