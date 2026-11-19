// Enchaînement complet : binômes, puis répartition, puis horaires.

import { proposerBinomes } from './binomes.js';
import { planifierHoraires } from './horaires.js';
import { repartirEleves } from './repartition.js';

/** Renvoie { etat, rapport } ; le rapport réunit les messages utiles des trois étapes. */
export function genererTout(etatInitial, options) {
  const b = proposerBinomes(etatInitial, options);
  if (!b.rapport.ok && !b.etat.binomes.length) return b;
  const r = repartirEleves(b.etat);
  const h = planifierHoraires(r.etat);
  const ok = b.rapport.ok && r.rapport.ok && h.rapport.ok;
  const txt = [b.rapport.txt, r.rapport.ok ? '' : r.rapport.txt, h.rapport.txt].filter(Boolean).join(' ');
  return { etat: h.etat, rapport: { ok, txt } };
}
