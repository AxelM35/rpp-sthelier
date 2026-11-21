// Onglet 5 : planning (grille générale, vue par classe, vue par binôme).

import { creneaux, disponibilites } from '../../algos/creneaux.js';
import {
  classesDuBinome,
  classesTriees,
  codeBinome,
  comparerEleves,
  libelleBinome,
  nomEleve,
  profsDuBinome,
  trouverEleve,
} from '../../modele/acces.js';
import { echapper, formaterHeure } from '../../utils/texte.js';
import { app } from '../app.js';
import { aria, blocControles, caseLvbOptions, ICONES, optionsClasses, vignetteEleve } from '../composants.js';
import { documentParBinome, documentParClasse } from '../documents.js';

function boutonCadenas(e) {
  return (
    '<button type="button" class="lock' +
    (e.verrou ? ' on' : '') +
    '" data-action="basculerVerrou" data-id="' +
    e.id +
    '" aria-pressed="' +
    Boolean(e.verrou) +
    '" ' +
    aria('Verrouiller le rendez-vous de ' + nomEleve(e)) +
    ' title="' +
    (e.verrou ? 'Rendez-vous verrouillé : cliquer pour déverrouiller' : 'Verrouiller ce rendez-vous') +
    '">' +
    (e.verrou ? ICONES.cadenasFerme : ICONES.cadenasOuvert) +
    '</button>'
  );
}

function grille(filtre) {
  const { etat, ui } = app;
  const liste = creneaux(etat.soiree);
  const binomes = etat.binomes.filter((b) => !filtre || b.classeIds.includes(filtre));
  if (!binomes.length) return '<div class="msg warn">Créez d\'abord des binômes (onglet 3).</div>';
  const choisi = ui.selection && trouverEleve(etat, ui.selection);
  const nomChoisi = choisi ? nomEleve(choisi) : '';
  const presents = {};
  binomes.forEach((b) => (presents[b.id] = disponibilites(profsDuBinome(etat, b), liste)));
  const parCase = {};
  etat.eleves.forEach((e) => {
    if (e.binomeId && e.slot != null) parCase[e.binomeId + '|' + e.slot] = e;
  });
  const placer = (cible, libelle) =>
    '<button type="button" class="dest" data-action="placer" data-id="' + cible + '" ' + aria(libelle) + '>Placer ici</button>';

  let h =
    (ui.compact
      ? '<div class="legende"><b>Binômes :</b>' +
        binomes
          .map((b) => '<span><span class="code">' + codeBinome(etat, b) + '</span> ' + echapper(libelleBinome(etat, b)) + '</span>')
          .join('') +
        '</div>'
      : '') +
    '<div class="scroll"><table class="pl"><caption class="sr-only">Planning général : une ligne par créneau, une colonne par binôme</caption><tr><th scope="col">Heure</th>' +
    binomes
      .map(
        (b) =>
          '<th scope="col"><span class="code">' +
          codeBinome(etat, b) +
          '</span>' +
          (ui.compact ? '' : ' ' + echapper(libelleBinome(etat, b))) +
          '<br><span class="muted">' +
          echapper(classesDuBinome(etat, b)) +
          (b.salle ? ' · salle ' + echapper(b.salle) : '') +
          '</span></th>',
      )
      .join('') +
    '</tr>';

  liste.forEach((c, i) => {
    if (i && c.d !== liste[i - 1].f) {
      h +=
        '<tr class="pause"><td colspan="' +
        (binomes.length + 1) +
        '">Pause ' +
        formaterHeure(liste[i - 1].f) +
        ' – ' +
        formaterHeure(c.d) +
        '</td></tr>';
    }
    h +=
      '<tr><th scope="row">' +
      formaterHeure(c.d) +
      '</th>' +
      binomes
        .map((b) => {
          const e = parCase[b.id + '|' + i];
          const present = presents[b.id][i];
          let contenu = '';
          if (e) contenu = vignetteEleve(e, b, boutonCadenas(e));
          else if (choisi)
            contenu = placer(
              'cell:' + b.id + ':' + i,
              'Placer ' +
                nomChoisi +
                ' à ' +
                formaterHeure(c.d) +
                ', binôme ' +
                codeBinome(etat, b) +
                (present ? '' : ' (professeur absent)'),
            );
          else if (!present) contenu = '<span class="sr-only">Professeur absent</span>';
          return '<td class="' + (present ? '' : 'indispo') + '" data-cible="cell:' + b.id + ':' + i + '">' + contenu + '</td>';
        })
        .join('') +
      '</tr>';
  });

  h +=
    '<tr><th scope="row">Sans horaire</th>' +
    binomes
      .map(
        (b) =>
          '<td data-cible="bin:' +
          b.id +
          '">' +
          (choisi && !(choisi.binomeId === b.id && choisi.slot == null)
            ? placer('bin:' + b.id, 'Placer ' + nomChoisi + ' sans horaire chez le binôme ' + codeBinome(etat, b))
            : '') +
          etat.eleves
            .filter((e) => e.binomeId === b.id && e.slot == null)
            .sort(comparerEleves)
            .map((e) => vignetteEleve(e, b))
            .join('') +
          '</td>',
      )
      .join('') +
    '</tr>';
  return h + '</table></div>';
}

export function vuePlanning(points) {
  const { etat, ui } = app;
  const filtre = ui.filtrePlanning;
  const vues = [
    ['general', 'Vue générale'],
    ['classe', 'Par classe'],
    ['binome', 'Par binôme'],
  ];
  let h =
    '<div class="card"><div class="row"><div class="segments" role="group" aria-label="Vue du planning">' +
    vues
      .map(
        ([k, t]) =>
          '<button type="button" class="b' +
          (ui.vuePlanning === k ? ' p' : '') +
          '" data-action="vuePlanning" data-id="' +
          k +
          '" aria-pressed="' +
          (ui.vuePlanning === k) +
          '">' +
          t +
          '</button>',
      )
      .join('') +
    '</div>' +
    '<select data-champ="filtre" data-param="filtrePlanning" ' +
    aria('Afficher la classe') +
    '>' +
    optionsClasses(classesTriees(etat), filtre, true) +
    '</select>' +
    (ui.vuePlanning === 'general'
      ? '<button type="button" class="b' +
        (ui.compact ? ' on' : '') +
        '" data-action="basculerCompact" aria-pressed="' +
        ui.compact +
        '">Colonnes compactes</button>'
      : ui.vuePlanning === 'classe'
        ? caseLvbOptions()
        : '') +
    '<span class="sp"></span><button type="button" class="b" data-action="exporterExcel">Exporter en Excel (.xlsx)</button>' +
    '<button type="button" class="b" data-action="effacerHoraires">Effacer les horaires non verrouillés</button>' +
    '<button type="button" class="b p" data-action="planifier">Générer les horaires</button></div></div>';
  if (ui.vuePlanning === 'general') {
    h +=
      grille(filtre) +
      '<p class="note">Pour déplacer un rendez-vous : glissez l\'élève vers une autre case, ou sélectionnez-le (clic, ou touche Entrée) puis choisissez « Placer ici » ; ' +
      "choisir un autre élève échange les deux rendez-vous. Le cadenas protège un rendez-vous lors d'une nouvelle génération. " +
      'Cases hachurées : un professeur du binôme est absent sur ce créneau. ★ : élève prioritaire, reçu par son professeur principal.</p>';
  } else if (ui.vuePlanning === 'classe') {
    h += '<div class="card doc">' + documentParClasse(etat, filtre) + '</div>';
  } else {
    h += '<div class="card doc">' + documentParBinome(etat, filtre) + '</div>';
  }
  return h + '<div style="margin-top:14px">' + blocControles(points, ['planning', 'repartition', 'soiree']) + '</div>';
}
