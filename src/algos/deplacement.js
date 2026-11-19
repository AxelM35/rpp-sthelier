// Déplacement manuel d'un élève (glisser-déposer, clavier).

import { trouverEleve } from '../modele/acces.js';
import { copierEtat } from '../modele/etat.js';

/**
 * Place un élève chez un binôme (binomeId null : non affecté), sur un créneau ou sans horaire.
 * Si le créneau est occupé, les deux rendez-vous sont échangés ; un rendez-vous verrouillé n'est jamais déplacé.
 * Renvoie { etat, refus } : refus contient la raison si le déplacement est impossible.
 */
export function deplacerEleve(etatInitial, eleveId, binomeId, slot) {
  const etat = copierEtat(etatInitial);
  const e = trouverEleve(etat, eleveId);
  if (!e) return { etat: etatInitial, refus: 'Élève introuvable.' };
  if (slot != null) {
    const occupant = etat.eleves.find((x) => x.id !== eleveId && x.binomeId === binomeId && x.slot === slot);
    if (occupant) {
      if (occupant.verrou) return { etat: etatInitial, refus: 'Ce rendez-vous est verrouillé.' };
      if (e.binomeId && e.slot != null) {
        occupant.binomeId = e.binomeId;
        occupant.slot = e.slot;
      } else {
        occupant.slot = null;
      }
    }
  }
  e.binomeId = binomeId;
  e.slot = binomeId ? slot : null;
  if (e.slot == null) e.verrou = false;
  return { etat, refus: null };
}

/**
 * Interprète une cible de dépôt de l'interface :
 * « none » (non affecté), « bin:ID » (chez un binôme, sans horaire) ou « cell:ID:N » (créneau N).
 */
export function deposer(etat, eleveId, cible) {
  const [type, binomeId, slot] = cible.split(':');
  const e = trouverEleve(etat, eleveId);
  if (!e) return { etat, refus: null };
  if (type === 'none') return deplacerEleve(etat, eleveId, null, null);
  if (type === 'bin') {
    if (e.binomeId === binomeId && e.slot == null) return { etat, refus: null };
    return deplacerEleve(etat, eleveId, binomeId, null);
  }
  return deplacerEleve(etat, eleveId, binomeId, Number(slot));
}
