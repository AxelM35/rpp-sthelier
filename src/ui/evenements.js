// Branchement des événements de la page : délégation des clics, modifications, glisser-déposer, clavier.

import {
  actions,
  champs,
  CHAMPS_SANS_ENREGISTREMENT,
  CHAMPS_SANS_RENDU,
  deposerEleve,
  DIALOGUE_SEUL,
  SANS_ENREGISTREMENT,
} from './actions.js';
import { app } from './app.js';
import { $ } from './dom.js';
import { suivreAdresse } from './navigation.js';
import { ONGLETS, rendre } from './rendu.js';
import { enregistrer } from './stockage.js';

function surClic(ev) {
  const el = ev.target.closest('[data-action]');
  if (!el) {
    // Clic dans une zone vide (case du planning, colonne) pendant une sélection : on y dépose l'élève.
    const zone = ev.target.closest('[data-cible]');
    if (zone && app.ui.selection) {
      deposerEleve(app.ui.selection, zone.dataset.cible);
      app.ui.selection = null;
      rendre();
    }
    return;
  }
  const nom = el.dataset.action;
  if (!actions[nom]) return;
  actions[nom](el, ev);
  if (!SANS_ENREGISTREMENT.has(nom)) enregistrer();
  if (!DIALOGUE_SEUL.has(nom)) rendre();
}

function surModification(ev) {
  const el = ev.target.closest('[data-champ]');
  if (!el || !champs[el.dataset.champ]) return;
  const nom = el.dataset.champ;
  champs[nom](el, rendre);
  if (CHAMPS_SANS_RENDU.has(nom)) return;
  if (!CHAMPS_SANS_ENREGISTREMENT.has(nom)) enregistrer();
  setTimeout(rendre, 0); // laisse le navigateur déplacer le focus avant de reconstruire
}

function brancherGlisserDeposer() {
  const zone = (ev, attribut) => ev.target.closest && ev.target.closest('[' + attribut + ']');
  document.addEventListener('dragstart', (ev) => {
    const el = zone(ev, 'data-eleve');
    if (!el) return;
    ev.dataTransfer.setData('text/plain', el.dataset.eleve);
    ev.dataTransfer.effectAllowed = 'move';
  });
  document.addEventListener('dragover', (ev) => {
    const cible = zone(ev, 'data-cible');
    if (!cible) return;
    ev.preventDefault();
    cible.classList.add('over');
  });
  document.addEventListener('dragleave', (ev) => {
    const cible = zone(ev, 'data-cible');
    if (cible && !cible.contains(ev.relatedTarget)) cible.classList.remove('over');
  });
  document.addEventListener('drop', (ev) => {
    const cible = zone(ev, 'data-cible');
    if (!cible) return;
    ev.preventDefault();
    const id = ev.dataTransfer.getData('text/plain');
    if (!id) return;
    deposerEleve(id, cible.dataset.cible);
    app.ui.selection = null;
    rendre();
  });
}

function brancherClavier() {
  // Échap annule la sélection d'un élève.
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && app.ui.selection && !$('#dlg').open) {
      ev.preventDefault();
      actions.annulerSelection();
      rendre();
    }
  });
  // Onglets : flèches gauche/droite, Début, Fin (modèle ARIA « tablist »).
  $('#tabs').addEventListener('keydown', (ev) => {
    const n = ONGLETS.length;
    const i = ONGLETS.findIndex(([id]) => id === app.ui.onglet);
    const j = { ArrowRight: (i + 1) % n, ArrowLeft: (i - 1 + n) % n, Home: 0, End: n - 1 }[ev.key];
    if (j == null) return;
    ev.preventDefault();
    Object.assign(app.ui, { onglet: ONGLETS[j][0], message: null, selection: null, focus: 'action:onglet|' + ONGLETS[j][0] + '|' });
    rendre();
  });
}

export function brancherEvenements() {
  document.addEventListener('click', surClic);
  document.addEventListener('change', surModification);
  $('#dlg').addEventListener('close', () => (app.ui.import = null));
  // Bouton Précédent du navigateur ou adresse modifiée : accueil ou niveau inscrit dans l'adresse.
  window.addEventListener('hashchange', () => suivreAdresse() && rendre());
  // Lien d'évitement : déplace le focus sans modifier l'adresse (qui porte le niveau ouvert).
  $('.skip').addEventListener('click', (ev) => {
    ev.preventDefault();
    $('#main').focus();
  });
  brancherGlisserDeposer();
  brancherClavier();
}
