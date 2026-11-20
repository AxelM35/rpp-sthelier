// Fragments HTML réutilisés par plusieurs vues.
//
// Conventions des attributs (lus par ui/evenements.js) :
//   data-action="nom"  bouton qui déclenche actions[nom] au clic
//   data-champ="nom"   champ qui déclenche champs[nom] à la modification
//   data-id, data-param  paramètres de l'action ou du champ
//   data-cible         zone où l'on peut déposer un élève (none | bin:ID | cell:ID:N)
//   data-eleve         vignette d'élève déplaçable

import { creneaux } from '../algos/creneaux.js';
import { nomClasse, nomEleve, profsDuBinome } from '../modele/acces.js';
import { dansEquipe } from '../modele/equipe.js';
import { echapper, formaterHeure } from '../utils/texte.js';
import { app } from './app.js';

/** Attribut aria-label échappé. */
export const aria = (texte) => 'aria-label="' + echapper(texte) + '"';

/** Petit bouton ✕ de suppression. */
export const boutonSupprimer = (action, id, libelle) =>
  '<button type="button" class="x" data-action="' +
  action +
  '" data-id="' +
  id +
  '" ' +
  aria(libelle) +
  ' title="' +
  echapper(libelle) +
  '">✕</button>';

/** Champ de saisie relié à champs[nom] ; data-focus permet de retrouver le focus après rendu. */
export function champ(nom, id, param, valeur, type = 'text', extra = '') {
  return (
    '<input type="' +
    type +
    '" data-champ="' +
    nom +
    '" data-id="' +
    id +
    '" data-param="' +
    param +
    '" ' +
    'data-focus="' +
    nom +
    '|' +
    id +
    '|' +
    param +
    '" value="' +
    echapper(valeur) +
    '" ' +
    extra +
    '>'
  );
}

/** Liste déroulante des classes (avec « Toutes les classes » en tête si demandé). */
export function optionsClasses(classes, choisie, avecToutes = false) {
  return (
    (avecToutes ? '<option value="">Toutes les classes</option>' : '') +
    classes
      .map((c) => '<option value="' + c.id + '"' + (c.id === choisie ? ' selected' : '') + '>' + echapper(c.nom) + '</option>')
      .join('')
  );
}

export const ICONES = {
  cadenasFerme:
    '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">' +
    '<rect x="3" y="7" width="10" height="7" rx="1.5" fill="currentColor"/>' +
    '<path d="M5.2 7V5a2.8 2.8 0 0 1 5.6 0v2" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
  cadenasOuvert:
    '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">' +
    '<rect x="3" y="7" width="10" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.4"/>' +
    '<path d="M5.2 7V5a2.8 2.8 0 0 1 5.5-.7" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
};

const LIBELLES_NIVEAU = { bloquant: 'Bloquant', avertissement: 'À corriger', info: 'Info' };
const CLASSE_NIVEAU = { bloquant: 'bad', avertissement: 'warn', info: '' };

/** Encadré « Contrôles » listant les points des onglets demandés. */
export function blocControles(points, onglets) {
  const liste = points.filter((p) => onglets.includes(p.onglet));
  if (!liste.length) return '<div class="msg ok">Aucun conflit ni avertissement.</div>';
  return (
    '<div class="card"><h2>Contrôles (' +
    liste.length +
    ')</h2><ul class="diag">' +
    liste
      .map(
        (p) =>
          '<li><span class="badge ' +
          CLASSE_NIVEAU[p.niveau] +
          '">' +
          LIBELLES_NIVEAU[p.niveau] +
          '</span><span>' +
          echapper(p.texte) +
          '</span></li>',
      )
      .join('') +
    '</ul></div>'
  );
}

/**
 * Vignette d'un élève, déplaçable à la souris et sélectionnable au clavier.
 * b : binôme qui l'accueille (pour signaler une classe non reçue ou un professeur qui n'a pas l'élève en cours) ;
 * extra : HTML ajouté (cadenas).
 */
export function vignetteEleve(e, b, extra = '') {
  const { etat, ui } = app;
  const horsClasse = b && !b.classeIds.includes(e.classeId);
  const horsEquipe = b && !horsClasse && profsDuBinome(etat, b).some((p) => !dansEquipe(etat, p, e));
  const alerte = horsClasse ? 'Classe non reçue par ce binôme' : horsEquipe ? "Un professeur du binôme n'a pas cet élève en cours" : '';
  const choisi = ui.selection === e.id;
  const liste = creneaux(etat.soiree);
  const heure = b && e.slot != null && liste[e.slot] ? formaterHeure(liste[e.slot].d) : '';
  const libelle =
    nomEleve(e) +
    ', ' +
    nomClasse(etat, e.classeId) +
    (heure ? ', ' + heure : '') +
    (e.verrou ? ', verrouillé' : '') +
    (alerte ? ', attention : ' + alerte.charAt(0).toLowerCase() + alerte.slice(1) : '') +
    (choisi
      ? ', sélectionné'
      : ui.selection
        ? '. Choisir pour ' + (ui.onglet === 'planning' && e.slot != null ? 'échanger avec' : 'déplacer ici') + " l'élève sélectionné"
        : '. Sélectionner pour déplacer');
  return (
    '<div class="el' +
    (choisi ? ' sel' : '') +
    (alerte ? ' pb' : '') +
    '" draggable="true" data-eleve="' +
    e.id +
    '">' +
    '<button type="button" class="el-btn" data-action="selectionner" data-id="' +
    e.id +
    '" aria-pressed="' +
    choisi +
    '" ' +
    aria(libelle) +
    '>' +
    '<span>' +
    echapper(nomEleve(e)) +
    '</span>' +
    (alerte ? '<span class="alerte" aria-hidden="true" title="' + echapper(alerte) + '">!</span>' : '') +
    '<small>' +
    echapper(nomClasse(etat, e.classeId)) +
    '</small></button>' +
    extra +
    '</div>'
  );
}
