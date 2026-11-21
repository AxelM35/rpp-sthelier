// Documents imprimables et exports (lot 4) : niveau partout (V2-F9), LVB et options (V2-F10), élèves prioritaires
// signalés seulement sur le planning par binôme (V2-F6 bis, décision 4), jamais l'indication ULIS.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { genererTout } from '../../src/algos/generation.js';
import { csvPlanning, feuillesPlanning } from '../../src/io/exports.js';
import { creerClasseur } from '../../src/io/xlsx.js';
import { ouvrirZip } from '../../src/io/zip.js';
import { lvbOptionsEleve } from '../../src/modele/acces.js';
import { titreSoiree } from '../../src/modele/niveaux.js';
import { DOCUMENTS, documentConvocations, documentGeneral, documentParBinome, documentParClasse } from '../../src/ui/documents.js';
import { college4e } from '../fixtures/college4e.js';

/** 4e générée, avec des élèves prioritaires et des élèves ULIS (jeu de test). */
function quatrieme() {
  const etat = college4e();
  etat.classes.forEach((c) =>
    etat.eleves
      .filter((e) => e.classeId === c.id)
      .slice(0, 2)
      .forEach((e) => (e.prioritaire = true)),
  );
  return genererTout(etat).etat;
}
const etat = quatrieme();
const prioritaire = etat.eleves.find((e) => e.prioritaire);
const ulis = etat.eleves.find((e) => e.ulis);

test('titre des documents et des exports : établissement, niveau, date', () => {
  assert.equal(titreSoiree(etat), 'Collège (test) — Rencontres parents-professeurs de 4e — jeudi 14 janvier 2027');
  assert.equal(titreSoiree({ niveau: '5e', soiree: { etab: '', date: '' } }), 'Rencontres parents-professeurs de 5e');
});

test('tous les documents indiquent le niveau (V2-F9)', () => {
  for (const [cle, d] of Object.entries(DOCUMENTS)) assert.match(d.generer(etat), /parents-professeurs de 4e/, cle);
  assert.deepEqual(Object.keys(DOCUMENTS), ['general', 'classes', 'binomes', 'convocations']);
});

test('élèves prioritaires : étoile et légende sur le planning par binôme seulement (décision 4)', () => {
  const parBinome = documentParBinome(etat);
  assert.match(parBinome, /★<\/span> /);
  assert.match(parBinome, /★ Élève prioritaire : rendez-vous demandé par le professeur principal/);
  const b = etat.binomes.find((x) => !etat.eleves.some((e) => e.binomeId === x.id && e.prioritaire));
  if (b) assert.doesNotMatch(documentParBinome({ ...etat, binomes: [b] }), /★/, 'pas de légende sans élève prioritaire');
  for (const html of [documentParClasse(etat), documentGeneral(etat), documentConvocations(etat)]) {
    assert.doesNotMatch(html, /★|prioritaire/i);
  }
  assert.ok(prioritaire);
});

test('planning par classe : LVB et options sur demande (V2-F10), jamais l’indication ULIS', () => {
  assert.doesNotMatch(documentParClasse(etat), /LVB et options/);
  const avec = documentParClasse({ ...etat, opt: { ...etat.opt, lvbOptions: true } });
  assert.match(avec, /<th>LVB et options<\/th>/);
  assert.match(avec, /Espagnol · Latin/);
  assert.match(avec, /Espagnol · Breton, Histoire-géographie en breton/);
  assert.ok(ulis);
  for (const html of [avec, documentParBinome(etat), documentGeneral(etat), documentConvocations(etat)]) {
    assert.doesNotMatch(html, /ULIS/);
  }
});

test('LVB et options d’un élève, sans ULIS', () => {
  assert.deepEqual(lvbOptionsEleve(etat, { lvbId: null, optionIds: [] }), { lvb: '', options: '' });
  const e = etat.eleves.find((x) => x.lvbId && x.optionIds.length > 1);
  const x = lvbOptionsEleve(etat, e);
  assert.ok(x.lvb && x.options.includes(', '));
  assert.ok(!JSON.stringify(lvbOptionsEleve(etat, ulis)).includes('ULIS'));
});

test('convocations : niveau, même texte pour un élève prioritaire', () => {
  const html = documentConvocations(etat);
  assert.match(html, /Rencontre parents-professeurs de 4e du jeudi 14 janvier 2027/);
  const coupons = html.split('<div class="coupon">').slice(1);
  const dePrio = coupons.find((c) => c.includes(prioritaire.nom + ' ' + prioritaire.prenom));
  const autre = coupons.find((c) => !c.includes(prioritaire.nom));
  // Même texte, au nom, à l'heure et aux enseignants près.
  const sansNom = (c) =>
    c
      .replace(/<b>.*?<\/b> \(.*?\)/, '')
      .replace(/<div class="heure">.*?<\/div>/, '')
      .replace(/<div>avec .*?<\/div>/, '');
  assert.equal(sansNom(dePrio), sansNom(autre));
});

test('export Excel : titre avec le niveau sur chaque feuille, LVB et options, ni ULIS ni prioritaire', async () => {
  const feuilles = feuillesPlanning(etat);
  assert.ok(feuilles.every((f) => f.titre === titreSoiree(etat)));
  const [, parClasse, parBinome] = feuilles;
  assert.deepEqual(parClasse.lignes[0].slice(0, 5), ['Classe', 'Nom', 'Prénom', 'LVB', 'Options']);
  assert.deepEqual(parBinome.lignes[0].slice(-2), ['LVB', 'Options']);
  assert.ok(parClasse.lignes.some((l) => l[3] === 'Espagnol' && l[4] === 'Latin'));
  const tout = JSON.stringify(feuilles);
  assert.doesNotMatch(tout, /ULIS|prioritaire|★/i);

  // Le titre occupe la première ligne, l'en-tête la deuxième (figée).
  const zip = ouvrirZip(creerClasseur(feuilles));
  const xml = await zip.lire('xl/worksheets/sheet2.xml');
  assert.match(xml, /<pane ySplit="2" topLeftCell="A3"/);
  assert.match(xml, /<c r="A1" t="inlineStr" s="3"><is><t xml:space="preserve">Collège \(test\) — Rencontres parents-professeurs de 4e/);
  assert.match(xml, /<c r="A2" t="inlineStr" s="1"><is><t xml:space="preserve">Classe</);
});

test('export CSV : niveau, LVB et options, ni ULIS ni prioritaire', () => {
  const csv = csvPlanning(etat);
  const [entete, premiere] = csv.split('\r\n');
  assert.equal(entete, '﻿"Niveau";"Classe";"Nom";"Prénom";"LVB";"Options";"Heure";"Salle";"Professeur 1";"Professeur 2"');
  assert.ok(premiere.startsWith('"4e";'));
  assert.doesNotMatch(csv, /ULIS|prioritaire/i);
});
