// Onglet 1 : paramètres de la soirée, capacité, premiers pas.

import { creneaux } from '../../algos/creneaux.js';
import { classesTriees, effectifs } from '../../modele/acces.js';
import { echapper, formaterHeure } from '../../utils/texte.js';
import { CONSERVATION_JOURS } from '../../config.js';
import { etatConservation } from '../../modele/confidentialite.js';
import { app } from '../app.js';
import { blocControles, boutonSupprimer, champ } from '../composants.js';
import { dateCourte } from '../dom.js';
import { copieDeSecoursPresente } from '../stockage.js';

function premiersPas() {
  return (
    '<details class="card guide"' +
    (app.etat.eleves.length ? '' : ' open') +
    '><summary>Premiers pas</summary><ol>' +
    "<li><b>Soirée</b> : fixez la date, les heures de début et de fin, la durée d'un rendez-vous et les pauses. Le nombre de créneaux se calcule seul.</li>" +
    '<li><b>Données</b> : importez les élèves et les professeurs (fichier CSV ou Excel, ou copier-coller), puis cochez les classes de chaque professeur.</li>' +
    "<li><b>Binômes</b> : cliquez « Tout générer ». Les binômes que vous composez vous-même sont conservés, l'application complète le reste.</li>" +
    '<li><b>Répartition</b> et <b>Planning</b> : ajustez à la main si besoin ; le cadenas protège un rendez-vous.</li>' +
    '<li><b>Documents</b> : imprimez les plannings et les convocations, ou exportez le planning en Excel.</li>' +
    '<li>Cliquez régulièrement sur <b>Sauvegarder</b> : sans cela, les données ne sont conservées que dans ce navigateur.</li>' +
    '<li>Après la soirée, effacez les données des élèves de ce navigateur (encadré « Données personnelles » ci-dessous).</li></ol></details>'
  );
}

function parametres() {
  const s = app.etat.soiree;
  const pauses = s.pauses.length
    ? s.pauses
        .map(
          (p, i) =>
            '<div class="row" style="margin-bottom:6px">' +
            '<label class="f">Début' +
            champ('pause', i, 'debut', p.debut, 'time') +
            '</label>' +
            '<label class="f">Durée (min)' +
            champ('pause', i, 'duree', p.duree, 'number', 'min="5" step="5" style="width:80px"') +
            '</label>' +
            boutonSupprimer('supprimerPause', i, 'Supprimer la pause de ' + (p.debut || '')) +
            '</div>',
        )
        .join('')
    : '<p class="muted">Aucune pause.</p>';
  return (
    '<div class="card"><h2>Paramètres de la soirée</h2><div class="row">' +
    '<label class="f">Établissement' +
    champ('soiree', '', 'etab', s.etab) +
    '</label>' +
    '<label class="f">Date' +
    champ('soiree', '', 'date', s.date, 'date') +
    '</label></div>' +
    '<div class="row" style="margin-top:10px">' +
    '<label class="f">Début' +
    champ('soiree', '', 'debut', s.debut, 'time') +
    '</label>' +
    '<label class="f">Fin' +
    champ('soiree', '', 'fin', s.fin, 'time') +
    '</label>' +
    '<label class="f">Durée d\'un rendez-vous (min)' +
    champ('soiree', '', 'duree', s.duree, 'number', 'min="5" max="60" step="5" style="width:90px"') +
    '</label></div>' +
    '<h3 style="margin-top:16px">Pauses communes</h3>' +
    pauses +
    '<button type="button" class="b" data-action="ajouterPause">+ Ajouter une pause</button></div>'
  );
}

function capaciteSoiree() {
  const etat = app.etat;
  const liste = creneaux(etat.soiree);
  const n = effectifs(etat);
  const S = liste.length;
  const N = etat.eleves.length;
  const nbProfs = etat.profs.filter((p) => p.classeIds.length).length;
  const indicateur = (valeur, texte) => '<div class="kpi"><b>' + valeur + '</b><span>' + texte + '</span></div>';
  let h =
    '<div class="card"><h2>Capacité</h2><div class="kpis">' +
    indicateur(S, 'rendez-vous par binôme') +
    indicateur(N, 'élèves à recevoir') +
    indicateur(S ? Math.ceil(N / S) : '–', 'binômes au minimum') +
    indicateur(Math.floor(nbProfs / 2), 'binômes possibles (' + nbProfs + ' prof.)') +
    '</div>';
  h += S
    ? '<p class="muted" style="margin-top:10px">Créneaux : ' +
      liste.map((c) => formaterHeure(c.d)).join(' · ') +
      ' (fin ' +
      formaterHeure(liste[S - 1].f) +
      ')</p>'
    : '<div class="msg bad" style="margin-top:10px">Aucun créneau avec ces horaires.</div>';
  if (etat.classes.length && S) {
    h +=
      '<div class="scroll"><table class="t"><tr><th scope="col">Classe</th><th scope="col">Élèves</th>' +
      '<th scope="col">Professeurs</th><th scope="col">Binômes nécessaires</th></tr>' +
      classesTriees(etat)
        .map((c) => {
          const profs = etat.profs.filter((p) => p.classeIds.includes(c.id)).length;
          const besoin = n[c.id] / S;
          return (
            '<tr><td>' +
            echapper(c.nom) +
            '</td><td>' +
            n[c.id] +
            '</td><td>' +
            profs +
            '</td><td>' +
            besoin.toFixed(2).replace('.', ',') +
            ' <span class="muted">(soit ' +
            Math.ceil(besoin) +
            ', ou ' +
            Math.floor(besoin) +
            ' + un binôme glissant)</span></td></tr>'
          );
        })
        .join('') +
      '</table></div>';
  }
  return h + '</div>';
}

function donneesPersonnelles() {
  const { etat } = app;
  const conservation = etatConservation(etat);
  const presentes = etat.eleves.length || etat.profs.length || copieDeSecoursPresente();
  return (
    '<div class="card" id="donnees-personnelles"><h2>Données personnelles</h2>' +
    '<ul class="liste">' +
    "<li><b>Où sont-elles ?</b> Uniquement dans ce navigateur, sur cet ordinateur. L'application ne les envoie nulle part. " +
    'Toute personne qui utilise ce navigateur avec la même session peut y accéder : sur un poste partagé, effacez-les après usage.</li>' +
    '<li><b>Lesquelles ?</b> Nom, prénom et classe des élèves, code de fratrie, contraintes horaires des familles, ' +
    "noms et classes des professeurs. Ne saisissez rien d'autre (pas de motif de rendez-vous ni de commentaire sur un élève).</li>" +
    '<li><b>Fichiers.</b> Les sauvegardes, les exports Excel et CSV et les documents imprimés contiennent ces données : ' +
    'rangez-les dans un espace professionnel protégé et supprimez-les quand ils ne servent plus.</li>' +
    '<li><b>Combien de temps ?</b> Effacez-les au plus tard ' +
    CONSERVATION_JOURS +
    ' jours après la soirée' +
    (conservation ? ', soit le ' + echapper(dateCourte(conservation.limite)) : '') +
    '.</li></ul>' +
    (presentes
      ? '<button type="button" class="b danger-plein" data-action="effacerDefinitivement">Effacer définitivement les données de ce navigateur</button>' +
        '<p class="note">Efface aussi l\'historique d\'annulation et les copies internes. Les fichiers déjà enregistrés ne sont pas concernés.</p>'
      : '<p class="note">Aucune donnée personnelle n\'est enregistrée dans ce navigateur.</p>') +
    '</div>'
  );
}

export function vueSoiree(points) {
  return (
    premiersPas() +
    '<div class="grid2">' +
    parametres() +
    capaciteSoiree() +
    '</div>' +
    donneesPersonnelles() +
    (points.some((p) => p.onglet === 'soiree') ? '<div style="margin-top:14px">' + blocControles(points, ['soiree']) + '</div>' : '')
  );
}
