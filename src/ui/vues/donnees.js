// Onglet 2 : classes, professeurs et élèves.

import { classesTriees, comparerEleves, effectifs, nomClasse, nomEleve } from '../../modele/acces.js';
import { comparer, echapper } from '../../utils/texte.js';
import { app } from '../app.js';
import { aria, boutonSupprimer, champ, optionsClasses } from '../composants.js';

function blocClasses(classes, n) {
  return (
    '<div class="card"><h2>Classes</h2><div class="row">' +
    classes
      .map(
        (c) =>
          '<span class="row" style="gap:2px">' +
          champ('classe', c.id, 'nom', c.nom, 'text', 'style="width:70px" ' + aria('Nom de la classe ' + c.nom)) +
          '<span class="badge">' +
          n[c.id] +
          ' él.</span>' +
          boutonSupprimer('supprimerClasse', c.id, 'Supprimer la classe ' + c.nom + ' et ses élèves') +
          '</span>',
      )
      .join('') +
    '<button type="button" class="b" data-action="ajouterClasse">+ Classe</button></div></div>'
  );
}

function blocProfesseurs(classes) {
  const { etat } = app;
  const qui = (p) => p.nom || '(sans nom)';
  const lignes = etat.profs
    .slice()
    .sort((a, b) => comparer(a.nom, b.nom))
    .map(
      (p) =>
        '<tr><td>' +
        champ('prof', p.id, 'nom', p.nom, 'text', aria('Nom du professeur')) +
        '</td>' +
        '<td>' +
        champ('prof', p.id, 'discipline', p.discipline, 'text', aria('Discipline de ' + qui(p))) +
        '</td>' +
        '<td><div role="group" ' +
        aria('Classes de ' + qui(p)) +
        '>' +
        classes
          .map((c) => {
            const a = p.classeIds.includes(c.id);
            return (
              '<button type="button" class="chip' +
              (a ? ' on' : '') +
              '" data-action="basculerClasseProf" data-id="' +
              p.id +
              '" data-param="' +
              c.id +
              '" aria-pressed="' +
              a +
              '">' +
              echapper(c.nom) +
              '</button>'
            );
          })
          .join('') +
        '</div></td>' +
        '<td>' +
        champ('prof', p.id, 'dispoDe', p.dispoDe, 'time', aria('Arrivée tardive de ' + qui(p))) +
        '</td>' +
        '<td>' +
        champ('prof', p.id, 'dispoA', p.dispoA, 'time', aria('Départ anticipé de ' + qui(p))) +
        '</td>' +
        '<td>' +
        boutonSupprimer('supprimerProf', p.id, 'Supprimer ' + qui(p)) +
        '</td></tr>',
    )
    .join('');
  return (
    '<div class="card"><div class="row"><h2 style="margin:0">Professeurs (' +
    etat.profs.length +
    ')</h2><span class="sp"></span>' +
    '<button type="button" class="b" data-action="ouvrirImport" data-id="profs">Importer…</button>' +
    '<button type="button" class="b" data-action="ajouterProf">+ Professeur</button></div>' +
    '<div class="scroll"><table class="t"><tr><th scope="col">Nom</th><th scope="col">Discipline</th><th scope="col">Classes</th>' +
    '<th scope="col">Arrivée tardive</th><th scope="col">Départ anticipé</th><th scope="col"><span class="sr-only">Supprimer</span></th></tr>' +
    lignes +
    '</table></div><p class="note">Cliquez sur une classe pour l\'attribuer ou la retirer (en bleu : classe attribuée). ' +
    "Par défaut, chaque professeur est présent toute la soirée : ne remplissez « Arrivée tardive » ou « Départ anticipé » qu'en cas d'exception.</p></div>"
  );
}

function blocEleves(classes) {
  const { etat, ui } = app;
  const filtre = ui.filtreDonnees;
  const eleves = etat.eleves
    .filter((e) => !filtre || e.classeId === filtre)
    .sort((a, b) => comparer(nomClasse(etat, a.classeId), nomClasse(etat, b.classeId)) || comparerEleves(a, b));
  const lignes = eleves
    .map((e) => {
      const q = nomEleve(e) || '(sans nom)';
      return (
        '<tr><td>' +
        champ('eleve', e.id, 'nom', e.nom, 'text', aria("Nom de l'élève")) +
        '</td>' +
        '<td>' +
        champ('eleve', e.id, 'prenom', e.prenom, 'text', aria('Prénom de ' + q)) +
        '</td>' +
        '<td><select data-champ="eleve" data-id="' +
        e.id +
        '" data-param="classeId" ' +
        aria('Classe de ' + q) +
        '>' +
        optionsClasses(classes, e.classeId) +
        '</select></td>' +
        '<td>' +
        champ('eleve', e.id, 'fratrie', e.fratrie, 'text', aria('Code fratrie de ' + q)) +
        '</td>' +
        '<td>' +
        champ('eleve', e.id, 'pasAvant', e.pasAvant, 'time', aria('Famille de ' + q + ' disponible pas avant')) +
        '</td>' +
        '<td>' +
        champ('eleve', e.id, 'pasApres', e.pasApres, 'time', aria('Famille de ' + q + ' disponible pas après')) +
        '</td>' +
        '<td>' +
        boutonSupprimer('supprimerEleve', e.id, 'Supprimer ' + q) +
        '</td></tr>'
      );
    })
    .join('');
  return (
    '<div class="card"><div class="row"><h2 style="margin:0">Élèves (' +
    etat.eleves.length +
    ')</h2>' +
    '<select data-champ="filtre" data-param="filtreDonnees" ' +
    aria('Filtrer les élèves par classe') +
    '>' +
    optionsClasses(classes, filtre, true) +
    '</select>' +
    '<span class="sp"></span><button type="button" class="b" data-action="ouvrirImport" data-id="eleves">Importer…</button>' +
    '<button type="button" class="b" data-action="ajouterEleve">+ Élève</button></div>' +
    '<div class="scroll"><table class="t"><tr><th scope="col">Nom</th><th scope="col">Prénom</th><th scope="col">Classe</th><th scope="col">Fratrie (code)</th>' +
    '<th scope="col">Pas avant</th><th scope="col">Pas après</th><th scope="col"><span class="sr-only">Supprimer</span></th></tr>' +
    lignes +
    '</table></div>' +
    (eleves.length ? '' : '<p class="muted">Aucun élève. Importez un fichier ou ajoutez-les à la main.</p>') +
    '<p class="note"><b>Fratrie</b> : donnez le même code (par exemple le nom de famille) aux frères et sœurs pour leur attribuer des rendez-vous consécutifs. ' +
    '<b>Pas avant / Pas après</b> : contraintes horaires de la famille, à laisser vide sinon.</p></div>'
  );
}

export function vueDonnees() {
  const classes = classesTriees(app.etat);
  return blocClasses(classes, effectifs(app.etat)) + blocProfesseurs(classes) + blocEleves(classes);
}
