// Version 2, lot 3, étape 3d : import des exports bruts de Pronote (règles de docs/import-pronote.md).

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { genererTout } from '../../src/algos/generation.js';
import { importerLignes } from '../../src/io/import.js';
import {
  analyserEleves,
  analyserProfs,
  correspondance,
  detecterPronote,
  importerEleves,
  importerProfs,
  nomAffiche,
} from '../../src/io/pronote.js';
import { enseignementDans } from '../../src/modele/acces.js';
import { equipeEleve } from '../../src/modele/equipe.js';
import { etatVide } from '../../src/modele/etat.js';
import { exportEleves4e, exportEnseignants } from '../fixtures/pronote.js';
import { verifierPlanning } from './invariants.js';

const prof = (etat, nom) => etat.profs.find((p) => p.nom.includes(nom));
const classe = (etat, nom) => etat.classes.find((c) => c.nom === nom);
const option = (etat, nom) => etat.options.find((o) => o.nom === nom);

/** Niveau de 4e après l'import des enseignants, puis des élèves (choix par défaut). */
function quatrieme({ choixProfs = {}, choixEleves = {} } = {}) {
  let etat = etatVide('4e');
  const profs = analyserProfs(exportEnseignants(), etat, '4e', choixProfs);
  etat = importerProfs(etat, profs).etat;
  const eleves = analyserEleves(exportEleves4e(), etat, '4e', choixEleves);
  return { profs, eleves, etat: importerEleves(etat, eleves).etat };
}

test('reconnaissance des exports Pronote à leurs en-têtes', () => {
  assert.equal(detecterPronote(exportEnseignants()), 'profs');
  assert.equal(detecterPronote(exportEleves4e()), 'eleves');
  assert.equal(detecterPronote([['Nom', 'Prénom', 'Classe']]), null);
  assert.equal(detecterPronote([]), null);
});

test('noms et correspondances : sans accents ni majuscules, un nom commençant par l’autre (P1)', () => {
  assert.equal(nomAffiche('ESPAGNOL LV2'), 'Espagnol');
  assert.equal(nomAffiche('BRETON REG.'), 'Breton');
  assert.equal(nomAffiche('CHINOIS LV2'), 'Chinois');
  const options = [
    { id: 'o1', nom: 'Breton' },
    { id: 'o2', nom: 'Latin' },
    { id: 'o3', nom: 'Histoire-géographie (groupe à part)' },
  ];
  assert.equal(correspondance(options, 'BRETON REG.').id, 'o1');
  assert.equal(correspondance(options, 'LCA LATIN').id, 'o2');
  assert.equal(correspondance(options, 'HISTOIRE-GEOGRAPHIE').id, 'o3');
  assert.equal(correspondance(options, 'ATHLETISME'), null);
});

// ---------- Enseignants ----------

test('enseignants : classes du niveau, exclusion, matière inconnue, partage, professeurs principaux', () => {
  const a = analyserProfs(exportEnseignants(), etatVide('4e'), '4e');
  assert.deepEqual(a.classes, ['4 A', '4 B', '4 C']);
  assert.equal(a.autresClasses, 1, 'la 5 A est ignorée');
  assert.deepEqual(a.exclus, ['Mme GUERIN Ada'], '« Suivi Inclusion » dans une classe : écartée partout (E4)');
  assert.equal(a.nonRattaches, 1, 'Mme LEROUX : devoirs faits seulement');
  assert.deepEqual(
    a.inconnues.map((x) => [x.matiere, x.occurrences, x.categorie]),
    [['ROBOTIQUE', 2, 'classe']],
    'effectif de toute la classe en 4 B : « toute la classe » proposé',
  );
  assert.equal(a.partages.length, 1);
  assert.deepEqual(
    [a.partages[0].classe, a.partages[0].petit, a.partages[0].grands],
    ['4 A', { nom: 'M. HAMEL Yann', effectif: 2 }, [{ nom: 'Mme HERVE Lise', effectif: 24 }]],
  );
  assert.deepEqual(
    a.nouvellesOptions.map((x) => x.nom),
    ['Histoire-géographie (groupe à part)', 'Athlétisme', 'Latin'],
  );
  assert.deepEqual(a.nouvellesLvb, [], 'Espagnol et Allemand sont déjà dans les listes de la 4e');
  assert.deepEqual(
    a.pp.map((x) => x.classe + ' : ' + x.nom),
    ['4 A : Mme FOURNIER Anne', '4 B : Mme MEUNIER Clara', '4 C : Mme ESPINASSE Ines'],
  );
  assert.equal(a.profs.length, 24);
});

test('enseignants : import des types d’enseignement, des listes du niveau et des professeurs principaux', () => {
  const { etat } = quatrieme();
  const ens = (nom, c) => enseignementDans(prof(etat, nom), classe(etat, c).id);
  const hg = option(etat, 'Histoire-géographie (groupe à part)');
  assert.ok(hg && option(etat, 'Latin') && option(etat, 'Athlétisme') && option(etat, 'Breton'));
  assert.deepEqual(ens('HAMEL', '4 A'), { classeId: classe(etat, '4 A').id, type: 'option', refId: hg.id, sansUlis: false, effectif: 2 });
  assert.equal(ens('HERVE', '4 A').type, 'sauf');
  assert.equal(ens('HERVE', '4 B').type, 'classe');
  assert.deepEqual([ens('ESTEVE', '4 A').type, ens('ESTEVE', '4 A').effectif], ['lvb', 21]);
  assert.equal(ens('MULLER', '4 A').type, 'classe', '« service de notation actif » : toute la classe (E3)');
  assert.equal(ens('MULLER', '4 A').effectif, undefined);
  assert.equal(ens('ETIENNE', '4 B').type, 'classe', 'EPS et athlétisme : toute la classe');
  assert.equal(ens('NICOLAS', '4 A').type, 'classe', 'LLC ANGLAIS ignorée, anglais LV1 : toute la classe');
  assert.equal(ens('ATHANE', '4 B').type, 'option');
  assert.equal(ens('ESPINASSE', '4 C').type, 'lvb');
  assert.ok(!prof(etat, 'GUERIN') && !prof(etat, 'LEROUX'));
  assert.equal(classe(etat, '4 C').ppId, prof(etat, 'ESPINASSE').id);
  assert.equal(prof(etat, 'HERVE').discipline, 'HISTOIRE-GEOGRAPHIE, ENS. MORAL & CIVIQUE');
});

test('enseignants : choix de l’organisateur (matière inconnue ignorée, partage refusé)', () => {
  const a = analyserProfs(exportEnseignants(), etatVide('4e'), '4e', {
    classement: { ROBOTIQUE: 'ignoree' },
    partages: { '4 A|HISTOIRE-GEOGRAPHIE': false },
  });
  assert.equal(a.profs.length, 23);
  assert.equal(a.nonRattaches, 3);
  assert.ok(!a.nouvellesOptions.some((x) => x.nom.startsWith('Histoire')));
  const etat = importerProfs(etatVide('4e'), a).etat;
  assert.equal(enseignementDans(prof(etat, 'HAMEL'), classe(etat, '4 A').id).type, 'classe');
});

test('enseignants : un second import met à jour sans doublon ; « remplacer » retire professeurs et binômes', () => {
  const { etat } = quatrieme();
  const a = analyserProfs(exportEnseignants(), etat, '4e');
  const r = importerProfs(etat, a);
  assert.deepEqual([r.ajoutes, r.completes, r.etat.profs.length], [0, 24, 24]);
  assert.equal(r.etat.options.length, etat.options.length, 'listes inchangées');
  const avecBinome = {
    ...etat,
    binomes: [{ id: 'b1', fixe: true, profIds: [etat.profs[0].id, etat.profs[1].id], classeIds: [], salle: '' }],
  };
  const remplace = importerProfs(avecBinome, analyserProfs(exportEnseignants(), avecBinome, '4e'), { remplacer: true });
  assert.deepEqual([remplace.ajoutes, remplace.etat.binomes.length], [24, 0]);
});

// ---------- Élèves ----------

test('élèves : niveau, colonnes ignorées, LVB et options, valeurs inconnues, élèves ULIS (U1 bis)', () => {
  const { eleves: a } = quatrieme();
  assert.equal(a.eleves.length, 75);
  assert.equal(a.autres, 1, 'l’élève de 5e est ignoré');
  assert.deepEqual(a.colonnesIgnorees, ['Né(e) le', 'Sexe', "Projet d'accompagnement", 'Allergies', 'Majeur', 'Groupes']);
  assert.deepEqual(Object.fromEntries(a.comptes.map((x) => [x.nom, x.n])), {
    Allemand: 3,
    Breton: 2,
    Espagnol: 70,
    'Histoire-géographie (groupe à part)': 2,
    Athlétisme: 8,
    Latin: 11,
  });
  assert.deepEqual(
    a.ignorees.map((x) => x.valeur),
    ['ANGLAIS LV1', 'LLC ANGLAIS', 'ENS. MORAL & CIVIQUE'],
  );
  assert.deepEqual(
    a.inconnues.map((x) => [x.valeur, x.type, x.ajouter]),
    [['CHINOIS LV2', 'lvb', true]],
  );
  assert.deepEqual(
    a.ulis.map((x) => [x.classe, x.prof, x.effectif, x.eleves, x.ulis, x.sansUlis, x.certain]),
    [['4 A', 'M. ESTEVE Hugo', 21, 23, 2, true, true]],
    'effectif 21 = 23 hispanisants − 2 élèves ULIS : il ne les a pas',
  );
  assert.deepEqual(a.verifications, [], 'effectifs des options conformes');
  assert.equal(a.sansProfs, false);
  assert.equal(a.eleves[7].prenom, 'Prénom-usage', 'le prénom d’usage remplace le prénom (P7)');
});

test('élèves : import, équipes et génération complète conformes à V2-R2', () => {
  const { etat } = quatrieme();
  const bilingues = etat.eleves.filter((e) => e.optionIds.includes(option(etat, 'Breton').id));
  assert.equal(bilingues.length, 2);
  assert.ok(bilingues.every((e) => e.optionIds.includes(option(etat, 'Histoire-géographie (groupe à part)').id)));
  assert.equal(etat.eleves.filter((e) => e.ulis).length, 3, 'formations « 4 EME ULIS » et « 4EME ULIS »');
  assert.equal(enseignementDans(prof(etat, 'ESTEVE'), classe(etat, '4 A').id).sansUlis, true);
  assert.ok(etat.lvb.some((x) => x.nom === 'Chinois'));

  const hamel = prof(etat, 'HAMEL');
  const equipes = etat.eleves.filter((e) => equipeEleve(etat, e).includes(hamel));
  assert.deepEqual(equipes, bilingues, 'M. HAMEL : les seuls bilingues');
  const ulis4a = etat.eleves.filter((e) => e.ulis && e.classeId === classe(etat, '4 A').id);
  assert.ok(ulis4a.every((e) => !equipeEleve(etat, e).includes(prof(etat, 'ESTEVE'))));

  const g = genererTout(etat);
  assert.ok(g.rapport.ok, g.rapport.txt);
  verifierPlanning(g.etat);
});

test('élèves : choix de l’organisateur (valeur inconnue ignorée, élèves ULIS gardés)', () => {
  const { etat } = quatrieme({ choixEleves: { ajouts: { 'CHINOIS LV2': false }, ulis: { ['4 A|' + 'x']: true } } });
  assert.ok(!etat.lvb.some((x) => x.nom === 'Chinois'));
  let e = etatVide('4e');
  e = importerProfs(e, analyserProfs(exportEnseignants(), e, '4e')).etat;
  const a = analyserEleves(exportEleves4e(), e, '4e');
  const cle = a.ulis[0].cle;
  const garde = importerEleves(e, analyserEleves(exportEleves4e(), e, '4e', { ulis: { [cle]: false } })).etat;
  assert.equal(enseignementDans(prof(garde, 'ESTEVE'), classe(garde, '4 A').id).sansUlis, false);
});

test('élèves : sans enseignants importés, rappel ; doublons ignorés à un second import', () => {
  const vide = analyserEleves(exportEleves4e(), etatVide('4e'), '4e');
  assert.equal(vide.sansProfs, true);
  const { etat } = quatrieme();
  const r = importerEleves(etat, analyserEleves(exportEleves4e(), etat, '4e'));
  assert.deepEqual([r.ajoutes, r.doublons], [0, 75]);
});

test('données personnelles : aucune colonne sensible n’est enregistrée', () => {
  const json = JSON.stringify(quatrieme().etat);
  for (const sensible of ['01/01/2012', 'Féminin', 'Masculin', 'PAP', '4A-HGBZH', '4A-G1']) assert.ok(!json.includes(sensible), sensible);
});

test('import générique : colonnes LVB et options rapprochées des listes, valeurs inconnues ajoutées (V2-F3)', () => {
  const etat = etatVide('5e');
  const lignes = [
    ['Nom', 'Prénom', 'Classe', 'LVB', 'Options'],
    ['Durand', 'Léa', '5A', 'espagnol', 'Breton; Théâtre'],
    ['Petit', 'Tom', '5 A', 'Italien', 'LLC ANGLAIS'],
  ];
  const r = importerLignes(etat, { type: 'eleves', lignes, colonnes: { nom: 0, prenom: 1, classe: 2, lvb: 3, options: 4 }, entete: true });
  assert.equal(r.etat.classes.length, 1, '« 5A » et « 5 A » : une seule classe');
  const [a, b] = r.etat.eleves;
  assert.equal(a.lvbId, 'lvb-espagnol');
  assert.deepEqual(
    a.optionIds.map((id) => r.etat.options.find((o) => o.id === id).nom),
    ['Breton', 'Théâtre'],
  );
  assert.equal(r.etat.lvb.find((x) => x.id === b.lvbId).nom, 'Italien');
  assert.deepEqual(b.optionIds, [], 'LLC ANGLAIS ignorée');
  assert.deepEqual(r.ajoutees, ['Théâtre', 'Italien']);
});
