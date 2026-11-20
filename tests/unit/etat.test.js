import assert from 'node:assert/strict';
import { test } from 'node:test';
import { VERSION_DONNEES } from '../../src/config.js';
import { etatVide, migrer, valider } from '../../src/modele/etat.js';
import { normaliser } from '../../src/modele/normaliser.js';
import { college } from '../fixtures/college.js';

test('une sauvegarde valide est rechargée à l’identique', () => {
  const etat = college();
  etat.binomes = [{ id: 'b1', fixe: true, profIds: ['p0', 'p3'], classeIds: ['c6A'], salle: 'B12' }];
  etat.eleves[0].binomeId = 'b1';
  etat.eleves[0].slot = 2;
  etat.eleves[0].verrou = true;
  assert.deepEqual(valider(JSON.parse(JSON.stringify(etat))), etat);
});

test('un identifiant piégé est refusé (injection de code)', () => {
  const etat = college();
  etat.classes[0].id = 'x" onmouseover="alert(1)';
  assert.throws(() => valider(etat), /identifiant invalide dans « classes »/);
});

test('identifiants en double refusés', () => {
  const etat = college();
  etat.eleves[1].id = etat.eleves[0].id;
  assert.throws(() => valider(etat), /identifiant en double/);
});

test('structure incomplète refusée avec un message lisible', () => {
  assert.throws(() => valider({ v: 1, eleves: [], profs: [{ nom: 'A' }] }), /identifiant invalide dans « professeurs »/);
  assert.throws(() => valider({ v: 1, eleves: 'non' }), /la liste « élèves » est invalide/);
  assert.throws(() => valider({ eleves: [] }), /pas une sauvegarde/);
  assert.throws(() => valider(null), /pas une sauvegarde/);
});

test('les références orphelines et valeurs fantaisistes sont nettoyées', () => {
  const etat = college();
  etat.soiree.duree = 'abc';
  etat.soiree.debut = '25h';
  etat.eleves[0].classeId = 'inconnue';
  etat.eleves[1].binomeId = 'inconnu';
  etat.eleves[1].slot = 3;
  etat.eleves[1].verrou = true;
  etat.profs[0].enseignements.push({ classeId: 'inconnue', type: 'classe' }, { classeId: 'c6A', type: 'classe' });
  const v = valider(etat);
  assert.equal(v.soiree.duree, 15);
  assert.equal(v.soiree.debut, '17:00');
  assert.equal(v.eleves.length, etat.eleves.length - 1);
  assert.deepEqual([v.eleves[0].binomeId, v.eleves[0].slot, v.eleves[0].verrou], [null, null, false]);
  assert.deepEqual(
    v.profs[0].enseignements.map((x) => x.classeId),
    ['c6A'],
    'classe inconnue écartée, une seule fois la même classe',
  );
});

test('migrer : version courante acceptée, version future refusée', () => {
  assert.equal(migrer(etatVide()).v, VERSION_DONNEES);
  assert.throws(() => migrer({ v: VERSION_DONNEES + 1 }), /plus récente/);
  assert.throws(() => migrer({ v: 0 }), /version de sauvegarde inconnue/);
});

test('normaliser retire les horaires devenus impossibles', () => {
  const etat = college();
  etat.binomes = [{ id: 'b1', fixe: false, profIds: ['p0', 'p3'], classeIds: ['c6A'], salle: '' }];
  Object.assign(etat.eleves[0], { binomeId: 'b1', slot: 11, verrou: true });
  etat.soiree.fin = '18:00'; // il ne reste que 4 créneaux
  normaliser(etat);
  assert.deepEqual([etat.eleves[0].binomeId, etat.eleves[0].slot, etat.eleves[0].verrou], ['b1', null, false]);
  etat.classes = etat.classes.filter((c) => c.nom !== '6A');
  normaliser(etat);
  assert.ok(etat.eleves.every((e) => e.classeId !== 'c6A'));
  assert.deepEqual(etat.binomes[0].classeIds, []);
});
