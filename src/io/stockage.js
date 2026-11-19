// Enregistrement des préparations de chaque niveau dans un stockage clé-valeur (le stockage local du navigateur).
//
// Le stockage est passé en paramètre : ce module n'utilise pas le navigateur et se teste avec Node.
// Interface attendue : { lire(cle) → texte | null, ecrire(cle, texte) → vrai si réussi, supprimer(cle), cles() → [cle…] }.
//
// Clés d'un niveau (PREFIXE_STOCKAGE + niveau) :
//   rpp-v2-6e           les données (état JSON)
//   rpp-v2-6e-meta      dates de dernière modification et de dernière sauvegarde en fichier
//   rpp-v2-6e-secours   données illisibles mises de côté au chargement

import { CLE_STOCKAGE_V1, PREFIXE_STOCKAGE } from '../config.js';
import { etatVide, valider } from '../modele/etat.js';
import { normaliser } from '../modele/normaliser.js';

/** Clés du stockage d'un niveau. */
export function clesNiveau(niveau) {
  const donnees = PREFIXE_STOCKAGE + niveau;
  return { donnees, meta: donnees + '-meta', secours: donnees + '-secours' };
}

const CLES_V1 = [CLE_STOCKAGE_V1, CLE_STOCKAGE_V1 + '-meta', CLE_STOCKAGE_V1 + '-secours'];

/**
 * Lit la préparation d'un niveau, sans rien modifier dans le stockage.
 * Renvoie { etat, present, illisible } : present vaut vrai si des données valides sont enregistrées ;
 * illisible contient le texte enregistré s'il n'a pas pu être lu (l'état renvoyé est alors vide).
 */
export function lireNiveau(stockage, niveau) {
  const brut = stockage.lire(clesNiveau(niveau).donnees);
  if (brut == null) return { etat: etatVide(niveau), present: false, illisible: null };
  try {
    const etat = valider(JSON.parse(brut));
    etat.niveau = niveau; // la clé fait foi
    return { etat: normaliser(etat), present: true, illisible: null };
  } catch {
    return { etat: etatVide(niveau), present: false, illisible: brut };
  }
}

/** Enregistre les données d'un niveau (texte JSON) ; renvoie faux si le stockage a refusé. */
export const enregistrerNiveau = (stockage, niveau, json) => stockage.ecrire(clesNiveau(niveau).donnees, json);

/** Met de côté des données illisibles, pour ne pas les écraser au premier enregistrement. */
export const mettreDeCote = (stockage, niveau, brut) => stockage.ecrire(clesNiveau(niveau).secours, brut);

/** Une copie de secours (données illisibles mises de côté) est-elle présente pour ce niveau ? */
export const copieDeSecours = (stockage, niveau) => stockage.lire(clesNiveau(niveau).secours) != null;

/** Efface toutes les clés d'un niveau : données, dates, copie de secours. */
export function effacerNiveau(stockage, niveau) {
  Object.values(clesNiveau(niveau)).forEach((cle) => stockage.supprimer(cle));
}

/** Efface toutes les données de l'application : tous les niveaux et d'éventuels restes de la version 1. */
export function effacerTout(stockage) {
  stockage
    .cles()
    .filter((cle) => cle.startsWith(PREFIXE_STOCKAGE) || CLES_V1.includes(cle))
    .forEach((cle) => stockage.supprimer(cle));
}

// Dates de dernière modification (modif) et de dernière sauvegarde en fichier (export), en millisecondes.
export function lireMeta(stockage, niveau) {
  try {
    const meta = JSON.parse(stockage.lire(clesNiveau(niveau).meta));
    return meta && typeof meta === 'object' ? meta : {};
  } catch {
    return {};
  }
}
export function noterMeta(stockage, niveau, champ, quand = Date.now()) {
  stockage.ecrire(clesNiveau(niveau).meta, JSON.stringify({ ...lireMeta(stockage, niveau), [champ]: quand }));
}

/**
 * État de la sauvegarde en fichier d'une préparation : { statut: 'ok' | 'warn', texte },
 * ou null s'il n'y a rien à sauvegarder (ni élève ni professeur).
 */
export function etatSauvegarde(meta, etat) {
  if (!etat.eleves.length && !etat.profs.length) return null;
  const date = (t) => new Date(t).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  if (!meta.export) return { statut: 'warn', texte: 'Pas encore sauvegardé dans un fichier' };
  if ((meta.modif || 0) > meta.export) return { statut: 'warn', texte: 'Modifié depuis la sauvegarde du ' + date(meta.export) };
  return { statut: 'ok', texte: 'Sauvegardé le ' + date(meta.export) };
}

/**
 * Reprise des données de la version 1, enregistrées sous CLE_STOCKAGE_V1 : elles deviennent le niveau 6e.
 * Les dates de sauvegarde et la copie de secours sont reprises, puis les anciennes clés sont supprimées.
 *
 * Renvoie :
 *   null         rien à reprendre (ou stockage plein : les anciennes clés sont alors laissées en place) ;
 *   'reprise'    données reprises dans le 6e ;
 *   'illisible'  données illisibles, mises de côté comme copie de secours du 6e ;
 *   'conflit'    le 6e contenait déjà des données : elles sont gardées, celles de la v1 sont mises de côté.
 */
export function reprendreDonneesV1(stockage) {
  const [cleDonnees, cleMeta, cleSecours] = CLES_V1;
  const brut = stockage.lire(cleDonnees);
  if (brut == null) return null;
  const cles = clesNiveau('6e');

  let resultat;
  let ecrit;
  if (stockage.lire(cles.donnees) != null) {
    resultat = 'conflit';
    ecrit = stockage.ecrire(cles.secours, brut);
  } else {
    let etat = null;
    try {
      etat = valider(JSON.parse(brut));
    } catch {
      /* données abîmées : mises de côté ci-dessous */
    }
    if (etat && etat.niveau === '6e') {
      resultat = 'reprise';
      ecrit = stockage.ecrire(cles.donnees, JSON.stringify(normaliser(etat)));
      const meta = stockage.lire(cleMeta);
      if (ecrit && meta != null) stockage.ecrire(cles.meta, meta);
    } else {
      resultat = 'illisible';
      ecrit = stockage.ecrire(cles.secours, brut);
    }
  }
  if (!ecrit) return null;

  // Ancienne copie de secours de la v1 : gardée si le 6e n'en a pas déjà une.
  const ancienSecours = stockage.lire(cleSecours);
  if (ancienSecours != null && stockage.lire(cles.secours) == null) stockage.ecrire(cles.secours, ancienSecours);
  CLES_V1.forEach((cle) => stockage.supprimer(cle));
  return resultat;
}
