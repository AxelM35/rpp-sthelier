// Calcul des créneaux de la soirée et des disponibilités.

import { versMinutes } from '../utils/texte.js';

/**
 * Liste des créneaux { d, f } (en minutes depuis minuit) entre le début et la fin de la soirée,
 * en sautant les pauses. Un créneau qui chevauche une pause reprend à la fin de celle-ci.
 */
export function creneaux(soiree) {
  const debut = versMinutes(soiree.debut);
  const fin = versMinutes(soiree.fin);
  const duree = Math.round(Number(soiree.duree));
  const liste = [];
  if (debut == null || fin == null || !(duree >= 1)) return liste;

  const pauses = soiree.pauses
    .map((p) => ({ d: versMinutes(p.debut), f: (versMinutes(p.debut) || 0) + (Number(p.duree) || 0) }))
    .filter((p) => p.d != null && p.f > p.d);

  let t = debut;
  for (let garde = 0; t + duree <= fin && garde < 2000; garde++) {
    const pause = pauses.find((p) => t < p.f && t + duree > p.d);
    if (pause) {
      t = pause.f;
      continue;
    }
    liste.push({ d: t, f: t + duree });
    t += duree;
  }
  return liste;
}

/** Le professeur est-il présent sur ce créneau (arrivée tardive, départ anticipé) ? */
export function profDisponible(prof, creneau) {
  const a = versMinutes(prof.dispoDe);
  const b = versMinutes(prof.dispoA);
  return (a == null || creneau.d >= a) && (b == null || creneau.f <= b);
}

/** La famille est-elle disponible sur ce créneau (contraintes « pas avant » / « pas après ») ? */
export function familleDisponible(eleve, creneau) {
  const a = versMinutes(eleve.pasAvant);
  const b = versMinutes(eleve.pasApres);
  return (a == null || creneau.d >= a) && (b == null || creneau.f <= b);
}

/** Pour chaque créneau, vrai si tous les professeurs donnés sont présents. */
export function disponibilites(profs, liste) {
  return liste.map((c) => profs.every((p) => profDisponible(p, c)));
}

/** Nombre de créneaux où les professeurs donnés sont tous présents. */
export function capacite(profs, liste) {
  return profs.length < 2 ? 0 : disponibilites(profs, liste).filter(Boolean).length;
}
