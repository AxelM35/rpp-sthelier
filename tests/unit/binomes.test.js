import assert from 'node:assert/strict';
import { test } from 'node:test';
import { proposerBinomes } from '../../src/algos/binomes.js';
import { college } from '../fixtures/college.js';
import { verifierPlanning } from './invariants.js';

const signature = (etat) =>
  etat.binomes
    .map((b) => b.profIds.join('+') + ':' + b.classeIds.join('+'))
    .sort()
    .join(' ');

test('collège type : binômes valides, chacun peut recevoir ses élèves', () => {
  const { etat, rapport } = proposerBinomes(college());
  assert.ok(rapport.ok, rapport.txt);
  assert.equal(etat.binomes.length, 10);
  verifierPlanning(etat, { complet: false });
});

test('l’état fourni n’est pas modifié', () => {
  const avant = college();
  const copie = JSON.stringify(avant);
  proposerBinomes(avant);
  assert.equal(JSON.stringify(avant), copie);
});

test('résultat reproductible : même situation, même proposition', () => {
  assert.equal(signature(proposerBinomes(college()).etat), signature(proposerBinomes(college()).etat));
});

test('crée des binômes glissants quand les effectifs l’exigent', () => {
  // 27 élèves en 6A avec 12 créneaux : deux binômes ne suffisent pas, trois seraient sous-employés.
  const { etat } = proposerBinomes(college());
  assert.ok(etat.binomes.some((b) => b.classeIds.length === 2));
});

test('mode « nombre minimal » : pas plus de binômes que le mode « tous »', () => {
  const tous = proposerBinomes(college()).etat.binomes.length;
  const etat = college({ effectifs: [20, 20, 20, 20] });
  etat.opt.mode = 'min';
  const min = proposerBinomes(etat);
  assert.ok(min.rapport.ok);
  assert.ok(min.etat.binomes.length <= tous);
  assert.ok(min.etat.binomes.length >= Math.ceil(80 / 12));
});

test('capacité insuffisante : rapport explicite par classe', () => {
  const etat = college();
  etat.soiree.fin = '18:00'; // 4 créneaux seulement
  const { rapport } = proposerBinomes(etat);
  assert.equal(rapport.ok, false);
  assert.match(rapport.txt, /Capacité insuffisante : .*6[ABCD] \(il manque \d+ créneaux?\)/);
});

test('les binômes « Conservé » et leurs professeurs sont gardés', () => {
  const etat = college();
  etat.binomes = [{ id: 'mien', fixe: true, profIds: ['p13', 'p19'], classeIds: ['c6C'], salle: 'B12' }];
  const r = proposerBinomes(etat);
  const garde = r.etat.binomes.find((b) => b.id === 'mien');
  assert.deepEqual(garde, etat.binomes[0]);
  assert.equal(r.etat.binomes.filter((b) => b.profIds.includes('p13')).length, 1);
  assert.match(r.rapport.txt, /1 binôme\(s\) conservé\(s\)/);
});

test('un rendez-vous verrouillé et son binôme survivent à une nouvelle proposition', () => {
  const etat = college();
  etat.binomes = [{ id: 'b1', fixe: false, profIds: ['p0', 'p3'], classeIds: ['c6A'], salle: '' }];
  Object.assign(etat.eleves[0], { binomeId: 'b1', slot: 4, verrou: true });
  Object.assign(etat.eleves[1], { binomeId: 'b1', slot: 5, verrou: false });
  const r = proposerBinomes(etat);
  assert.deepEqual([r.etat.eleves[0].binomeId, r.etat.eleves[0].slot, r.etat.eleves[0].verrou], ['b1', 4, true]);
  assert.equal(r.etat.eleves[1].binomeId, null, 'les rendez-vous non verrouillés sont remis à zéro');
});

test('un professeur absent une partie de la soirée réduit la capacité de son binôme', () => {
  const etat = college();
  etat.profs.forEach((p) => (p.dispoDe = p.nom === 'M. Joly' ? '18:00' : ''));
  const { etat: r, rapport } = proposerBinomes(etat);
  assert.ok(rapport.ok, rapport.txt);
  verifierPlanning(r, { complet: false });
});

test('aucun créneau ou aucun professeur : refus explicite, état inchangé', () => {
  const sansCreneau = college();
  sansCreneau.soiree.fin = '16:00';
  assert.match(proposerBinomes(sansCreneau).rapport.txt, /Aucun créneau/);
  const sansProf = college();
  sansProf.profs = [];
  const r = proposerBinomes(sansProf);
  assert.match(r.rapport.txt, /au moins deux professeurs/);
  assert.equal(r.etat, sansProf);
});
