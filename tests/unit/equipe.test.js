// Version 2, lot 3, étape 3a : format de données version 3 (LVB, options, enseignements, professeur principal,
// élèves ULIS), migration depuis la version 2 et équipe de l'élève.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { VERSION_DONNEES } from '../../src/config.js';
import { classesDuProf, enseignementDans } from '../../src/modele/acces.js';
import { dansEquipe, equipeEleve } from '../../src/modele/equipe.js';
import { etatVide, listesParDefaut, migrer, valider } from '../../src/modele/etat.js';
import { normaliser } from '../../src/modele/normaliser.js';
import { college, enFormatV1 } from '../fixtures/college.js';

const ens = (classeId, type = 'classe', refId = null, sansUlis = false) => ({ classeId, type, refId, sansUlis });
const prof = (id, nom, enseignements) => ({ id, nom, discipline: '', enseignements, dispoDe: '', dispoA: '' });
const eleve = (id, nom, classeId, { lvbId = null, optionIds = [], ulis = false } = {}) => ({
  id,
  nom,
  prenom: '',
  classeId,
  lvbId,
  optionIds,
  ulis,
  fratrie: '',
  pasAvant: '',
  pasApres: '',
  binomeId: null,
  slot: null,
  verrou: false,
});

/**
 * Une classe de 4e inspirée des exports Pronote : espagnol (l'enseignante n'a pas les élèves ULIS),
 * breton et histoire-géographie en breton pour les bilingues, professeur principal qui n'enseigne que l'espagnol
 * dans une autre classe.
 */
function quatrieme() {
  const etat = etatVide('4e');
  etat.options.push({ id: 'opt-hgbzh', nom: 'Histoire-géographie en breton' });
  etat.classes = [
    { id: 'c4B', nom: '4 B', ppId: 'pMaths' },
    { id: 'c4M', nom: '4 M', ppId: 'pEsp2' },
  ];
  etat.profs = [
    prof('pMaths', 'Mme Maths', [ens('c4B'), ens('c4M')]),
    prof('pEsp', 'M. Espagnol', [ens('c4B', 'lvb', 'lvb-espagnol', true)]),
    prof('pEsp2', 'Mme Espagnol', [ens('c4M', 'lvb', 'lvb-espagnol')]),
    prof('pAll', 'Mme Allemand', [ens('c4B', 'lvb', 'lvb-allemand')]),
    prof('pBzh', 'Mme Breton', [ens('c4B', 'option', 'opt-breton')]),
    prof('pHgBzh', 'M. HG en breton', [ens('c4B', 'option', 'opt-hgbzh')]),
    prof('pHg', 'Mme HG', [ens('c4B', 'sauf', 'opt-hgbzh'), ens('c4M')]),
  ];
  etat.eleves = [
    eleve('e1', 'Hispanisant', 'c4B', { lvbId: 'lvb-espagnol' }),
    eleve('e2', 'Bilingue', 'c4B', { lvbId: 'lvb-allemand', optionIds: ['opt-breton', 'opt-hgbzh'] }),
    eleve('e3', 'Ulis', 'c4B', { lvbId: 'lvb-espagnol', ulis: true }),
    eleve('e4', 'SansLvb', 'c4M', { ulis: true }),
    eleve('e5', 'Hispanisant4M', 'c4M', { lvbId: 'lvb-espagnol', ulis: true }),
  ];
  return etat;
}

const equipe = (etat, id) =>
  equipeEleve(
    etat,
    etat.eleves.find((e) => e.id === id),
  ).map((p) => p.id);

// ---------- Équipe de l'élève ----------

test('équipe : classe entière, LVB, option, discipline partagée', () => {
  const etat = quatrieme();
  assert.deepEqual(equipe(etat, 'e1'), ['pMaths', 'pEsp', 'pHg'], 'hispanisant : pas d’allemand, de breton ni de HG en breton');
  assert.deepEqual(
    equipe(etat, 'e2'),
    ['pMaths', 'pAll', 'pBzh', 'pHgBzh'],
    'bilingue : allemand, breton et HG en breton, mais pas Mme HG (« sauf »)',
  );
});

test('équipe : un élève ULIS n’a pas l’enseignant de LVB qui n’a pas les élèves ULIS (U1 bis)', () => {
  const etat = quatrieme();
  assert.deepEqual(equipe(etat, 'e3'), ['pMaths', 'pHg'], '4 B : M. Espagnol n’a pas les élèves ULIS');
  assert.ok(equipe(etat, 'e5').includes('pEsp2'), '4 M : Mme Espagnol a les élèves ULIS');
});

test('équipe : le professeur principal a toujours tous les élèves de sa classe (U2)', () => {
  const etat = quatrieme();
  // Mme Espagnol, professeure principale de 4 M, n'y enseigne que l'espagnol.
  assert.ok(equipe(etat, 'e4').includes('pEsp2'), 'élève sans LVB : son professeur principal reste dans son équipe');
  assert.deepEqual(equipe(etat, 'e4'), ['pMaths', 'pEsp2', 'pHg']);
  // Sans le rôle de professeur principal, elle n'aurait pas cet élève.
  etat.classes[1].ppId = null;
  assert.deepEqual(equipe(etat, 'e4'), ['pMaths', 'pHg']);
});

test('équipe : un enseignant d’une autre classe n’en fait jamais partie', () => {
  const etat = quatrieme();
  const e1 = etat.eleves[0];
  assert.equal(dansEquipe(etat, etat.profs[2], e1), false, 'Mme Espagnol enseigne l’espagnol en 4 M, pas en 4 B');
  assert.equal(dansEquipe(etat, etat.profs[0], { ...e1, classeId: 'inconnue' }), false);
});

// ---------- Format version 3 ----------

test('listes par défaut du niveau (LVB et options)', () => {
  assert.equal(VERSION_DONNEES, 3);
  assert.deepEqual(listesParDefaut('6e'), { lvb: [], options: [{ id: 'opt-breton', nom: 'Breton' }] });
  assert.deepEqual(
    listesParDefaut('5e').lvb.map((x) => x.id),
    ['lvb-espagnol', 'lvb-allemand'],
  );
  assert.deepEqual(listesParDefaut('2nde'), { lvb: [], options: [] });
  assert.deepEqual(etatVide('3e').lvb, listesParDefaut('3e').lvb);
});

test('une préparation complète en version 3 est rechargée à l’identique', () => {
  const etat = quatrieme();
  assert.deepEqual(valider(JSON.parse(JSON.stringify(etat))), etat);
});

test('migration 2 → 3 : classes des professeurs en « classe entière », listes par défaut, élèves sans LVB', () => {
  const etat = college();
  const v2 = { ...enFormatV1(etat), v: 2, niveau: '5e' };
  const migre = migrer(structuredClone(v2));
  assert.equal(migre.v, 3);
  assert.deepEqual(migre.lvb, listesParDefaut('5e').lvb);
  assert.ok(migre.profs.every((p) => !('classeIds' in p)));

  const v = valider(structuredClone(v2));
  assert.deepEqual(
    v.profs.map((p) => p.enseignements),
    etat.profs.map((p) => p.enseignements),
    'chaque classe cochée devient un enseignement « classe entière »',
  );
  assert.ok(v.eleves.every((e) => e.lvbId === null && e.optionIds.length === 0 && e.ulis === false));
  assert.ok(v.classes.every((c) => c.ppId === null));
  assert.deepEqual(v.eleves.length, etat.eleves.length);
});

test('validation : enseignements invalides écartés sans erreur', () => {
  const etat = quatrieme();
  etat.profs[0].enseignements = [
    ens('c4B', 'lvb', 'lvb-inconnue'), // LVB inconnue
    ens('c4B', 'option', 'lvb-espagnol'), // une LVB n'est pas une option
    ens('c4B', 'magique'), // type inconnu
    ens('inconnue'), // classe inconnue
    ens('c4B', 'classe', 'opt-breton', true), // refId et sansUlis sans objet pour la classe entière
    ens('c4B', 'option', 'opt-breton'), // seconde ligne pour la même classe
    ens('c4M', 'sauf', 'opt-hgbzh'),
  ];
  const v = valider(etat);
  assert.deepEqual(v.profs[0].enseignements, [ens('c4B'), ens('c4M', 'sauf', 'opt-hgbzh')]);
});

test('validation : LVB, options et ULIS des élèves ; professeur principal inconnu', () => {
  const etat = quatrieme();
  Object.assign(etat.eleves[0], { lvbId: 'lvb-inconnue', optionIds: ['opt-breton', 'opt-breton', 'opt-x'], ulis: 'oui' });
  etat.classes[0].ppId = 'prof-disparu';
  const v = valider(etat);
  assert.deepEqual([v.eleves[0].lvbId, v.eleves[0].optionIds, v.eleves[0].ulis], [null, ['opt-breton'], false]);
  assert.equal(v.classes[0].ppId, null);
  assert.equal(v.classes[1].ppId, 'pEsp2');
});

test('validation : identifiants de LVB et d’options contrôlés (injection, doublons)', () => {
  const piege = quatrieme();
  piege.lvb[0].id = 'x" onmouseover="alert(1)';
  assert.throws(() => valider(piege), /identifiant invalide dans « LVB »/);
  const double = quatrieme();
  double.options[0].id = 'lvb-espagnol';
  assert.throws(() => valider(double), /identifiant en double dans « options »/);
  const liste = quatrieme();
  liste.options = 'Breton';
  assert.throws(() => valider(liste), /la liste « options » est invalide/);
});

test('normaliser : supprimer une option, une LVB, une classe ou un professeur met tout en cohérence', () => {
  const etat = quatrieme();
  etat.options = etat.options.filter((o) => o.id !== 'opt-hgbzh');
  etat.lvb = etat.lvb.filter((x) => x.id !== 'lvb-allemand');
  etat.profs = etat.profs.filter((p) => p.id !== 'pEsp2');
  etat.classes = etat.classes.filter((c) => c.id !== 'c4M');
  normaliser(etat);
  const parId = (id) => etat.profs.find((p) => p.id === id);
  assert.deepEqual(parId('pHgBzh').enseignements, [], 'enseignement de l’option supprimée retiré');
  assert.deepEqual(parId('pHg').enseignements, [], '« sauf » de l’option supprimée et classe supprimée retirés');
  assert.deepEqual(parId('pAll').enseignements, [], 'enseignement de la LVB supprimée retiré');
  assert.deepEqual(classesDuProf(parId('pMaths')), ['c4B']);
  assert.equal(enseignementDans(parId('pEsp'), 'c4B').sansUlis, true);
  const bilingue = etat.eleves.find((e) => e.id === 'e2');
  assert.deepEqual([bilingue.lvbId, bilingue.optionIds], [null, ['opt-breton']]);
  assert.equal(etat.eleves.length, 3, 'élèves de la classe supprimée retirés');
});
