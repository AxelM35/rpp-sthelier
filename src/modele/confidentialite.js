// Protection des données personnelles : durée de conservation après la soirée.

import { CONSERVATION_JOURS } from '../config.js';

/** Date locale du jour au format AAAA-MM-JJ. */
export function dateDuJour(maintenant = new Date()) {
  const deux = (n) => String(n).padStart(2, '0');
  return maintenant.getFullYear() + '-' + deux(maintenant.getMonth() + 1) + '-' + deux(maintenant.getDate());
}

/** Ajoute des jours à une date AAAA-MM-JJ (calcul en temps universel, sans effet des changements d'heure). */
export function ajouterJours(date, jours) {
  const [a, m, j] = date.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, j + jours)).toISOString().slice(0, 10);
}

/**
 * Situation des données une fois la soirée passée, ou null s'il n'y a rien à signaler
 * (pas de date, pas d'élève, ou soirée à venir / en cours aujourd'hui).
 * Renvoie { limite: date d'effacement recommandée, depassee: la limite est dépassée }.
 */
export function etatConservation(etat, aujourdhui = dateDuJour()) {
  const date = etat.soiree.date;
  if (!date || !etat.eleves.length || aujourdhui <= date) return null;
  const limite = ajouterJours(date, CONSERVATION_JOURS);
  return { limite, depassee: aujourdhui > limite };
}
