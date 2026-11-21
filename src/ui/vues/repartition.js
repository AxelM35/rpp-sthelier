// Onglet 4 : répartition des élèves entre les binômes.

import { capacite, creneaux } from '../../algos/creneaux.js';
import {
  classesDuBinome,
  classesTriees,
  codeBinome,
  comparerEleves,
  elevesDuBinome,
  libelleBinome,
  nomClasse,
  nomEleve,
  profsDuBinome,
  trouverEleve,
} from '../../modele/acces.js';
import { comparer, echapper } from '../../utils/texte.js';
import { app } from '../app.js';
import { aria, blocControles, optionsClasses, vignetteEleve } from '../composants.js';

export function vueRepartition(points) {
  const { etat, ui } = app;
  const liste = creneaux(etat.soiree);
  const filtre = ui.filtreRepartition;
  const choisi = ui.selection && trouverEleve(etat, ui.selection);
  const nomChoisi = choisi ? nomEleve(choisi) : '';
  const tri = (a, b) => comparer(nomClasse(etat, a.classeId), nomClasse(etat, b.classeId)) || comparerEleves(a, b);
  const nonAffectes = etat.eleves.filter((e) => !e.binomeId && (!filtre || e.classeId === filtre)).sort(tri);
  const binomes = etat.binomes.filter((b) => !filtre || b.classeIds.includes(filtre));
  // Bouton de destination, affiché pendant une sélection (déplacement au clavier).
  const destination = (cible, estIci, texte, libelle) =>
    !choisi || estIci
      ? ''
      : '<button type="button" class="dest" data-action="placer" data-id="' + cible + '" ' + aria(libelle) + '>' + texte + '</button>';

  const colonnes = binomes
    .map((b) => {
      const recus = elevesDuBinome(etat, b).sort(tri);
      const cap = capacite(profsDuBinome(etat, b), liste);
      const code = codeBinome(etat, b);
      return (
        '<div class="col" data-cible="bin:' +
        b.id +
        '"><h3><span class="code">' +
        code +
        '</span> ' +
        echapper(libelleBinome(etat, b)) +
        '</h3>' +
        '<div class="row" style="gap:4px;margin-bottom:4px"><span class="badge acc">' +
        echapper(classesDuBinome(etat, b) || 'sans classe') +
        '</span>' +
        (b.salle ? '<span class="badge">Salle ' + echapper(b.salle) + '</span>' : '') +
        '<span class="badge ' +
        (recus.length > cap ? 'bad' : '') +
        '">' +
        recus.length +
        ' / ' +
        cap +
        '<span class="sr-only"> élèves pour ' +
        cap +
        ' créneaux</span></span></div>' +
        destination(
          'bin:' + b.id,
          choisi && choisi.binomeId === b.id,
          'Placer ici',
          'Placer ' + nomChoisi + ' chez le binôme ' + code + ', ' + libelleBinome(etat, b),
        ) +
        recus.map((e) => vignetteEleve(e, b)).join('') +
        '</div>'
      );
    })
    .join('');

  return (
    '<div class="card"><div class="row"><select data-champ="filtre" data-param="filtreRepartition" ' +
    aria('Afficher la classe') +
    '>' +
    optionsClasses(classesTriees(etat), filtre, true) +
    '</select>' +
    '<span class="sp"></span><button type="button" class="b p" data-action="repartir">Répartir automatiquement</button></div>' +
    '<p class="note">Pour déplacer un élève : glissez-le vers un autre binôme, ou sélectionnez-le (clic, ou touche Entrée au clavier) ' +
    'puis choisissez « Placer ici » dans la colonne voulue. ' +
    "Un « ! » signale un élève placé chez un binôme qui ne reçoit pas sa classe, ou dont un professeur ne l'a pas en cours, " +
    'ou un élève prioritaire (★) reçu sans son professeur principal.</p></div>' +
    '<div class="cols"><div class="col" data-cible="none"><h3>Non affectés <span class="badge ' +
    (nonAffectes.length ? 'warn' : 'ok') +
    '">' +
    nonAffectes.length +
    '</span></h3>' +
    destination('none', choisi && !choisi.binomeId, 'Retirer du binôme', 'Retirer ' + nomChoisi + ' de son binôme') +
    nonAffectes.map((e) => vignetteEleve(e)).join('') +
    '</div>' +
    colonnes +
    '</div>' +
    '<div style="margin-top:14px">' +
    blocControles(points, ['repartition']) +
    '</div>'
  );
}
