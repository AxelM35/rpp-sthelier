// Version 2, lot 3, étape 3b : calcul par groupes d'élèves de même équipe (LVB, options, ULIS, professeur
// principal), règles V2-R2 et V2-R10, décisions 4a à 4c du 20 novembre, nouveaux contrôles.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { proposerBinomes, proposerVariantes } from '../../src/algos/binomes.js';
import { aCorriger, controler } from '../../src/algos/controles.js';
import { ecartCharges } from '../../src/algos/equilibre.js';
import { genererTout } from '../../src/algos/generation.js';
import { binomeLimite, compatibles, couverture, grouperEleves, libelleGroupe } from '../../src/algos/groupes.js';
import { repartirEleves } from '../../src/algos/repartition.js';
import { profsDuBinome, trouverBinome } from '../../src/modele/acces.js';
import { college } from '../fixtures/college.js';
import { college4e } from '../fixtures/college4e.js';
import { verifierPlanning } from './invariants.js';

const prof = (etat, id) => etat.profs.find((p) => p.id === id);
const textes = (etat) => controler(etat).map((p) => p.texte);
const binome = (id, profIds, classeIds) => ({ id, fixe: true, profIds, classeIds, salle: '' });

// ---------- Groupes ----------

test('groupes : un seul par classe quand tout est enseigné à la classe entière (calcul de la v1)', () => {
  const etat = college();
  const groupes = grouperEleves(etat);
  assert.deepEqual(
    groupes.map((g) => [g.classeId, g.eleves.length]),
    [
      ['c6A', 27],
      ['c6B', 28],
      ['c6C', 26],
      ['c6D', 27],
    ],
  );
  assert.ok(
    couverture(etat).every((c) => c.groupes.length === 0),
    'pas de détail par groupe',
  );
});

test('groupes : élèves de même équipe, avec un libellé lisible', () => {
  const etat = college4e();
  const groupes = grouperEleves(etat);
  const de = (classe) => groupes.filter((g) => g.classeId === 'c' + classe).map((g) => libelleGroupe(etat, g) + ' : ' + g.eleves.length);
  assert.deepEqual(de('4A'), ['Allemand : 3', 'Espagnol · Breton · Histoire-géographie en breton : 2', 'Espagnol : 21']);
  assert.deepEqual(
    de('4E'),
    ['Espagnol ou Espagnol · ULIS ou ULIS : 26'],
    '4E : la professeure principale a tous les élèves, une seule équipe pour trois profils',
  );
  assert.ok(de('4D').includes('Espagnol · ULIS : 1'), '4D : l’élève ULIS n’a pas l’enseignante d’espagnol, groupe à part');
  assert.equal(
    groupes.reduce((n, g) => n + g.eleves.length, 0),
    127,
  );
});

test('compatibilité d’une paire (question 4c) et binôme limité (question 4a)', () => {
  const etat = college4e();
  const [bzh, hgb, al, f1, h1, es2, lat] = ['pBz', 'pHB', 'pAl', 'pF1', 'pH1', 'pEs2', 'pLa'].map((id) => prof(etat, id));
  assert.equal(compatibles(etat, bzh, hgb, 'c4A'), false, 'breton + histoire-géographie en breton : deux options différentes');
  assert.equal(compatibles(etat, al, lat, 'c4D'), false, 'allemand + latin');
  assert.equal(compatibles(etat, bzh, f1, 'c4A'), true, 'une option et la classe entière');
  assert.equal(compatibles(etat, h1, hgb, 'c4A'), true, '« sauf » n’est pas une limite');
  assert.equal(binomeLimite(etat, [bzh, f1], ['c4A']), true);
  assert.equal(binomeLimite(etat, [h1, f1], ['c4A']), false);
  assert.equal(binomeLimite(etat, [es2, f1], ['c4E']), false, 'professeure principale de 4E : pas limitée dans sa classe');
  assert.equal(binomeLimite(etat, [es2, f1], ['c4D']), true, 'mais limitée à l’espagnol en 4D');
});

test('écart des charges : les binômes limités ne comptent pas, sauf s’ils sont les seuls', () => {
  assert.deepEqual(
    ecartCharges([
      { n: 14, cap: 14 },
      { n: 12, cap: 14 },
      { n: 3, cap: 14, limite: true },
    ]),
    { min: 12, max: 14, ecart: 2, reduit: false, limites: 1 },
  );
  assert.equal(ecartCharges([{ n: 3, cap: 14, limite: true }]).max, 3);
});

// ---------- Proposition, répartition, horaires ----------

for (const mode of ['tous', 'min']) {
  test('4e, mode « ' + mode + ' » : tous les élèves placés, chacun par deux enseignants de son équipe (V2-R2)', () => {
    const etat = college4e();
    etat.opt.mode = mode;
    const { etat: e, rapport } = genererTout(etat);
    assert.ok(rapport.ok, rapport.txt);
    verifierPlanning(e);
    for (const b of e.binomes) {
      const [p1, p2] = profsDuBinome(e, b);
      b.classeIds.forEach((c) => assert.ok(compatibles(e, p1, p2, c), 'aucune paire de deux options différentes (4c)'));
    }
    const restes = e.profs.filter((p) => !e.binomes.some((b) => b.profIds.includes(p.id)));
    if (mode === 'min') {
      assert.equal(e.binomes.length, 10, 'nombre minimal de binômes : 127 élèves pour 14 créneaux');
    } else {
      assert.deepEqual(
        restes.map((p) => p.id).sort(),
        ['pBz', 'pHB'],
        'seuls restent les deux enseignants des bilingues, qui ne peuvent pas s’associer (4c)',
      );
    }
    assert.ok(!aCorriger(controler(e)).length, 'aucun point à corriger : ' + aCorriger(controler(e)).map((p) => p.texte));
  });
}

test('4e : l’élève ULIS de 4D n’est jamais reçu par l’enseignante d’espagnol qui ne l’a pas en cours', () => {
  const { etat } = genererTout(college4e());
  const ulis = etat.eleves.filter((e) => e.classeId === 'c4D' && e.ulis);
  assert.equal(ulis.length, 2);
  ulis.forEach((e) => assert.ok(!trouverBinome(etat, e.binomeId).profIds.includes('pEs2')));
});

test('4e : capacité insuffisante (12 créneaux) signalée, règles respectées pour les élèves placés', () => {
  const etat = college4e({ fin: '20:00' });
  const { etat: e, rapport } = genererTout(etat);
  assert.equal(rapport.ok, false);
  assert.match(rapport.txt, /Capacité insuffisante/);
  verifierPlanning(e, { complet: false });
  assert.ok(e.eleves.filter((x) => !x.binomeId).length <= 7);
});

test('variantes : indicateurs de charge hors binômes limités', () => {
  const r = proposerVariantes(college4e());
  assert.ok(r.variantes.length >= 2);
  for (const v of r.variantes) {
    assert.equal(v.indicateurs.sansPlace, 0);
    assert.ok(v.indicateurs.limites > 0);
    assert.ok(v.indicateurs.chargeMax - v.indicateurs.chargeMin <= 2, JSON.stringify(v.indicateurs));
  }
});

test('binôme composé à la main avec deux options différentes : permis, signalé, ne reçoit que les élèves des deux', () => {
  const etat = college4e();
  etat.binomes = [binome('bz', ['pBz', 'pHB'], ['c4A'])];
  assert.ok(
    textes(etat).some((t) => /ne peut recevoir que les élèves qui suivent à la fois Breton et Histoire-géographie en breton/.test(t)),
  );
  const p = proposerBinomes(etat);
  assert.ok(
    p.etat.binomes.some((b) => b.id === 'bz'),
    'le binôme conservé est gardé',
  );
  const { etat: r } = repartirEleves(p.etat);
  const recus = r.eleves.filter((e) => e.binomeId === 'bz');
  assert.equal(recus.length, 2, 'les deux bilingues');
  assert.ok(recus.every((e) => e.optionIds.includes('opt-breton') && e.optionIds.includes('opt-hgbzh')));
});

// ---------- Contrôles ----------

test('contrôle : élève dont l’équipe compte moins de deux enseignants', () => {
  const etat = college4e();
  etat.classes.push({ id: 'c4F', nom: '4F', ppId: null });
  etat.profs[0].enseignements.push({ classeId: 'c4F', type: 'classe', refId: null, sansUlis: false });
  etat.eleves.push({ ...etat.eleves[0], id: 'seul', nom: 'Seul', classeId: 'c4F', optionIds: [] });
  assert.ok(textes(etat).some((t) => /^1 élève\(s\) ont moins de deux enseignants dans leur équipe.*Seul/.test(t)));
});

test('contrôles : LVB sans enseignant, option sans élève, deux enseignants d’une même LVB, élève sans LVB', () => {
  const etat = college4e();
  etat.profs = etat.profs.filter((p) => p.id !== 'pAl'); // plus d'enseignante d'allemand
  etat.eleves.filter((e) => e.classeId === 'c4C').forEach((e) => (e.optionIds = e.optionIds.filter((o) => o !== 'opt-latin')));
  prof(etat, 'pEs1').enseignements.push({ classeId: 'c4E', type: 'lvb', refId: 'lvb-espagnol', sansUlis: false });
  etat.eleves.find((e) => e.classeId === 'c4B').lvbId = null;
  const t = textes(etat);
  assert.ok(t.includes('4A : 3 élève(s) suivent Allemand, sans enseignant déclaré dans la classe.'));
  assert.ok(t.includes('M. Lacaze enseigne Latin en 4C, mais aucun élève de la classe ne le suit.'));
  assert.ok(t.some((x) => /^4E : 2 enseignants d'Espagnol \(M\. Estève, Mme Espinasse\)/.test(x)));
  assert.ok(
    t.some((x) => /^1 élève\(s\) sans LVB : /.test(x)),
    'l’élève de 4B ; pas l’élève ULIS de 4E',
  );
});

test('contrôle : élève déplacé chez un binôme dont un professeur ne l’a pas en cours (V2-F8)', () => {
  const { etat } = genererTout(college4e());
  const latiniste = etat.binomes.find((b) => b.profIds.includes('pLa'));
  assert.ok(latiniste, 'M. Lacaze a un binôme');
  const nonLatiniste = etat.eleves.find((e) => latiniste.classeIds.includes(e.classeId) && !e.optionIds.includes('opt-latin'));
  nonLatiniste.binomeId = latiniste.id;
  nonLatiniste.slot = null;
  assert.ok(textes(etat).some((t) => t.includes("est reçu(e) par M. Lacaze, qui ne l'a pas en cours")));
});

test('libellé d’un groupe : élèves de même équipe mais de profils différents', () => {
  const etat = college4e();
  etat.profs = etat.profs.filter((p) => p.id !== 'pAl');
  const g = grouperEleves(etat).filter((x) => x.classeId === 'c4D');
  assert.ok(
    g.some((x) => libelleGroupe(etat, x) === 'Allemand ou Espagnol · ULIS'),
    'sans enseignante d’allemand, les germanistes ont la même équipe que l’élève ULIS hispanisant',
  );
});

test('couverture : détail des groupes d’une classe (V2-F7)', () => {
  const { etat } = genererTout(college4e());
  const c4c = couverture(etat).find((c) => c.nom === '4C');
  assert.equal(c4c.eleves, 25);
  assert.equal(c4c.manque, 0);
  assert.deepEqual(
    c4c.groupes.map((g) => g.libelle),
    ['Espagnol', 'Espagnol · Latin', 'Espagnol · Athlétisme', 'Espagnol · Latin · Athlétisme'],
  );
  assert.ok(c4c.groupes.every((g) => g.binomes >= 1 && g.manque === 0));
});

test('performance : la génération complète d’un niveau de 4e reste rapide', () => {
  const debut = performance.now();
  genererTout(college4e());
  assert.ok(performance.now() - debut < 3000);
});
