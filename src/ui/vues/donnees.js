// Onglet 2 : langues et options du niveau, classes (professeur principal), professeurs (enseignements), élèves.

import { classesTriees, comparerEleves, effectifs, enseignementDans, nomClasse, nomEleve } from '../../modele/acces.js';
import { nomReference } from '../../modele/equipe.js';
import { comparer, echapper } from '../../utils/texte.js';
import { app } from '../app.js';
import { aria, blocControles, boutonSupprimer, champ, optionsClasses } from '../composants.js';

const qui = (p) => p.nom || '(sans nom)';

/** Texte court d'un enseignement, ajouté au nom de la classe sur la puce : « Espagnol », « sauf Breton ». */
export function precisionEnseignement(etat, x) {
  if (x.type === 'classe') return '';
  const nom = nomReference(etat, x);
  if (x.type === 'sauf') return 'sauf ' + nom;
  return nom + (x.type === 'lvb' && x.sansUlis ? ' sans ULIS' : '');
}

/** Carte « Langues et options » : listes du niveau, avec le nombre d'élèves qui suivent chacune. */
function blocListes() {
  const { etat } = app;
  const suivis = (type, id) => etat.eleves.filter((e) => (type === 'lvb' ? e.lvbId === id : e.optionIds.includes(id))).length;
  const liste = (type, titre, ajout, vide) => {
    const elements = type === 'lvb' ? etat.lvb : etat.options;
    return (
      '<div><h3>' +
      titre +
      '</h3>' +
      (elements.length
        ? elements
            .map(
              (x) =>
                '<div class="row ligne-liste">' +
                champ('nomListe', x.id, type, x.nom, 'text', aria(titre + ' : ' + x.nom)) +
                '<span class="badge">' +
                suivis(type, x.id) +
                ' él.</span>' +
                boutonSupprimer(type === 'lvb' ? 'supprimerLvb' : 'supprimerOption', x.id, 'Supprimer ' + x.nom) +
                '</div>',
            )
            .join('')
        : '<p class="muted">' + vide + '</p>') +
      '<button type="button" class="b petit" data-action="' +
      (type === 'lvb' ? 'ajouterLvb' : 'ajouterOption') +
      '">' +
      ajout +
      '</button></div>'
    );
  };
  return (
    '<div class="card" id="langues-options"><h2>Langues et options</h2><div class="grid2">' +
    liste('lvb', 'Langues vivantes B', '+ LVB', 'Aucune LVB pour ce niveau.') +
    liste('options', 'Options', '+ Option', 'Aucune option pour ce niveau.') +
    '</div><p class="note">Un enseignant de LVB ou d\'option ne reçoit que les élèves qui la suivent. ' +
    "L'import des enseignants complète ces listes.</p></div>"
  );
}

function blocClasses(classes, n) {
  const { etat } = app;
  const profs = etat.profs.slice().sort((a, b) => comparer(a.nom, b.nom));
  const optionsPP = (c) =>
    '<option value="">Professeur principal : —</option>' +
    profs
      .map((p) => '<option value="' + p.id + '"' + (p.id === c.ppId ? ' selected' : '') + '>PP : ' + echapper(qui(p)) + '</option>')
      .join('');
  return (
    '<div class="card"><h2>Classes</h2><div class="classes">' +
    classes
      .map(
        (c) =>
          '<span class="row classe" style="gap:4px">' +
          champ('classe', c.id, 'nom', c.nom, 'text', 'style="width:70px" ' + aria('Nom de la classe ' + c.nom)) +
          '<span class="badge">' +
          n[c.id] +
          ' él.</span>' +
          '<select data-champ="ppClasse" data-id="' +
          c.id +
          '" ' +
          aria('Professeur principal de ' + c.nom) +
          '>' +
          optionsPP(c) +
          '</select>' +
          boutonSupprimer('supprimerClasse', c.id, 'Supprimer la classe ' + c.nom + ' et ses élèves') +
          '</span>',
      )
      .join('') +
    '</div><button type="button" class="b" data-action="ajouterClasse">+ Classe</button>' +
    '<p class="note">Le professeur principal peut recevoir tous les élèves de sa classe, quelle que soit sa discipline.</p></div>'
  );
}

function blocProfesseurs(classes) {
  const { etat } = app;
  const puces = (p) =>
    classes
      .map((c) => {
        const x = enseignementDans(p, c.id);
        const precision = x ? precisionEnseignement(etat, x) : '';
        const texte = echapper(c.nom) + (precision ? ' · ' + echapper(precision) : '');
        return x
          ? '<button type="button" class="chip on" data-action="choisirEnseignement" data-id="' +
              p.id +
              '" data-param="' +
              c.id +
              '" aria-haspopup="dialog" ' +
              aria(c.nom + ' : ' + (precision || 'toute la classe') + '. Modifier ou retirer') +
              '>' +
              texte +
              '</button>'
          : '<button type="button" class="chip" data-action="basculerClasseProf" data-id="' +
              p.id +
              '" data-param="' +
              c.id +
              '" ' +
              aria('Ajouter ' + c.nom + ' (toute la classe)') +
              '>' +
              texte +
              '</button>';
      })
      .join('');
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
        puces(p) +
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
    '</table></div><p class="note">Cliquez sur une classe pour l\'ajouter (toute la classe). ' +
    "Cliquez sur une classe attribuée (en bleu) pour préciser l'enseignement (LVB, option) ou la retirer. " +
    "Par défaut, chaque professeur est présent toute la soirée : ne remplissez « Arrivée tardive » ou « Départ anticipé » qu'en cas d'exception.</p></div>"
  );
}

function blocEleves(classes) {
  const { etat, ui } = app;
  const filtre = ui.filtreDonnees;
  const avecLvb = etat.lvb.length > 0;
  const avecOptions = etat.options.length > 0;
  const eleves = etat.eleves
    .filter((e) => !filtre || e.classeId === filtre)
    .sort((a, b) => comparer(nomClasse(etat, a.classeId), nomClasse(etat, b.classeId)) || comparerEleves(a, b));
  const lignes = eleves
    .map((e) => {
      const q = nomEleve(e) || '(sans nom)';
      const lvb = avecLvb
        ? '<td><select data-champ="lvbEleve" data-id="' +
          e.id +
          '" ' +
          aria('LVB de ' + q) +
          '><option value="">—</option>' +
          etat.lvb
            .map((x) => '<option value="' + x.id + '"' + (x.id === e.lvbId ? ' selected' : '') + '>' + echapper(x.nom) + '</option>')
            .join('') +
          '</select></td>'
        : '';
      const options = avecOptions
        ? '<td><div class="puces" role="group" ' +
          aria('Options de ' + q) +
          '>' +
          etat.options
            .map((o) => {
              const a = e.optionIds.includes(o.id);
              return (
                '<button type="button" class="chip petite' +
                (a ? ' on' : '') +
                '" data-action="basculerOptionEleve" data-id="' +
                e.id +
                '" data-param="' +
                o.id +
                '" aria-pressed="' +
                a +
                '" ' +
                aria(o.nom + ' pour ' + q) +
                '>' +
                echapper(o.nom) +
                '</button>'
              );
            })
            .join('') +
          '</div></td>'
        : '';
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
        lvb +
        options +
        '<td><input type="checkbox" data-champ="ulisEleve" data-id="' +
        e.id +
        '"' +
        (e.ulis ? ' checked' : '') +
        ' ' +
        aria(q + ' en ULIS') +
        '></td>' +
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
    '<div class="scroll"><table class="t"><tr><th scope="col">Nom</th><th scope="col">Prénom</th><th scope="col">Classe</th>' +
    (avecLvb ? '<th scope="col">LVB</th>' : '') +
    (avecOptions ? '<th scope="col">Options</th>' : '') +
    '<th scope="col">ULIS</th><th scope="col">Fratrie (code)</th>' +
    '<th scope="col">Pas avant</th><th scope="col">Pas après</th><th scope="col"><span class="sr-only">Supprimer</span></th></tr>' +
    lignes +
    '</table></div>' +
    (eleves.length ? '' : '<p class="muted">Aucun élève. Importez un fichier ou ajoutez-les à la main.</p>') +
    '<p class="note"><b>LVB, options, ULIS</b> : déterminent les enseignants qui ont l\'élève en cours, donc les binômes qui peuvent le recevoir. ' +
    '<b>Fratrie</b> : donnez le même code (par exemple le nom de famille) aux frères et sœurs pour leur attribuer des rendez-vous consécutifs. ' +
    '<b>Pas avant / Pas après</b> : contraintes horaires de la famille, à laisser vide sinon.</p></div>'
  );
}

export function vueDonnees(points) {
  const classes = classesTriees(app.etat);
  return (
    blocListes() +
    blocClasses(classes, effectifs(app.etat)) +
    blocProfesseurs(classes) +
    blocEleves(classes) +
    (points.some((p) => p.onglet === 'donnees') ? '<div style="margin-top:14px">' + blocControles(points, ['donnees']) + '</div>' : '')
  );
}
