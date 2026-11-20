// Mesure de l'équilibre des charges entre binômes.

import { binomeComplet, elevesDuBinome, profsDuBinome } from '../modele/acces.js';
import { capacite, creneaux } from './creneaux.js';
import { binomeLimite } from './groupes.js';

/**
 * Écart entre le binôme le plus chargé et le moins chargé.
 * charges : [{ n: élèves reçus, cap: créneaux disponibles, limite: binôme limité à une LVB ou une option }].
 * Les binômes déjà pleins (capacité réduite par une absence) ne comptent pas dans le minimum ;
 * « reduit » signale qu'il en existe. Les binômes limités à un groupe (LVB, option) ne comptent pas du tout,
 * sauf s'ils sont les seuls (décision du 20 novembre, question 4a) ; « limites » donne leur nombre.
 */
export function ecartCharges(charges) {
  if (!charges.length) return { min: 0, max: 0, ecart: 0, reduit: false, limites: 0 };
  const comptes = charges.filter((o) => !o.limite);
  const base = comptes.length ? comptes : charges;
  const max = Math.max(...base.map((o) => o.n));
  const absolu = Math.min(...base.map((o) => o.n));
  const ouverts = base.filter((o) => o.n < o.cap).map((o) => o.n);
  const min = ouverts.length ? Math.min(...ouverts) : max;
  return { min, max, ecart: max - min, reduit: absolu < min, limites: charges.length - comptes.length };
}

/** Charges actuelles des binômes complets de l'état. */
export function chargesActuelles(etat) {
  const liste = creneaux(etat.soiree);
  return etat.binomes
    .filter((b) => binomeComplet(etat, b))
    .map((b) => ({
      n: elevesDuBinome(etat, b).length,
      cap: capacite(profsDuBinome(etat, b), liste),
      limite: binomeLimite(etat, profsDuBinome(etat, b), b.classeIds),
    }));
}
