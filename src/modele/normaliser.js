// Remise en cohérence après une modification manuelle (suppression d'une classe, d'une LVB ou d'une option,
// d'un professeur, horaires changés…).

import { creneaux } from '../algos/creneaux.js';
import { trouverBinome, trouverClasse, trouverProf } from './acces.js';
import { validerEnseignements } from './etat.js';

/**
 * Supprime les références orphelines et les horaires devenus impossibles.
 * Modifie l'état reçu et le renvoie.
 */
export function normaliser(etat) {
  const nbCreneaux = creneaux(etat.soiree).length;
  etat.eleves = etat.eleves.filter((e) => trouverClasse(etat, e.classeId));
  const classes = new Set(etat.classes.map((c) => c.id));
  const lvb = new Set(etat.lvb.map((x) => x.id));
  const options = new Set(etat.options.map((x) => x.id));
  etat.profs.forEach((p) => (p.enseignements = validerEnseignements(p.enseignements, { classes, lvb, options })));
  etat.classes.forEach((c) => {
    if (c.ppId && !trouverProf(etat, c.ppId)) c.ppId = null;
  });
  etat.binomes.forEach((b) => {
    b.profIds = [0, 1].map((i) => (trouverProf(etat, b.profIds[i]) ? b.profIds[i] : null));
    b.classeIds = b.classeIds.filter((id) => trouverClasse(etat, id));
  });
  etat.eleves.forEach((e) => {
    if (e.lvbId && !lvb.has(e.lvbId)) e.lvbId = null;
    e.optionIds = e.optionIds.filter((o) => options.has(o));
    if (e.binomeId && !trouverBinome(etat, e.binomeId)) {
      e.binomeId = null;
      e.slot = null;
    }
    if (e.slot != null && (e.slot >= nbCreneaux || !e.binomeId)) e.slot = null;
    if (e.slot == null) e.verrou = false;
  });
  return etat;
}
