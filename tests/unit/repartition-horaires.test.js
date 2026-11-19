import assert from 'node:assert/strict';
import { test } from 'node:test';
import { proposerBinomes } from '../../src/algos/binomes.js';
import { planifierHoraires } from '../../src/algos/horaires.js';
import { repartirEleves } from '../../src/algos/repartition.js';
import { comparerEleves } from '../../src/modele/acces.js';
import { college } from '../fixtures/college.js';
import { charges, verifierPlanning } from './invariants.js';

const avecBinomes = (o) => proposerBinomes(college(o)).etat;

test('répartition : tous les élèves placés, écart de charge de 2 au plus', () => {
  const { etat, rapport } = repartirEleves(avecBinomes());
  assert.ok(rapport.ok, rapport.txt);
  assert.ok(etat.eleves.every((e) => e.binomeId));
  const c = charges(etat);
  assert.ok(Math.max(...c) - Math.min(...c) <= 2, 'charges ' + c);
});

test('répartition équilibrée même avec des classes très inégales', () => {
  const { etat, rapport } = repartirEleves(avecBinomes({ effectifs: [21, 34, 26, 27] }));
  assert.ok(rapport.ok, rapport.txt);
  const c = charges(etat);
  assert.ok(Math.max(...c) - Math.min(...c) <= 2, 'charges ' + c);
});

test('répartition : les élèves verrouillés restent chez leur binôme', () => {
  const base = avecBinomes();
  const b = base.binomes[0];
  const e = base.eleves.find((x) => x.classeId === b.classeIds[0]);
  Object.assign(e, { binomeId: b.id, slot: 0, verrou: true });
  const { etat } = repartirEleves(base);
  const apres = etat.eleves.find((x) => x.id === e.id);
  assert.deepEqual([apres.binomeId, apres.slot, apres.verrou], [b.id, 0, true]);
});

test('horaires : planning complet et conforme à toutes les règles', () => {
  const { etat, rapport } = planifierHoraires(repartirEleves(avecBinomes()).etat);
  assert.ok(rapport.ok, rapport.txt);
  verifierPlanning(etat);
});

test('horaires : la fratrie a des rendez-vous consécutifs', () => {
  const { etat } = planifierHoraires(repartirEleves(avecBinomes()).etat);
  const [a, b] = etat.eleves.filter((e) => e.fratrie === 'J1');
  assert.equal(Math.abs(a.slot - b.slot), 1);
});

test('horaires : élèves sans contrainte dans l’ordre alphabétique', () => {
  const { etat } = planifierHoraires(repartirEleves(avecBinomes()).etat);
  for (const b of etat.binomes) {
    const libres = etat.eleves
      .filter((e) => e.binomeId === b.id && !e.pasAvant && !e.pasApres && !e.fratrie)
      .sort((x, y) => x.slot - y.slot);
    assert.deepEqual(
      libres.map((e) => e.id),
      libres
        .slice()
        .sort(comparerEleves)
        .map((e) => e.id),
    );
  }
});

test('horaires : un professeur arrivé en retard n’a pas de rendez-vous avant son arrivée', () => {
  const base = college();
  base.profs.find((p) => p.nom === 'M. Joly').dispoDe = '18:00';
  const { etat } = planifierHoraires(repartirEleves(proposerBinomes(base).etat).etat);
  verifierPlanning(etat); // contrôle notamment la présence des professeurs
});

test('horaires : un rendez-vous verrouillé garde son créneau', () => {
  const reparti = repartirEleves(avecBinomes()).etat;
  const e = reparti.eleves[10];
  Object.assign(e, { slot: 7, verrou: true });
  const { etat } = planifierHoraires(reparti);
  assert.equal(etat.eleves.find((x) => x.id === e.id).slot, 7);
  verifierPlanning(etat);
});

test('horaires : signale les élèves impossibles à placer', () => {
  const reparti = repartirEleves(avecBinomes()).etat;
  const b = reparti.binomes[0];
  reparti.eleves.filter((e) => e.binomeId === b.id).forEach((e) => (e.pasAvant = '19:30')); // 2 créneaux pour tous
  const { rapport } = planifierHoraires(reparti);
  assert.equal(rapport.ok, false);
  assert.match(rapport.txt, /n'ont pas pu être placés/);
});
