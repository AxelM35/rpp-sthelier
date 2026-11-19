// Persistance dans le navigateur, niveau par niveau : chargement, enregistrement, annulation, effacement,
// suivi des sauvegardes en fichier. La logique des clés est dans io/stockage.js.

import { HISTORIQUE_MAX, NIVEAUX } from '../config.js';
import * as stockage from '../io/stockage.js';
import { etatVide } from '../modele/etat.js';
import { normaliser } from '../modele/normaliser.js';
import { app } from './app.js';

/** Stockage local du navigateur. S'il est indisponible (navigation privée…), l'application reste utilisable. */
const navigateur = {
  lire(cle) {
    try {
      return localStorage.getItem(cle);
    } catch {
      return null;
    }
  },
  ecrire(cle, valeur) {
    try {
      localStorage.setItem(cle, valeur);
      return true;
    } catch {
      return false;
    }
  },
  supprimer(cle) {
    try {
      localStorage.removeItem(cle);
    } catch {
      /* rien à effacer */
    }
  },
  cles() {
    try {
      return Object.keys(localStorage);
    } catch {
      return [];
    }
  },
};

// Pour chaque niveau : versions précédentes (pour « Annuler ») et dernière version enregistrée.
// L'historique d'un niveau est conservé quand on passe par l'accueil, jusqu'au rechargement de la page.
const historiques = Object.fromEntries(NIVEAUX.map((n) => [n, []]));
const derniers = {};

/** Reprend les données de la version 1 comme niveau 6e (voir io/stockage.js). */
export const reprendreDonneesV1 = () => stockage.reprendreDonneesV1(navigateur);

/** Lit la préparation d'un niveau sans l'ouvrir (résumés de l'accueil). */
export const lireNiveau = (niveau) => stockage.lireNiveau(navigateur, niveau).etat;

/** Ouvre la préparation d'un niveau ; des données illisibles sont mises de côté et le niveau repart à vide. */
export function ouvrirNiveau(niveau) {
  const { etat, illisible } = stockage.lireNiveau(navigateur, niveau);
  if (illisible != null) stockage.mettreDeCote(navigateur, niveau, illisible);
  app.niveau = niveau;
  app.etat = etat;
  derniers[niveau] = JSON.stringify(etat);
}

/** Retour à l'accueil : plus de niveau ouvert. */
export function fermerNiveau() {
  app.niveau = null;
  app.etat = null;
}

/** Remet l'état du niveau ouvert en cohérence, l'enregistre et mémorise la version précédente pour « Annuler ». */
export function enregistrer() {
  const niveau = app.niveau;
  if (!niveau) return;
  normaliser(app.etat);
  const json = JSON.stringify(app.etat);
  if (json !== derniers[niveau]) {
    stockage.noterMeta(navigateur, niveau, 'modif');
    const historique = historiques[niveau];
    historique.push(derniers[niveau]);
    if (historique.length > HISTORIQUE_MAX) historique.shift();
    derniers[niveau] = json;
  }
  stockage.enregistrerNiveau(navigateur, niveau, json);
}

/** Revient à la version précédente du niveau ouvert ; renvoie faux s'il n'y a rien à annuler. */
export function annulerDerniereModification() {
  const niveau = app.niveau;
  if (!niveau || !historiques[niveau].length) return false;
  derniers[niveau] = historiques[niveau].pop();
  app.etat = JSON.parse(derniers[niveau]);
  stockage.noterMeta(navigateur, niveau, 'modif');
  stockage.enregistrerNiveau(navigateur, niveau, derniers[niveau]);
  return true;
}

/** Une copie de secours (données illisibles mises de côté) est-elle présente pour ce niveau ? */
export const copieDeSecoursPresente = (niveau = app.niveau) => stockage.copieDeSecours(navigateur, niveau);

/**
 * Efface définitivement les données d'un niveau dans ce navigateur : état, copie de secours, dates de sauvegarde
 * et historique d'annulation. Contrairement à « Tout effacer », rien ne peut être rétabli.
 */
export function effacerNiveauDefinitivement(niveau) {
  stockage.effacerNiveau(navigateur, niveau);
  oublier(niveau);
}

/** Efface définitivement les données de tous les niveaux (et d'éventuels restes de la version 1). */
export function effacerToutDefinitivement() {
  stockage.effacerTout(navigateur);
  NIVEAUX.forEach(oublier);
}

function oublier(niveau) {
  historiques[niveau].length = 0;
  derniers[niveau] = JSON.stringify(etatVide(niveau));
  if (app.niveau === niveau) app.etat = etatVide(niveau);
}

/** Note la date de la dernière sauvegarde en fichier d'un niveau. */
export const noterSauvegardeFichier = (niveau = app.niveau) => stockage.noterMeta(navigateur, niveau, 'export');

/** État de la sauvegarde d'un niveau : { statut: 'ok' | 'warn', texte } ou null s'il n'y a rien à sauvegarder. */
export const etatSauvegarde = (niveau = app.niveau, etat = app.etat) =>
  stockage.etatSauvegarde(stockage.lireMeta(navigateur, niveau), etat);
