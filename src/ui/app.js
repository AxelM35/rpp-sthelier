// État courant de l'application, partagé par les modules d'interface.
//
// app.niveau : niveau ouvert ('6e'…), ou null sur l'écran d'accueil.
// app.etat   : les données du niveau ouvert (voir modele/etat.js), sauvegardées dans le navigateur ; null sur l'accueil.
// app.ui     : l'état d'affichage, jamais sauvegardé.

/** État d'affichage d'un niveau, remis à zéro à chaque changement d'écran. */
export const affichageParDefaut = () => ({
  onglet: 'soiree',
  vuePlanning: 'general', // general | classe | binome
  filtreDonnees: '', // id de classe ou '' (toutes)
  filtreRepartition: '',
  filtrePlanning: '',
  selection: null, // id de l'élève sélectionné pour un déplacement
  document: 'general', // document affiché dans l'onglet Documents
  compact: false, // colonnes compactes dans le planning
  message: null, // { ok, txt } affiché en haut de l'onglet ou de l'accueil
  import: null, // dialogue d'import en cours
  enseignement: null, // { profId, classeId } : dialogue de choix d'un enseignement en cours
  comparaison: null, // { source: état comparé (JSON), variantes } — propositions de binômes affichées
});

export const app = {
  niveau: null,
  etat: null,
  ui: {
    ...affichageParDefaut(),
    messageAnnonce: null, // dernier message lu par les lecteurs d'écran
    focus: null, // élément à focaliser au prochain rendu
  },
};
