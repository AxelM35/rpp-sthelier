// Règles qu'un planning généré doit toujours respecter (partagées par plusieurs tests).

import assert from 'node:assert/strict';
import { creneaux, familleDisponible, profDisponible } from '../../src/algos/creneaux.js';
import { classesDuProf, profsDuBinome, trouverBinome } from '../../src/modele/acces.js';
import { dansEquipe } from '../../src/modele/equipe.js';

export function verifierPlanning(etat, { complet = true } = {}) {
  const liste = creneaux(etat.soiree);
  const profsVus = new Set();
  for (const b of etat.binomes) {
    assert.ok(b.classeIds.length <= 2, 'un binôme couvre au plus deux classes');
    for (const p of profsDuBinome(etat, b)) {
      assert.ok(!profsVus.has(p.id), p.nom + ' appartient à un seul binôme');
      profsVus.add(p.id);
      for (const c of b.classeIds) assert.ok(classesDuProf(p).includes(c), p.nom + ' enseigne dans les classes de son binôme');
    }
  }
  const cases = new Set();
  for (const e of etat.eleves) {
    if (complet) {
      assert.ok(e.binomeId, e.nom + ' a un binôme');
      assert.ok(e.slot != null, e.nom + ' a un horaire');
    }
    if (!e.binomeId) continue;
    const b = trouverBinome(etat, e.binomeId);
    assert.ok(b.classeIds.includes(e.classeId), 'le binôme de ' + e.nom + ' reçoit sa classe');
    for (const p of profsDuBinome(etat, b)) assert.ok(dansEquipe(etat, p, e), p.nom + ' appartient à l’équipe de ' + e.nom + ' (V2-R2)');
    if (e.slot == null) continue;
    const cle = b.id + '|' + e.slot;
    assert.ok(!cases.has(cle), 'pas deux élèves sur le même créneau');
    cases.add(cle);
    const c = liste[e.slot];
    assert.ok(c, 'le créneau existe');
    assert.ok(familleDisponible(e, c), 'contraintes horaires de la famille respectées');
    for (const p of profsDuBinome(etat, b)) assert.ok(profDisponible(p, c), p.nom + ' est présent');
  }
}

/** Nombre d'élèves par binôme. */
export const charges = (etat) => etat.binomes.map((b) => etat.eleves.filter((e) => e.binomeId === b.id).length);
