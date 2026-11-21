// Aide au réglage de la soirée (onglet Soirée, carte « Capacité ») : quand les binômes possibles ne suffisent pas
// à recevoir tous les élèves, propose une durée de rendez-vous plus courte ou une heure de fin plus tardive.
//
// Le calcul suppose que tous les professeurs forment des binômes présents toute la soirée : c'est un minimum.
// Les équipes pédagogiques, les binômes limités à une LVB ou une option et les présences partielles peuvent
// demander davantage ; seule la génération des binômes donne le résultat exact.

import { DUREE_MIN, FIN_MAX_PROPOSEE } from '../config.js';
import { classesPossibles } from '../modele/acces.js';
import { versMinutes } from '../utils/texte.js';
import { creneaux } from './creneaux.js';

/** Pas des durées proposées : on propose une durée ronde (10 min plutôt que 12) quand c'est possible. */
const PAS_DUREE = 5;

/** Nombre de professeurs qui peuvent recevoir des familles (rattachés à au moins une classe). */
export const profsMobilisables = (etat) => etat.profs.filter((p) => classesPossibles(etat, p).length).length;

/** 1230 → « 20:30 », pour un champ de type « time ». */
const versHeure = (minutes) => String(Math.floor(minutes / 60)).padStart(2, '0') + ':' + String(minutes % 60).padStart(2, '0');

/**
 * Bilan de capacité et réglages proposés. Renvoie null s'il n'y a rien à calculer (pas d'élève, moins de deux
 * professeurs), sinon :
 *   { eleves, binomes, creneaux, besoin, suffit,
 *     duree: { minutes, creneaux } | null,   durée la plus longue qui suffit (multiple de 5, plus courte que l'actuelle)
 *     fin: { heure, creneaux } | null }       heure de fin la plus proche qui suffit, avec la durée actuelle
 * « besoin » est le nombre de créneaux qu'il faut au minimum à chaque binôme.
 */
export function bilanCapacite(etat) {
  const eleves = etat.eleves.length;
  const binomes = Math.floor(profsMobilisables(etat) / 2);
  if (!eleves || !binomes) return null;
  const soiree = etat.soiree;
  const nb = creneaux(soiree).length;
  const besoin = Math.ceil(eleves / binomes);
  const bilan = { eleves, binomes, creneaux: nb, besoin, suffit: nb >= besoin, duree: null, fin: null };
  if (bilan.suffit) return bilan;

  // Durée : le plus long multiple de 5 inférieur à la durée actuelle qui donne assez de créneaux.
  const actuelle = Math.round(Number(soiree.duree)) || 0;
  for (let d = Math.ceil(actuelle / PAS_DUREE) * PAS_DUREE - PAS_DUREE; d >= DUREE_MIN; d -= PAS_DUREE) {
    const k = creneaux({ ...soiree, duree: d }).length;
    if (k >= besoin) {
      bilan.duree = { minutes: d, creneaux: k };
      break;
    }
  }

  // Heure de fin : la fin du créneau qui atteint le besoin, avec la durée et les pauses actuelles.
  const debut = versMinutes(soiree.debut);
  const max = versMinutes(FIN_MAX_PROPOSEE);
  if (debut != null && actuelle >= 1) {
    const longue = creneaux({ ...soiree, fin: versHeure(max) });
    if (longue.length >= besoin) bilan.fin = { heure: versHeure(longue[besoin - 1].f), creneaux: besoin };
  }
  return bilan;
}
