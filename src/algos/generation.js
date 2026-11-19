// Enchaînement complet : binômes, puis répartition, puis horaires.

import { proposerBinomes } from './binomes.js';
import { planifierHoraires } from './horaires.js';
import { repartirEleves } from './repartition.js';

/**
 * À partir d'un résultat de proposition de binômes { etat, rapport }, répartit les élèves et place les horaires.
 * Renvoie { etat, rapport } ; le rapport réunit les messages utiles des trois étapes.
 */
export function completerGeneration(b) {
  if (!b.rapport.ok && !b.etat.binomes.length) return b;
  const r = repartirEleves(b.etat);
  const h = planifierHoraires(r.etat);
  const ok = b.rapport.ok && r.rapport.ok && h.rapport.ok;
  const txt = [b.rapport.txt, r.rapport.ok ? '' : r.rapport.txt, h.rapport.txt].filter(Boolean).join(' ');
  return { etat: h.etat, rapport: { ok, txt } };
}

/** Propose les binômes puis complète la génération. */
export function genererTout(etatInitial, options) {
  return completerGeneration(proposerBinomes(etatInitial, options));
}
