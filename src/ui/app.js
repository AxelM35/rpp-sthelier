// État courant de l'application, partagé par les modules d'interface.
//
// app.etat : les données (voir modele/etat.js), sauvegardées dans le navigateur.
// app.ui   : l'état d'affichage, jamais sauvegardé.

export const app = {
  etat: null,
  ui: {
    onglet: 'soiree',
    vuePlanning: 'general', // general | classe | binome
    filtreDonnees: '', // id de classe ou '' (toutes)
    filtreRepartition: '',
    filtrePlanning: '',
    selection: null, // id de l'élève sélectionné pour un déplacement
    document: 'general', // document affiché dans l'onglet Documents
    compact: false, // colonnes compactes dans le planning
    message: null, // { ok, txt } affiché en haut de l'onglet
    messageAnnonce: null, // dernier message lu par les lecteurs d'écran
    import: null, // dialogue d'import en cours
    focus: null, // élément à focaliser au prochain rendu
  },
};
