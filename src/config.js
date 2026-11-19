// Constantes métier et techniques, réunies ici pour être modifiées en un seul endroit.

/** Clé du stockage local du navigateur. */
export const CLE_STOCKAGE = 'rpp6-v1';

/** Version du format des données (sauvegardes et stockage local). */
export const VERSION_DONNEES = 1;

/** Nombre maximal de classes reçues par un binôme (au-delà d'une : binôme « glissant »). */
export const CLASSES_MAX_PAR_BINOME = 2;

/** Écart maximal visé entre le binôme le plus chargé et le moins chargé. */
export const ECART_CHARGE_VISE = 2;

/** Nombre de constructions essayées par la proposition automatique des binômes. */
export const ESSAIS_PROPOSITION = 500;

/** Graine du générateur pseudo-aléatoire : une même situation donne toujours la même proposition. */
export const GRAINE_PROPOSITION = 61113;

/** Nombre de modifications que le bouton « Annuler » peut défaire. */
export const HISTORIQUE_MAX = 40;

/** Paramètres d'une soirée neuve. */
export const SOIREE_PAR_DEFAUT = Object.freeze({
  etab: '',
  date: '',
  debut: '17:00',
  fin: '20:00',
  duree: 15,
});

/**
 * Durée de conservation recommandée des données des élèves après la soirée, en jours.
 * Au-delà, l'application insiste pour qu'elles soient effacées. À ajuster avec le délégué
 * à la protection des données de l'établissement.
 */
export const CONSERVATION_JOURS = 30;
