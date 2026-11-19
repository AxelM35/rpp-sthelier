// Écran d'accueil : une carte par niveau, avec son avancement, et les actions communes.

import { NIVEAUX } from '../../config.js';
import { resumerNiveau } from '../../modele/niveaux.js';
import { echapper } from '../../utils/texte.js';
import { dateCourte } from '../dom.js';
import { dateEnClair } from '../documents.js';
import { copieDeSecoursPresente, etatSauvegarde, lireNiveau } from '../stockage.js';

const pluriel = (n, mot) => n + ' ' + mot + (n > 1 ? 's' : '');
const sr = (texte) => '<span class="sr-only">' + texte + '</span>';

function chiffres(r) {
  const chiffre = (valeur, libelle) => '<div><dt>' + libelle + '</dt><dd>' + valeur + '</dd></div>';
  return (
    '<dl class="niveau-chiffres">' +
    chiffre(r.eleves, 'Élèves') +
    chiffre(r.profs, 'Enseignants') +
    chiffre(r.binomes, 'Binômes') +
    chiffre(r.planifies + '<small> / ' + r.eleves + '</small>', 'Planifiés') +
    '</dl>'
  );
}

function etiquettes(niveau, etat, r) {
  const sauvegarde = etatSauvegarde(niveau, etat);
  const points = r.points
    ? '<span class="badge warn">' + pluriel(r.points, 'point') + ' à corriger</span>'
    : r.eleves
      ? '<span class="badge ok">Aucun point à corriger</span>'
      : '';
  return points || sauvegarde
    ? '<p class="niveau-etiquettes">' +
        points +
        (sauvegarde ? '<span class="badge ' + sauvegarde.statut + '">' + echapper(sauvegarde.texte) + '</span>' : '') +
        '</p>'
    : '';
}

function rappel(r) {
  const c = r.conservation;
  if (!c) return '';
  return (
    '<p class="msg warn niveau-rappel">' +
    (c.depassee
      ? 'Durée de conservation dépassée depuis le ' + dateCourte(c.limite) + ' : effacez ces données.'
      : 'Soirée passée : effacez ces données au plus tard le ' + dateCourte(c.limite) + '.') +
    '</p>'
  );
}

function carte(niveau) {
  const etat = lireNiveau(niveau);
  const r = resumerNiveau(etat);
  const secours = copieDeSecoursPresente(niveau);
  const date = dateEnClair(etat);
  const id = 'niveau-' + niveau;

  let corps;
  let actions;
  if (r.vide) {
    corps = '<p class="niveau-date muted">Aucune donnée pour l\'instant.</p>';
    actions = '<button type="button" class="b p" data-action="ouvrirNiveau" data-id="' + niveau + '">Commencer la ' + niveau + '</button>';
  } else {
    corps =
      '<p class="niveau-date">' +
      (date ? 'Soirée du ' + echapper(date) : '<span class="muted">Date de la soirée non fixée</span>') +
      '</p>' +
      chiffres(r) +
      etiquettes(niveau, etat, r) +
      rappel(r);
    actions =
      '<button type="button" class="b p" data-action="ouvrirNiveau" data-id="' +
      niveau +
      '">Ouvrir la ' +
      niveau +
      '</button>' +
      '<button type="button" class="b" data-action="sauvegarderNiveau" data-id="' +
      niveau +
      '">Sauvegarder' +
      sr(' la ' + niveau) +
      '</button>';
  }
  if (!r.vide || secours) {
    actions +=
      '<button type="button" class="b texte danger" data-action="effacerNiveau" data-id="' +
      niveau +
      '">Effacer définitivement' +
      sr(' la ' + niveau) +
      '</button>';
  }
  if (secours && r.vide) {
    corps += '<p class="note">Des données illisibles ont été mises de côté dans ce navigateur.</p>';
  }
  return (
    '<section class="card niveau' +
    (r.vide ? ' vide' : '') +
    '" aria-labelledby="' +
    id +
    '"><h2 id="' +
    id +
    '"><span class="niveau-sur">Niveau</span> ' +
    niveau +
    '</h2>' +
    corps +
    '<div class="niveau-actions">' +
    actions +
    '</div></section>'
  );
}

export function vueAccueil() {
  const presentes = NIVEAUX.some((n) => !resumerNiveau(lireNiveau(n)).vide || copieDeSecoursPresente(n));
  return (
    '<div class="accueil-tete"><div>' +
    '<h2 id="titre-accueil" class="titre-ecran">Choisissez un niveau</h2>' +
    '<p class="muted">Chaque niveau se prépare séparément : soirée, classes, élèves, enseignants, binômes et planning lui sont propres.</p>' +
    '</div><div class="accueil-ouvrir">' +
    '<button type="button" class="b on" data-action="choisirSauvegarde">Ouvrir une sauvegarde…</button>' +
    '<p class="note">Le niveau est reconnu dans le fichier.</p></div></div>' +
    '<div class="niveaux">' +
    NIVEAUX.map(carte).join('') +
    '</div>' +
    '<div class="card" id="donnees-personnelles"><h2>Données personnelles</h2>' +
    '<p>Les préparations sont enregistrées uniquement dans ce navigateur, sur cet ordinateur, chaque niveau séparément. ' +
    "L'application ne les envoie nulle part. Les sauvegardes et les documents contiennent des données personnelles : " +
    'rangez-les dans un espace professionnel protégé.</p>' +
    (presentes
      ? '<button type="button" class="b danger-plein" data-action="effacerToutDefinitivement">' +
        'Effacer les données de tous les niveaux</button>' +
        '<p class="note">Efface aussi l\'historique d\'annulation et les copies internes. Les fichiers déjà enregistrés ne sont pas concernés.</p>'
      : '<p class="note">Aucune donnée personnelle n\'est enregistrée dans ce navigateur.</p>') +
    '</div>'
  );
}
