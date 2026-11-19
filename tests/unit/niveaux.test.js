// Version 2, lot 2 : données par niveau, reprise des données de la version 1, stockage, résumés de l'accueil.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { genererTout } from '../../src/algos/generation.js';
import { NIVEAUX, VERSION_DONNEES } from '../../src/config.js';
import * as stockage from '../../src/io/stockage.js';
import { etatVide, migrer, valider } from '../../src/modele/etat.js';
import { chiffreNiveau, nomFichier, preparationVide, resumerNiveau } from '../../src/modele/niveaux.js';
import { college } from '../fixtures/college.js';

/** Données au format de la version 1 : pas de niveau. */
function donneesV1(etat = college()) {
  const { niveau, ...reste } = etat;
  assert.equal(niveau, '6e');
  return { ...reste, v: 1 };
}

/** Faux stockage local, en mémoire. plein : refuse toute écriture. */
function fauxStockage(initial = {}) {
  const m = new Map(Object.entries(initial));
  return {
    m,
    plein: false,
    lire: (cle) => (m.has(cle) ? m.get(cle) : null),
    ecrire(cle, valeur) {
      if (this.plein) return false;
      m.set(cle, valeur);
      return true;
    },
    supprimer: (cle) => m.delete(cle),
    cles: () => [...m.keys()],
  };
}

// ---------- Format des données ----------

test('un état neuf porte son niveau et la version courante', () => {
  assert.equal(VERSION_DONNEES, 2);
  assert.deepEqual(NIVEAUX, ['6e', '5e', '4e', '3e']);
  assert.equal(etatVide().niveau, '6e');
  assert.equal(etatVide('4e').niveau, '4e');
  assert.equal(valider(etatVide('3e')).niveau, '3e');
});

test('migration 1 → 2 : les données de la v1 deviennent le niveau 6e, sans perte', () => {
  const etat = genererTout(college({ date: '2026-12-01' })).etat;
  const v1 = donneesV1(etat);
  assert.deepEqual(migrer(structuredClone(v1)), { ...v1, v: 2, niveau: '6e' });
  assert.deepEqual(valider(structuredClone(v1)), etat, 'toutes les données sont reprises à l’identique');
});

test('niveau absent, inconnu ou piégé : sauvegarde refusée', () => {
  for (const niveau of [undefined, '2nde', '<img src=x onerror=alert(1)>', 6, null]) {
    assert.throws(() => valider({ ...college(), niveau }), /niveau inconnu/);
  }
});

// ---------- Stockage par niveau ----------

test('chaque niveau a ses propres clés', () => {
  assert.deepEqual(stockage.clesNiveau('5e'), { donnees: 'rpp-v2-5e', meta: 'rpp-v2-5e-meta', secours: 'rpp-v2-5e-secours' });
});

test('lireNiveau : niveau absent, valide ou illisible, sans rien modifier', () => {
  const etat = { ...college(), niveau: '5e' };
  const s = fauxStockage({ 'rpp-v2-5e': JSON.stringify(etat), 'rpp-v2-4e': '{abîmé' });
  const avant = new Map(s.m);

  const absent = stockage.lireNiveau(s, '3e');
  assert.deepEqual([absent.present, absent.illisible, absent.etat], [false, null, etatVide('3e')]);

  const lu = stockage.lireNiveau(s, '5e');
  assert.deepEqual([lu.present, lu.etat], [true, etat]);

  const abime = stockage.lireNiveau(s, '4e');
  assert.deepEqual([abime.present, abime.illisible, abime.etat], [false, '{abîmé', etatVide('4e')]);

  assert.deepEqual(s.m, avant);
});

test('lireNiveau : la clé fait foi sur le niveau inscrit dans les données', () => {
  const s = fauxStockage({ 'rpp-v2-4e': JSON.stringify(college()) }); // données marquées 6e
  assert.equal(stockage.lireNiveau(s, '4e').etat.niveau, '4e');
});

test('effacer un niveau ne touche pas aux autres ; tout effacer ne laisse aucune clé de l’application', () => {
  const s = fauxStockage({
    'rpp-v2-6e': '{}',
    'rpp-v2-6e-meta': '{}',
    'rpp-v2-6e-secours': 'x',
    'rpp-v2-5e': '{}',
    'rpp-v2-5e-meta': '{}',
    'rpp6-v1-secours': 'ancien',
    'autre-application': 'garder',
  });
  stockage.effacerNiveau(s, '6e');
  assert.deepEqual(s.cles().sort(), ['autre-application', 'rpp-v2-5e', 'rpp-v2-5e-meta', 'rpp6-v1-secours']);
  stockage.effacerTout(s);
  assert.deepEqual(s.cles(), ['autre-application']);
});

test('dates de sauvegarde par niveau et état de la sauvegarde', () => {
  const s = fauxStockage({ 'rpp-v2-5e-meta': 'illisible' });
  assert.deepEqual(stockage.lireMeta(s, '5e'), {});
  stockage.noterMeta(s, '5e', 'modif', 1000);
  stockage.noterMeta(s, '5e', 'export', 2000);
  assert.deepEqual(stockage.lireMeta(s, '5e'), { modif: 1000, export: 2000 });
  assert.deepEqual(stockage.lireMeta(s, '6e'), {});

  const etat = college();
  assert.equal(stockage.etatSauvegarde({}, etatVide()), null);
  assert.deepEqual(stockage.etatSauvegarde({}, etat), { statut: 'warn', texte: 'Pas encore sauvegardé dans un fichier' });
  assert.equal(stockage.etatSauvegarde({ modif: 1000, export: 2000 }, etat).statut, 'ok');
  assert.match(stockage.etatSauvegarde({ modif: 3000, export: 2000 }, etat).texte, /^Modifié depuis la sauvegarde du /);
});

// ---------- Reprise des données de la version 1 ----------

test('reprise v1 : données, dates et copie de secours passent au 6e, anciennes clés supprimées', () => {
  const etat = genererTout(college()).etat;
  const s = fauxStockage({
    'rpp6-v1': JSON.stringify(donneesV1(etat)),
    'rpp6-v1-meta': '{"modif":1,"export":2}',
    'rpp6-v1-secours': 'vieille copie',
  });
  assert.equal(stockage.reprendreDonneesV1(s), 'reprise');
  assert.deepEqual(s.cles().sort(), ['rpp-v2-6e', 'rpp-v2-6e-meta', 'rpp-v2-6e-secours']);
  assert.deepEqual(stockage.lireNiveau(s, '6e').etat, etat);
  assert.equal(s.lire('rpp-v2-6e-meta'), '{"modif":1,"export":2}');
  assert.equal(s.lire('rpp-v2-6e-secours'), 'vieille copie');
  assert.equal(stockage.reprendreDonneesV1(s), null, 'une seule reprise');
});

test('reprise v1 : rien à reprendre', () => {
  const s = fauxStockage({ 'rpp-v2-5e': '{}' });
  assert.equal(stockage.reprendreDonneesV1(s), null);
  assert.deepEqual(s.cles(), ['rpp-v2-5e']);
});

test('reprise v1 : données illisibles mises de côté comme copie de secours du 6e', () => {
  for (const brut of ['{pas du JSON', '{"v":1,"eleves":"non"}']) {
    const s = fauxStockage({ 'rpp6-v1': brut });
    assert.equal(stockage.reprendreDonneesV1(s), 'illisible');
    assert.deepEqual(s.cles(), ['rpp-v2-6e-secours']);
    assert.equal(s.lire('rpp-v2-6e-secours'), brut);
  }
});

test('reprise v1 : un 6e déjà rempli est gardé, les données v1 sont mises de côté', () => {
  const sixieme = JSON.stringify(college());
  const s = fauxStockage({ 'rpp-v2-6e': sixieme, 'rpp6-v1': JSON.stringify(donneesV1()) });
  assert.equal(stockage.reprendreDonneesV1(s), 'conflit');
  assert.equal(s.lire('rpp-v2-6e'), sixieme);
  assert.ok(s.lire('rpp-v2-6e-secours'));
  assert.equal(s.lire('rpp6-v1'), null);
});

test('reprise v1 : stockage plein, les anciennes clés restent en place', () => {
  const brut = JSON.stringify(donneesV1());
  const s = fauxStockage({ 'rpp6-v1': brut });
  s.plein = true;
  assert.equal(stockage.reprendreDonneesV1(s), null);
  assert.deepEqual([...s.m], [['rpp6-v1', brut]]);
});

// ---------- Résumé de l'accueil ----------

test('résumé d’un niveau vide, puis d’un niveau préparé', () => {
  const vide = resumerNiveau(etatVide('3e'));
  assert.deepEqual(vide, { vide: true, date: '', eleves: 0, profs: 0, binomes: 0, planifies: 0, points: 0, conservation: null });

  const avecDate = etatVide('3e');
  avecDate.soiree.date = '2027-01-15';
  assert.equal(preparationVide(avecDate), false, 'une date saisie suffit à montrer la préparation');

  const saisi = college({ date: '2026-12-01' });
  const r0 = resumerNiveau(saisi, '2026-11-19');
  assert.deepEqual([r0.vide, r0.eleves, r0.profs, r0.binomes, r0.planifies], [false, 108, 20, 0, 0]);
  assert.ok(r0.points > 0, 'élèves sans binôme : points à corriger');

  const prepare = genererTout(saisi).etat;
  const r = resumerNiveau(prepare, '2026-11-19');
  assert.ok(r.binomes > 0);
  assert.equal(r.planifies, 108);
  assert.equal(r.points, 0);
  assert.equal(r.conservation, null);
  assert.deepEqual(resumerNiveau(prepare, '2026-12-02').conservation, { limite: '2026-12-31', depassee: false });
});

test('noms de fichiers et de classes selon le niveau', () => {
  assert.equal(nomFichier('planning-rencontres', '5e', 'xlsx'), 'planning-rencontres-5e.xlsx');
  assert.deepEqual(NIVEAUX.map(chiffreNiveau), ['6', '5', '4', '3']);
});
