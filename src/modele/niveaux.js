// Niveaux du collège : résumé d'une préparation pour l'écran d'accueil, noms de fichiers.

import { aCorriger, controler } from '../algos/controles.js';
import { binomeComplet } from './acces.js';
import { dateDuJour, etatConservation } from './confidentialite.js';

/** Une préparation est vide tant que rien n'y a été saisi. */
export const preparationVide = (etat) =>
  !etat.classes.length && !etat.eleves.length && !etat.profs.length && !etat.binomes.length && !etat.soiree.date;

/**
 * Avancement d'une préparation, affiché sur sa carte de l'accueil :
 * { vide, date, eleves, profs, binomes (complets), planifies, points (à corriger), conservation }.
 */
export function resumerNiveau(etat, aujourdhui = dateDuJour()) {
  const vide = preparationVide(etat);
  return {
    vide,
    date: etat.soiree.date,
    eleves: etat.eleves.length,
    profs: etat.profs.length,
    binomes: etat.binomes.filter((b) => binomeComplet(etat, b)).length,
    planifies: etat.eleves.filter((e) => e.binomeId && e.slot != null).length,
    points: vide ? 0 : aCorriger(controler(etat)).length,
    conservation: etatConservation(etat, aujourdhui),
  };
}

/** Nom d'un fichier téléchargé, avec le niveau : « planning-rencontres-5e.xlsx ». */
export const nomFichier = (base, niveau, extension) => base + '-' + niveau + '.' + extension;

/** Chiffre du niveau, utilisé pour nommer une nouvelle classe (« 5 » pour la 5e). */
export const chiffreNiveau = (niveau) => niveau.replace(/\D/g, '');

/** « mardi 1 décembre 2026 » ou '' si la date n'est pas renseignée. */
export function dateEnClair(etat) {
  const d = etat.soiree.date;
  if (!d) return '';
  const x = new Date(d + 'T12:00');
  return isNaN(x) ? '' : x.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

/** Titre des documents et des exports, avec le niveau (V2-F9) : « Collège — Rencontres parents-professeurs de 5e — date ». */
export const titreSoiree = (etat) =>
  [etat.soiree.etab, 'Rencontres parents-professeurs de ' + etat.niveau, dateEnClair(etat)].filter(Boolean).join(' — ');
