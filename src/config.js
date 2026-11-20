// Constantes métier et techniques, réunies ici pour être modifiées en un seul endroit.

/** Niveaux du collège. Chacun est une préparation indépendante, enregistrée à part. */
export const NIVEAUX = Object.freeze(['6e', '5e', '4e', '3e']);

/** Début des clés du stockage local : une clé par niveau (« rpp-v2-6e », « rpp-v2-6e-meta »…). */
export const PREFIXE_STOCKAGE = 'rpp-v2-';

/** Clé du stockage local de la version 1 (6e seulement), reprise au premier lancement de la version 2. */
export const CLE_STOCKAGE_V1 = 'rpp6-v1';

/** Version du format des données (sauvegardes et stockage local). */
export const VERSION_DONNEES = 3;

/**
 * Langues vivantes B et options d'une nouvelle préparation, par niveau. Ces listes sont modifiables
 * dans l'application et complétées par l'import des enseignants.
 */
export const LISTES_PAR_DEFAUT = Object.freeze({
  '6e': { lvb: [], options: ['Breton'] },
  '5e': { lvb: ['Espagnol', 'Allemand'], options: ['Breton'] },
  '4e': { lvb: ['Espagnol', 'Allemand'], options: ['Breton'] },
  '3e': { lvb: ['Espagnol', 'Allemand'], options: ['Breton'] },
});

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

/**
 * Lecture des exports Pronote (docs/import-pronote.md). Les matières sont comparées sans accents ni
 * différence de majuscules. Une matière absente de ces listes est présentée à l'import pour être classée ;
 * toute matière se terminant par « LV2 » est une LVB.
 */
export const PRONOTE = Object.freeze({
  /** Disciplines enseignées à toute la classe. */
  classeEntiere: Object.freeze([
    'FRANCAIS',
    'MATHEMATIQUES',
    'HISTOIRE-GEOGRAPHIE',
    'ENS. MORAL & CIVIQUE',
    'ANGLAIS LV1',
    'SCIENCES VIE & TERRE',
    'PHYSIQUE-CHIMIE',
    'TECHNOLOGIE',
    'ARTS PLASTIQUES',
    'EDUCATION MUSICALE',
    'ED.PHYSIQUE & SPORT.',
  ]),
  /** Options qui font entrer l'enseignant dans l'équipe des élèves qui les suivent. */
  options: Object.freeze(['BRETON', 'LCA LATIN', 'ATHLETISME']),
  /** Options et fonctions ignorées pour les binômes (décisions E1 et N1 du 20 novembre). */
  ignorees: Object.freeze([
    'O2',
    'ANGLAIS +',
    'MATHS +',
    'LLC ANGLAIS',
    'VIE DE CLASSE',
    'DEVOIRS FAITS',
    'ACCOMP. AUX DEVOIRS',
    'PARCOURS AVENIR',
    'CDI',
    'SUIVI INCLUSION',
  ]),
  /** Fonction qui écarte un enseignant des binômes, dans tout le fichier (coordination ULIS, décision E4). */
  exclusion: 'SUIVI INCLUSION',
  /** Noms affichés dans l'application. */
  noms: Object.freeze({
    'ESPAGNOL LV2': 'Espagnol',
    'ALLEMAND LV2': 'Allemand',
    BRETON: 'Breton',
    'BRETON REG.': 'Breton',
    'LCA LATIN': 'Latin',
    ATHLETISME: 'Athlétisme',
    'HISTOIRE-GEOGRAPHIE': 'Histoire-géographie',
  }),
});
