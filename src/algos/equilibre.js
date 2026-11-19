// Mesure de l'équilibre des charges entre binômes.

import { binomeComplet, elevesDuBinome, profsDuBinome } from '../modele/acces.js';
import { capacite, creneaux } from './creneaux.js';

/**
 * Écart entre le binôme le plus chargé et le moins chargé.
 * charges : [{ n: élèves reçus, cap: créneaux disponibles }].
 * Les binômes déjà pleins (capacité réduite par une absence) ne comptent pas dans le minimum ;
 * « reduit » signale qu'il en existe.
 */
export function ecartCharges(charges) {
  if (!charges.length) return { min: 0, max: 0, ecart: 0, reduit: false };
  const max = Math.max(...charges.map((o) => o.n));
  const absolu = Math.min(...charges.map((o) => o.n));
  const ouverts = charges.filter((o) => o.n < o.cap).map((o) => o.n);
  const min = ouverts.length ? Math.min(...ouverts) : max;
  return { min, max, ecart: max - min, reduit: absolu < min };
}

/** Charges actuelles des binômes complets de l'état. */
export function chargesActuelles(etat) {
  const liste = creneaux(etat.soiree);
  return etat.binomes
    .filter((b) => binomeComplet(etat, b))
    .map((b) => ({ n: elevesDuBinome(etat, b).length, cap: capacite(profsDuBinome(etat, b), liste) }));
}
