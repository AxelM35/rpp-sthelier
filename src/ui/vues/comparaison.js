// Comparaison de plusieurs propositions de binômes (onglet 3).

import { classesDuBinome, libelleBinome } from '../../modele/acces.js';
import { echapper } from '../../utils/texte.js';
import { app } from '../app.js';
import { aria } from '../composants.js';

export const LETTRES = 'ABCDEFGH';

/** Signature d'un binôme : ses deux professeurs et ses classes. */
const signature = (b) => b.profIds.slice().sort().join('+') + ':' + b.classeIds.slice().sort().join('+');

function indicateurs(v, i) {
  const n = v.indicateurs;
  const lignes = [
    n.binomes + ' binômes' + (n.glissants ? ', dont ' + n.glissants + ' glissant' + (n.glissants > 1 ? 's' : '') : ', aucun glissant'),
    (n.chargeMin === n.chargeMax ? n.chargeMax : 'De ' + n.chargeMin + ' à ' + n.chargeMax) +
      ' élèves par binôme' +
      (n.limites ? ' (hors ' + n.limites + ' limité' + (n.limites > 1 ? 's' : '') + ' à une LVB ou une option)' : ''),
    n.profsSansBinome ? n.profsSansBinome + ' professeur(s) sans binôme' : 'Tous les professeurs mobilisés',
    n.sansPlace ? '<span class="badge bad">' + n.sansPlace + ' élève(s) sans place</span>' : 'Tous les élèves ont une place',
  ];
  if (n.horsPP) {
    lignes.push('<span class="badge warn">' + n.horsPP + ' élève(s) prioritaire(s) reçu(s) sans leur professeur principal</span>');
  }
  if (i > 0) lignes.push(v.differences + ' binôme(s) différent(s) de la proposition A');
  return '<ul class="indicateurs">' + lignes.map((l) => '<li>' + l + '</li>').join('') + '</ul>';
}

function colonne(v, i, reference) {
  const lettre = LETTRES[i];
  const deA = new Set(reference.etat.binomes.map(signature));
  const nouveaux = v.etat.binomes.filter((b) => !deA.has(signature(b))).length;
  // Marquer chaque binôme différent n'a de sens que si une partie seulement diffère.
  const marquer = i > 0 && nouveaux > 0 && nouveaux < v.etat.binomes.length;
  const binomes = v.etat.binomes
    .map((b) => {
      const different = marquer && !deA.has(signature(b));
      return (
        '<li' +
        (different ? ' class="different"' : '') +
        '>' +
        echapper(libelleBinome(v.etat, b)) +
        ' <span class="muted">— ' +
        echapper(classesDuBinome(v.etat, b)) +
        '</span>' +
        (b.fixe ? ' <span class="badge">conservé</span>' : '') +
        (different ? ' <span class="badge acc">différent de A</span>' : '') +
        '</li>'
      );
    })
    .join('');
  return (
    '<section class="proposition' +
    (i === 0 ? ' recommandee' : '') +
    '" ' +
    aria('Proposition ' + lettre) +
    '>' +
    '<h3>Proposition ' +
    lettre +
    (i === 0 ? ' <span class="badge acc">recommandée</span>' : '') +
    '</h3>' +
    indicateurs(v, i) +
    (i > 0 && nouveaux === v.etat.binomes.length
      ? '<p class="note" style="margin:0">Aucun binôme en commun avec la proposition A.</p>'
      : '') +
    '<ul class="binomes-proposes">' +
    binomes +
    '</ul>' +
    '<button type="button" class="b' +
    (i === 0 ? ' p' : '') +
    '" data-action="choisirProposition" data-id="' +
    i +
    '">Choisir la proposition ' +
    lettre +
    '</button>' +
    '</section>'
  );
}

/** Encadré de comparaison, affiché après un clic sur « Comparer des propositions ». */
export function blocComparaison() {
  const comparaison = app.ui.comparaison;
  if (!comparaison) return '';
  const { variantes } = comparaison;
  return (
    '<div class="card" id="comparaison"><div class="row"><h2 style="margin:0">Comparer les propositions</h2><span class="sp"></span>' +
    '<button type="button" class="b" data-action="fermerComparaison">Fermer la comparaison</button></div>' +
    '<p class="note">' +
    (variantes.length > 1
      ? variantes.length + ' compositions différentes, classées de la plus satisfaisante à la moins satisfaisante. '
      : 'Une seule composition satisfaisante a été trouvée avec ces données. ') +
    'Choisir une proposition remplace les binômes non conservés, puis répartit les élèves et place les horaires.</p>' +
    '<div class="propositions">' +
    variantes.map((v, i) => colonne(v, i, variantes[0])).join('') +
    '</div></div>'
  );
}
