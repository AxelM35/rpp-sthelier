// Persistance dans le navigateur, historique d'annulation et suivi des sauvegardes en fichier.

import { CLE_STOCKAGE, HISTORIQUE_MAX } from '../config.js';
import { etatVide, valider } from '../modele/etat.js';
import { normaliser } from '../modele/normaliser.js';
import { app } from './app.js';

const CLE_META = CLE_STOCKAGE + '-meta';
const CLE_SECOURS = CLE_STOCKAGE + '-secours';

const historique = [];
let dernierEnregistre = null;

function lireStockage(cle) {
  try {
    return localStorage.getItem(cle);
  } catch {
    return null;
  }
}
function ecrireStockage(cle, valeur) {
  try {
    localStorage.setItem(cle, valeur);
  } catch {
    /* stockage indisponible (navigation privée…) : l'application reste utilisable */
  }
}

/** Charge l'état enregistré ; une donnée illisible est mise de côté et l'application repart à vide. */
export function chargerEtat() {
  const brut = lireStockage(CLE_STOCKAGE);
  let etat = etatVide();
  if (brut) {
    try {
      etat = valider(JSON.parse(brut));
    } catch {
      ecrireStockage(CLE_SECOURS, brut);
    }
  }
  app.etat = etat;
  dernierEnregistre = JSON.stringify(etat);
  return etat;
}

/** Remet l'état en cohérence, l'enregistre et mémorise la version précédente pour « Annuler ». */
export function enregistrer() {
  normaliser(app.etat);
  const json = JSON.stringify(app.etat);
  if (json !== dernierEnregistre) {
    noterModification();
    historique.push(dernierEnregistre);
    if (historique.length > HISTORIQUE_MAX) historique.shift();
    dernierEnregistre = json;
  }
  ecrireStockage(CLE_STOCKAGE, json);
}

/** Revient à la version précédente ; renvoie faux s'il n'y a rien à annuler. */
export function annulerDerniereModification() {
  if (!historique.length) return false;
  dernierEnregistre = historique.pop();
  app.etat = JSON.parse(dernierEnregistre);
  noterModification();
  ecrireStockage(CLE_STOCKAGE, dernierEnregistre);
  return true;
}

// Dates de dernière modification et de dernière sauvegarde en fichier.
function lireMeta() {
  try {
    return JSON.parse(lireStockage(CLE_META)) || {};
  } catch {
    return {};
  }
}
function noterModification() {
  ecrireStockage(CLE_META, JSON.stringify({ ...lireMeta(), modif: Date.now() }));
}
export function noterSauvegardeFichier() {
  ecrireStockage(CLE_META, JSON.stringify({ ...lireMeta(), export: Date.now() }));
}

/** État de la sauvegarde pour l'en-tête : { niveau: 'ok' | 'warn', texte } ou null s'il n'y a rien à sauvegarder. */
export function etatSauvegarde() {
  const m = lireMeta();
  const date = (t) => new Date(t).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  if (!app.etat.eleves.length && !app.etat.profs.length) return null;
  if (!m.export) return { niveau: 'warn', texte: 'Pas encore sauvegardé dans un fichier' };
  if ((m.modif || 0) > m.export) return { niveau: 'warn', texte: 'Modifié depuis la sauvegarde du ' + date(m.export) };
  return { niveau: 'ok', texte: 'Sauvegardé le ' + date(m.export) };
}
