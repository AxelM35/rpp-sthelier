import { DOMParser } from '@xmldom/xmldom';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { genererTout } from '../../src/algos/generation.js';
import { celluleCSV, lireCSV } from '../../src/io/csv.js';
import { csvPlanning, feuillesPlanning } from '../../src/io/exports.js';
import { detecterColonnes, importerLignes } from '../../src/io/import.js';
import { creerClasseur, lettreColonne, lireClasseur } from '../../src/io/xlsx.js';
import { ouvrirZip } from '../../src/io/zip.js';
import { college } from '../fixtures/college.js';
import { classesDuProf } from '../../src/modele/acces.js';

const fixture = (nom) => readFile(new URL('../fixtures/' + nom, import.meta.url));

// --- CSV ---

test('lireCSV devine le séparateur et gère guillemets, BOM et lignes vides', () => {
  assert.deepEqual(lireCSV('﻿Nom;Prénom\r\n"Dupont; fils";Marc\r\n\r\n'), [
    ['Nom', 'Prénom'],
    ['Dupont; fils', 'Marc'],
  ]);
  assert.deepEqual(lireCSV('a\tb\n1\t2'), [
    ['a', 'b'],
    ['1', '2'],
  ]);
  assert.deepEqual(lireCSV('a,b\n"x ""y""",z'), [
    ['a', 'b'],
    ['x "y"', 'z'],
  ]);
});

test('celluleCSV neutralise les formules', () => {
  assert.equal(celluleCSV('=HYPERLINK("x")'), '"\'=HYPERLINK(""x"")"');
  assert.equal(celluleCSV('+33'), '"\'+33"');
  assert.equal(celluleCSV('Dupont'), '"Dupont"');
});

test('export CSV du planning : une ligne par élève, formules neutralisées', () => {
  const { etat } = genererTout(college());
  etat.eleves[0].nom = '=1+1';
  const lignes = csvPlanning(etat).split('\r\n');
  assert.equal(lignes.length, etat.eleves.length + 1);
  assert.ok(lignes[0].startsWith('﻿"Classe";"Nom"'));
  assert.ok(lignes.some((l) => l.includes('"\'=1+1"')));
});

// --- Excel ---

test('lettreColonne', () => {
  assert.deepEqual([0, 25, 26, 27, 701].map(lettreColonne), ['A', 'Z', 'AA', 'AB', 'ZZ']);
});

test('classeur créé puis relu à l’identique (première feuille)', async () => {
  const lignes = [
    ['Nom', 'Prénom', 'Classe'],
    ['Zola', 'Émile', '6A'],
    ['<b>&', '"x"', '6B'],
  ];
  const octets = creerClasseur([
    { nom: 'Élèves', lignes, largeurs: [10, 10, 10] },
    { nom: 'Autre', lignes: [['non']], largeurs: [5] },
  ]);
  assert.deepEqual(await lireClasseur(octets, { DOMParser }), lignes);
});

test('classeurs produits par d’autres logiciels (chaînes partagées, compression)', async () => {
  const attendu = [
    ['Nom', 'Prénom', 'Classe'],
    ['Zola', 'Émile', '6A'],
    ['Hugo', 'Victor', '6B'],
    ['Sand', 'George'],
    ['', '', '', '', 'x'],
  ];
  for (const nom of ['eleves-openpyxl.xlsx', 'eleves-libreoffice.xlsx']) {
    assert.deepEqual(await lireClasseur(await fixture(nom), { DOMParser }), attendu, nom);
  }
});

test('un fichier qui n’est pas un classeur est refusé', async () => {
  await assert.rejects(lireClasseur(new TextEncoder().encode('pas un zip'), { DOMParser }), /ZIP invalide/);
});

test('export Excel du planning : trois feuilles cohérentes', async () => {
  const { etat } = genererTout(college());
  const [general, parClasse, parBinome] = feuillesPlanning(etat);
  assert.equal(general.lignes.length, 13, 'en-tête + 12 créneaux');
  assert.equal(general.lignes[0].length, etat.binomes.length + 1);
  assert.equal(parClasse.lignes.length, etat.eleves.length + 1);
  assert.equal(parBinome.lignes.length, etat.eleves.length + 1);
  const zip = ouvrirZip(creerClasseur([general, parClasse, parBinome]));
  assert.ok(zip.noms.includes('xl/worksheets/sheet3.xml'));
});

// --- Import ---

test('detecterColonnes reconnaît les en-têtes usuels', () => {
  assert.deepEqual(detecterColonnes('eleves', [['Division', 'Prénom', 'Nom de famille']]), {
    entete: true,
    colonnes: { nom: 2, prenom: 1, classe: 0, fratrie: -1, lvb: -1, options: -1 },
  });
  assert.deepEqual(detecterColonnes('profs', [['Enseignant', 'Matière', 'Classes']]).colonnes, { nom: 0, discipline: 1, classe: 2 });
  assert.deepEqual(detecterColonnes('eleves', [['Dupont', 'Marc', '6A']]), {
    entete: false,
    colonnes: { nom: 0, prenom: 1, classe: 2, fratrie: -1, lvb: -1, options: -1 },
  });
});

test('import d’élèves : classes créées, doublons ignorés', () => {
  const lignes = [
    ['Nom', 'Prénom', 'Classe'],
    ['Dupont', 'Marc', '6A'],
    ['Durand', 'Léa', '6E'],
    ['dupont', 'marc', '6a'],
  ];
  const options = { type: 'eleves', lignes, ...detecterColonnes('eleves', lignes) };
  const r1 = importerLignes(college(), options);
  assert.deepEqual([r1.ajoutes, r1.doublons], [2, 1]);
  assert.ok(r1.etat.classes.some((c) => c.nom === '6E'));
  const r2 = importerLignes(r1.etat, options);
  assert.deepEqual([r2.ajoutes, r2.doublons], [0, 3], 'réimporter le même fichier n’ajoute rien');
});

test('import de professeurs : classes sur une cellule ou sur plusieurs lignes', () => {
  const lignes = [
    ['Nom', 'Matière', 'Classe'],
    ['Mme Neuve', 'Latin', '6A, 6B'],
    ['Mme Neuve', 'Latin', '6C'],
    ['Mme Aubert', 'Français', '6B'],
  ];
  const r = importerLignes(college(), { type: 'profs', lignes, ...detecterColonnes('profs', lignes) });
  assert.deepEqual([r.ajoutes, r.doublons], [1, 1]);
  const classes = (nom) => classesDuProf(r.etat.profs.find((p) => p.nom === nom));
  assert.deepEqual(classes('Mme Neuve'), ['c6A', 'c6B', 'c6C']);
  assert.deepEqual(classes('Mme Aubert'), ['c6A', 'c6B']);
  assert.ok(
    r.etat.profs.every((p) => p.enseignements.every((x) => x.type === 'classe')),
    'import générique : classe entière',
  );
});

test('import : remplacer la liste, colonnes obligatoires', () => {
  const lignes = [['Dupont', 'Marc', '6A']];
  const r = importerLignes(college(), {
    type: 'eleves',
    lignes,
    colonnes: { nom: 0, prenom: 1, classe: 2 },
    entete: false,
    remplacer: true,
  });
  assert.equal(r.etat.eleves.length, 1);
  assert.match(importerLignes(college(), { type: 'eleves', lignes, colonnes: { nom: 0, classe: -1 } }).erreur, /Nom et Classe/);
});
