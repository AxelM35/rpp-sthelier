// Affichage de l'onglet courant. Toute la zone principale est reconstruite à chaque changement ;
// le focus clavier est ensuite replacé sur l'élément équivalent.

import { controler, aCorriger } from '../algos/controles.js';
import { etatConservation } from '../modele/confidentialite.js';
import { nomClasse, nomEleve, trouverEleve } from '../modele/acces.js';
import { echapper } from '../utils/texte.js';
import { app } from './app.js';
import { $, annoncer, dateCourte } from './dom.js';
import { etatSauvegarde } from './stockage.js';
import { vueBinomes } from './vues/binomes.js';
import { vueDocuments } from './vues/documents.js';
import { vueDonnees } from './vues/donnees.js';
import { vuePlanning } from './vues/planning.js';
import { vueRepartition } from './vues/repartition.js';
import { vueSoiree } from './vues/soiree.js';

export const ONGLETS = [
  ['soiree', '1. Soirée', vueSoiree],
  ['donnees', '2. Données', vueDonnees],
  ['binomes', '3. Binômes', vueBinomes],
  ['repartition', '4. Répartition', vueRepartition],
  ['planning', '5. Planning', vuePlanning],
  ['documents', '6. Documents', vueDocuments],
];

/** Clé identifiant un élément interactif d'un rendu à l'autre. */
export function cleFocus(el) {
  if (!el || !el.dataset) return null;
  const d = el.dataset;
  const suite = (d.id || '') + '|' + (d.param || '');
  if (d.focus) return 'focus:' + d.focus;
  if (d.action) return 'action:' + d.action + '|' + suite;
  if (d.champ) return 'champ:' + d.champ + '|' + suite;
  return null;
}

function barreSelection() {
  const { etat, ui } = app;
  const e = ui.selection && trouverEleve(etat, ui.selection);
  if (!e || (ui.onglet !== 'repartition' && ui.onglet !== 'planning')) return '';
  return (
    '<div class="selbar"><span>Élève sélectionné : <b>' +
    echapper(nomEleve(e)) +
    '</b> (' +
    echapper(nomClasse(etat, e.classeId)) +
    '). ' +
    'Choisissez une destination « Placer ici »' +
    (ui.onglet === 'planning' ? ', ou un autre élève pour échanger les deux rendez-vous' : ', ou un élève de la colonne voulue') +
    '. Touche Échap pour annuler.</span><span class="sp"></span>' +
    '<button type="button" class="b" data-action="annulerSelection">Annuler la sélection</button></div>'
  );
}

/** Rappel d'effacement, affiché sur tous les onglets une fois la soirée passée. */
function rappelConservation() {
  const c = etatConservation(app.etat);
  if (!c) return '';
  return (
    '<div class="msg warn rappel"><span>' +
    (c.depassee
      ? 'La durée de conservation recommandée est dépassée depuis le ' +
        dateCourte(c.limite) +
        '. Effacez les données des élèves de ce navigateur.'
      : 'La soirée est passée. Pensez à effacer les données des élèves de ce navigateur, au plus tard le ' + dateCourte(c.limite) + '.') +
    '</span><button type="button" class="b" data-action="effacerDefinitivement">Effacer définitivement</button></div>'
  );
}

export function rendre() {
  const { ui } = app;
  const cle = ui.focus || cleFocus(document.activeElement);
  ui.focus = null;
  // Une comparaison n'a plus de sens si les données ont changé depuis.
  if (ui.comparaison && ui.comparaison.source !== JSON.stringify(app.etat)) ui.comparaison = null;
  const points = controler(app.etat);

  const nb = {};
  aCorriger(points).forEach((p) => (nb[p.onglet] = (nb[p.onglet] || 0) + 1));
  $('#tabs').innerHTML = ONGLETS.map(([id, titre]) => {
    const actif = ui.onglet === id;
    return (
      '<button type="button" role="tab" id="tab-' +
      id +
      '" aria-selected="' +
      actif +
      '" aria-controls="main" tabindex="' +
      (actif ? 0 : -1) +
      '" ' +
      'data-action="onglet" data-id="' +
      id +
      '" class="' +
      (actif ? 'on' : '') +
      '">' +
      titre +
      (nb[id] && id !== 'donnees' && id !== 'documents'
        ? '<span class="badge warn">' + nb[id] + '<span class="sr-only"> point(s) à corriger</span></span>'
        : '') +
      '</button>'
    );
  }).join('');
  $('#main').setAttribute('aria-labelledby', 'tab-' + ui.onglet);

  const sauvegarde = etatSauvegarde();
  $('#etatSauv').innerHTML = sauvegarde ? '<span class="badge ' + sauvegarde.niveau + '">' + echapper(sauvegarde.texte) + '</span>' : '';

  if (ui.message && ui.message !== ui.messageAnnonce) {
    ui.messageAnnonce = ui.message;
    annoncer(ui.message.txt);
  }
  const message = ui.message ? '<div class="msg ' + (ui.message.ok ? 'ok' : 'bad') + '">' + echapper(ui.message.txt) + '</div>' : '';
  const vue = ONGLETS.find(([id]) => id === ui.onglet)[2];
  $('#main').innerHTML = rappelConservation() + message + barreSelection() + vue(points);

  if (cle) {
    const cible = Array.from(document.querySelectorAll('[data-focus],[data-action],[data-champ]')).find((x) => cleFocus(x) === cle);
    if (cible && cible !== document.activeElement) cible.focus();
  }
}
