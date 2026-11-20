// Dialogue « Enseignement d'un professeur dans une classe » : toute la classe, une LVB (avec ou sans les élèves
// ULIS), une option, toute la classe sauf une option, ou aucun enseignement.

import { enseignementDans, trouverClasse, trouverProf } from '../modele/acces.js';
import { echapper } from '../utils/texte.js';
import { app } from './app.js';
import { $ } from './dom.js';

/** Ouvre le dialogue pour le professeur et la classe donnés. */
export function ouvrirEnseignement(profId, classeId) {
  app.ui.enseignement = { profId, classeId };
  afficherEnseignement();
}

export function fermerEnseignement() {
  app.ui.enseignement = null;
  const dialogue = $('#dlg');
  if (dialogue.open) dialogue.close();
}

/** Choix fait dans le dialogue : { type, refId, sansUlis } ou null (aucun enseignement). */
export function lireChoix() {
  const coche = $('#dlg input[name="typeEns"]:checked');
  if (!coche || coche.value === 'aucun') return null;
  const [type, refId = null] = coche.value.split(':');
  return { type, refId, sansUlis: type === 'lvb' && $('#ensSansUlis').checked };
}

function afficherEnseignement() {
  const { etat } = app;
  const { profId, classeId } = app.ui.enseignement;
  const p = trouverProf(etat, profId);
  const c = trouverClasse(etat, classeId);
  const x = enseignementDans(p, classeId);
  const actuel = x ? x.type + (x.refId ? ':' + x.refId : '') : 'aucun';
  const choix = (valeur, texte) =>
    '<label class="choix"><input type="radio" name="typeEns" value="' +
    valeur +
    '"' +
    (valeur === actuel ? ' checked' : '') +
    '><span>' +
    texte +
    '</span></label>';
  // Une catégorie de choix (LVB, options, « sauf ») : titre, explication, choix côte à côte.
  const categorie = (titre, explication, liste, prefixe, texte) =>
    liste.length
      ? '<div class="categorie-choix"><p class="titre-choix">' +
        titre +
        ' <small>' +
        explication +
        '</small></p><div class="choix-ligne">' +
        liste.map((x) => choix(prefixe + x.id, texte(echapper(x.nom)))).join('') +
        '</div></div>'
      : '';
  const h =
    '<h2 id="dlgTitre">' +
    echapper(p.nom || '(sans nom)') +
    ' en ' +
    echapper(c.nom) +
    '</h2>' +
    '<fieldset class="choix-enseignement"><legend>Élèves de la classe que ce professeur a en cours</legend>' +
    choix('classe', 'Toute la classe') +
    categorie('LVB', 'les élèves qui suivent cette LVB', etat.lvb, 'lvb:', (nom) => nom) +
    categorie('Option', 'les élèves qui suivent cette option', etat.options, 'option:', (nom) => nom) +
    categorie(
      'Toute la classe sauf une option',
      'discipline partagée, par exemple l’histoire-géographie enseignée en breton aux bilingues',
      etat.options,
      'sauf:',
      (nom) => 'sauf ' + nom,
    ) +
    choix('aucun', "N'enseigne pas dans cette classe") +
    '</fieldset>' +
    (etat.lvb.length
      ? '<p><label><input type="checkbox" id="ensSansUlis"' +
        (x && x.type === 'lvb' && x.sansUlis ? ' checked' : '') +
        '> Pour une LVB : n’a pas en cours les élèves ULIS de la classe</label></p>'
      : '') +
    (c.ppId === p.id
      ? '<p class="note">Professeur principal de la classe : il peut recevoir tous ses élèves, quel que soit ce choix.</p>'
      : '') +
    '<div class="row" style="margin-top:10px"><span class="sp"></span>' +
    '<button type="button" class="b" data-action="fermerEnseignement">Annuler</button>' +
    '<button type="button" class="b p" data-action="validerEnseignement">Valider</button></div>';
  const dialogue = $('#dlg');
  dialogue.innerHTML = h;
  if (!dialogue.open) dialogue.showModal();
  const coche = dialogue.querySelector('input[name="typeEns"]:checked');
  if (coche) coche.focus();
}
