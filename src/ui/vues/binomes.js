// Onglet 3 : proposition automatique et composition des binômes.

import { capacite, creneaux } from '../../algos/creneaux.js';
import { couverture } from '../../algos/groupes.js';
import {
  classesCommunes,
  classesDuProf,
  classesTriees,
  codeBinome,
  effectifs,
  elevesDuBinome,
  nomClasse,
  profsDuBinome,
} from '../../modele/acces.js';
import { comparer, echapper } from '../../utils/texte.js';
import { app } from '../app.js';
import { blocComparaison } from './comparaison.js';
import { aria, blocControles, boutonSupprimer, champ } from '../composants.js';

function blocProposition() {
  const { etat } = app;
  const conserves = etat.binomes.filter((b) => b.fixe).length;
  const mode = etat.opt.mode;
  const etatCouverture = (manque, eleves) =>
    eleves === 0
      ? '–'
      : manque
        ? '<span class="badge bad">il manque ' + manque + ' créneau(x)</span>'
        : '<span class="badge ok">tous les élèves peuvent être reçus</span>';
  const couvertureTexte = couverture(etat)
    .map(
      (c) =>
        '<tr><th scope="row">' +
        echapper(c.nom) +
        '</th><td>' +
        c.eleves +
        '</td><td>' +
        c.binomes +
        (c.glissants ? ' <span class="muted">dont ' + c.glissants + ' glissant(s)</span>' : '') +
        '</td><td>' +
        etatCouverture(c.manque, c.eleves) +
        '</td></tr>' +
        c.groupes
          .map(
            (g) =>
              '<tr class="groupe"><td><span class="sr-only">' +
              echapper(c.nom) +
              ', groupe </span>' +
              echapper(g.libelle) +
              '</td><td>' +
              g.eleves +
              '</td><td>' +
              g.binomes +
              ' <span class="muted">possible(s)</span></td><td>' +
              etatCouverture(g.manque, g.eleves) +
              '</td></tr>',
          )
          .join(''),
    )
    .join('');
  return (
    '<div class="card"><div class="row"><h2 style="margin:0">Proposition automatique</h2><span class="sp"></span>' +
    '<select data-champ="option" data-param="mode" ' +
    aria('Objectif de la proposition') +
    '>' +
    '<option value="tous"' +
    (mode === 'tous' ? ' selected' : '') +
    '>Mobiliser tous les professeurs</option>' +
    '<option value="min"' +
    (mode === 'min' ? ' selected' : '') +
    '>Nombre minimal de binômes</option></select>' +
    '<button type="button" class="b" data-action="proposerBinomes">Proposer les binômes</button>' +
    '<button type="button" class="b" data-action="comparerPropositions">Comparer des propositions</button>' +
    '<button type="button" class="b p" data-action="toutGenerer">Tout générer (binômes, répartition, horaires)</button></div>' +
    '<p class="note">La proposition tient compte de l\'équipe de chaque élève (LVB et options comprises), des effectifs, du nombre de créneaux et des indisponibilités, ' +
    "et crée des binômes glissants si nécessaire pour qu'aucun élève ne reste sans rendez-vous. " +
    "<b>Pour imposer un binôme</b>, composez-le avec « + Binôme » ou cliquez « Conserver » sur une proposition : il est gardé et l'application complète le reste" +
    (conserves ? ' (' + conserves + ' binôme(s) conservé(s) actuellement)' : '') +
    '.</p>' +
    '<div class="scroll"><table class="t couverture"><tr><th scope="col">Classe et groupes</th><th scope="col">Élèves</th>' +
    '<th scope="col">Binômes</th><th scope="col">Couverture</th></tr>' +
    couvertureTexte +
    '</table></div></div>'
  );
}

function carteBinome(b, classes, liste, profsPris) {
  const { etat } = app;
  const communes = classesCommunes(etat, b);
  const cap = capacite(profsDuBinome(etat, b), liste);
  const recus = elevesDuBinome(etat, b).length;
  const code = codeBinome(etat, b);
  const optionsProfs = (choisi) =>
    '<option value="">— choisir —</option>' +
    etat.profs
      .slice()
      .sort((a, c) => comparer(a.nom, c.nom))
      .filter((p) => !profsPris[p.id] || profsPris[p.id] === b.id)
      .map(
        (p) =>
          '<option value="' +
          p.id +
          '"' +
          (p.id === choisi ? ' selected' : '') +
          '>' +
          echapper(p.nom) +
          (p.discipline ? ' (' + echapper(p.discipline) + ')' : '') +
          ' — ' +
          echapper(
            classesDuProf(p)
              .map((id) => nomClasse(etat, id))
              .sort(comparer)
              .join(', '),
          ) +
          '</option>',
      )
      .join('');
  const boutonsClasses = classes
    .map((c) => {
      const recue = b.classeIds.includes(c.id);
      const commune = communes.includes(c.id);
      return (
        '<button type="button" class="chip' +
        (recue ? ' on' : '') +
        (commune ? ' commun' : '') +
        '" data-action="basculerClasseBinome" data-id="' +
        b.id +
        '" data-param="' +
        c.id +
        '" aria-pressed="' +
        recue +
        '">' +
        echapper(c.nom) +
        (commune ? '<span class="sr-only"> (commune aux deux professeurs)</span>' : '') +
        '</button>'
      );
    })
    .join('');
  return (
    '<div class="bin" role="group" ' +
    aria('Binôme ' + code) +
    '>' +
    '<div class="row" style="margin-bottom:4px;gap:6px"><span class="code">' +
    code +
    '</span>' +
    (b.classeIds.length > 1 ? '<span class="badge acc">Glissant</span>' : '') +
    '<span class="sp"></span>' +
    '<button type="button" class="b petit' +
    (b.fixe ? ' on' : '') +
    '" data-action="basculerConserve" data-id="' +
    b.id +
    '" aria-pressed="' +
    Boolean(b.fixe) +
    '">' +
    (b.fixe ? '✓ Conservé' : 'Conserver') +
    '</button>' +
    boutonSupprimer('supprimerBinome', b.id, 'Supprimer le binôme ' + code) +
    '</div>' +
    '<div class="row" style="gap:6px;margin-bottom:6px"><span class="badge">' +
    cap +
    ' créneaux</span><span class="badge ' +
    (recus > cap ? 'bad' : '') +
    '">' +
    recus +
    ' élèves</span></div>' +
    '<select data-champ="profBinome" data-id="' +
    b.id +
    '" data-param="0" ' +
    aria('Premier professeur du binôme ' + code) +
    '>' +
    optionsProfs(b.profIds[0]) +
    '</select>' +
    '<select data-champ="profBinome" data-id="' +
    b.id +
    '" data-param="1" ' +
    aria('Second professeur du binôme ' + code) +
    '>' +
    optionsProfs(b.profIds[1]) +
    '</select>' +
    '<div class="row" style="gap:4px"><span class="muted" id="cl-' +
    b.id +
    '">Classes</span><span role="group" aria-labelledby="cl-' +
    b.id +
    '">' +
    boutonsClasses +
    '</span>' +
    '<span class="sp"></span><label class="muted">Salle ' +
    champ('binome', b.id, 'salle', b.salle, 'text', 'style="width:70px"') +
    '</label></div></div>'
  );
}

export function vueBinomes(points) {
  const { etat } = app;
  const classes = classesTriees(etat);
  const liste = creneaux(etat.soiree);
  const profsPris = {};
  etat.binomes.forEach((b) => b.profIds.forEach((id) => id && (profsPris[id] = b.id)));
  return (
    blocProposition() +
    blocComparaison() +
    '<div class="row" style="margin-bottom:6px"><h2 style="margin:0">Binômes (' +
    etat.binomes.length +
    ')</h2><span class="sp"></span>' +
    '<button type="button" class="b" data-action="ajouterBinome">+ Binôme</button>' +
    '<button type="button" class="b" data-action="supprimerTousBinomes">Supprimer tous les binômes</button></div>' +
    (etat.binomes.length
      ? '<p class="note" style="margin:0 0 10px">Classes en bleu plein : reçues par le binôme. ' +
        'Classes entourées de bleu : communes aux deux professeurs, donc possibles pour ce binôme.</p>'
      : '') +
    '<div class="bins">' +
    etat.binomes.map((b) => carteBinome(b, classes, liste, profsPris)).join('') +
    '</div>' +
    (etat.binomes.length ? '' : '<p class="muted">Aucun binôme pour le moment.</p>') +
    '<div style="margin-top:14px">' +
    blocControles(points, ['binomes']) +
    '</div>'
  );
}
