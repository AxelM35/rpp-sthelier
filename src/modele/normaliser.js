// Remise en cohérence après une modification manuelle (suppression d'une classe, horaires changés…).

import { creneaux } from '../algos/creneaux.js';
import { trouverBinome, trouverClasse, trouverProf } from './acces.js';

/**
 * Supprime les références orphelines et les horaires devenus impossibles.
 * Modifie l'état reçu et le renvoie.
 */
export function normaliser(etat) {
  const nbCreneaux = creneaux(etat.soiree).length;
  etat.eleves = etat.eleves.filter((e) => trouverClasse(etat, e.classeId));
  etat.profs.forEach((p) => (p.classeIds = p.classeIds.filter((id) => trouverClasse(etat, id))));
  etat.binomes.forEach((b) => {
    b.profIds = [0, 1].map((i) => (trouverProf(etat, b.profIds[i]) ? b.profIds[i] : null));
    b.classeIds = b.classeIds.filter((id) => trouverClasse(etat, id));
  });
  etat.eleves.forEach((e) => {
    if (e.binomeId && !trouverBinome(etat, e.binomeId)) {
      e.binomeId = null;
      e.slot = null;
    }
    if (e.slot != null && (e.slot >= nbCreneaux || !e.binomeId)) e.slot = null;
    if (e.slot == null) e.verrou = false;
  });
  return etat;
}
