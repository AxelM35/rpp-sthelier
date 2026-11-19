// Navigation entre l'écran d'accueil et la préparation d'un niveau.
//
// Le niveau ouvert est inscrit dans l'adresse de la page (« …html#5e ») : un rechargement garde le niveau,
// et le bouton « Précédent » du navigateur ramène à l'accueil. Sans niveau dans l'adresse, l'accueil s'affiche.

import { NIVEAUX } from '../config.js';
import { affichageParDefaut, app } from './app.js';
import { fermerNiveau, ouvrirNiveau } from './stockage.js';

/** Niveau inscrit dans l'adresse, ou null. */
export function niveauDeLAdresse() {
  const n = decodeURIComponent(location.hash.slice(1));
  return NIVEAUX.includes(n) ? n : null;
}

/** Ouvre la préparation d'un niveau. focus : placer le focus clavier sur le premier onglet. */
export function allerAuNiveau(niveau, { focus = false, message = null } = {}) {
  ouvrirNiveau(niveau);
  Object.assign(app.ui, affichageParDefaut(), { message });
  if (focus) app.ui.focus = 'action:onglet|soiree|';
  if (niveauDeLAdresse() !== niveau) location.hash = niveau;
}

/** Revient à l'écran d'accueil ; le focus revient sur la carte du niveau quitté. */
export function allerAAccueil({ message = null } = {}) {
  const quitte = app.niveau;
  fermerNiveau();
  Object.assign(app.ui, affichageParDefaut(), { message });
  if (quitte) app.ui.focus = 'action:ouvrirNiveau|' + quitte + '|';
  if (niveauDeLAdresse()) location.hash = '';
}

/** Suit un changement d'adresse (bouton Précédent, saisie) ; renvoie vrai si l'écran a changé. */
export function suivreAdresse() {
  const niveau = niveauDeLAdresse();
  // Une ancre qui n'est pas un niveau (lien interne) ne change pas d'écran.
  if (niveau === app.niveau || (!niveau && location.hash.length > 1)) return false;
  if (niveau) allerAuNiveau(niveau, { focus: true });
  else allerAAccueil();
  return true;
}
