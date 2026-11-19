// Documents imprimables (HTML) : plannings et convocations.

import { creneaux } from '../algos/creneaux.js';
import {
  classesDuBinome,
  classesTriees,
  comparerEleves,
  elevesDuBinome,
  libelleBinome,
  nomClasse,
  nomEleve,
  profsEnClair,
  trouverBinome,
} from '../modele/acces.js';
import { comparer, echapper, formaterHeure } from '../utils/texte.js';

/** « mardi 1 décembre 2026 » ou '' si la date n'est pas renseignée. */
export function dateEnClair(etat) {
  const d = etat.soiree.date;
  if (!d) return '';
  const x = new Date(d + 'T12:00');
  return isNaN(x) ? '' : x.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

const entete = (etat) => echapper([etat.soiree.etab, 'Rencontres parents-professeurs', dateEnClair(etat)].filter(Boolean).join(' — '));
const parHoraire = (a, b) => (a.slot == null ? 999 : a.slot) - (b.slot == null ? 999 : b.slot) || comparerEleves(a, b);

/** Une page par classe (filtre : id de classe ou '' pour toutes). */
export function documentParClasse(etat, filtre = '') {
  const liste = creneaux(etat.soiree);
  const pages = classesTriees(etat)
    .filter((c) => !filtre || c.id === filtre)
    .map((c) => {
      const eleves = etat.eleves.filter((e) => e.classeId === c.id).sort(parHoraire);
      return (
        '<div class="page"><h2>Classe ' +
        echapper(c.nom) +
        '</h2><div class="sous">' +
        entete(etat) +
        ' · ' +
        eleves.length +
        ' élèves</div>' +
        '<table><tr><th>Heure</th><th>Élève</th><th>Professeurs</th><th>Salle</th></tr>' +
        eleves
          .map((e) => {
            const b = trouverBinome(etat, e.binomeId);
            return (
              '<tr><td>' +
              (e.slot != null && liste[e.slot] ? formaterHeure(liste[e.slot].d) : '—') +
              '</td><td>' +
              echapper(nomEleve(e)) +
              '</td>' +
              '<td>' +
              (b ? echapper(profsEnClair(etat, b)) : '—') +
              '</td><td>' +
              (b ? echapper(b.salle) : '') +
              '</td></tr>'
            );
          })
          .join('') +
        '</table></div>'
      );
    });
  return pages.join('') || '<p>Aucune classe.</p>';
}

/** Une page par binôme (filtre : binômes recevant cette classe). */
export function documentParBinome(etat, filtre = '') {
  const liste = creneaux(etat.soiree);
  const pages = etat.binomes
    .filter((b) => !filtre || b.classeIds.includes(filtre))
    .map((b) => {
      const eleves = elevesDuBinome(etat, b).sort(parHoraire);
      return (
        '<div class="page"><h2>' +
        echapper(libelleBinome(etat, b)) +
        '</h2><div class="sous">' +
        entete(etat) +
        ' · Classe(s) ' +
        echapper(classesDuBinome(etat, b)) +
        (b.salle ? ' · Salle ' + echapper(b.salle) : '') +
        ' · ' +
        eleves.length +
        ' rendez-vous</div>' +
        '<table><tr><th>Heure</th><th>Élève</th><th>Classe</th></tr>' +
        eleves
          .map((e) => {
            const c = e.slot != null ? liste[e.slot] : null;
            return (
              '<tr><td>' +
              (c ? formaterHeure(c.d) + ' – ' + formaterHeure(c.f) : '—') +
              '</td><td>' +
              echapper(nomEleve(e)) +
              '</td><td>' +
              echapper(nomClasse(etat, e.classeId)) +
              '</td></tr>'
            );
          })
          .join('') +
        '</table></div>'
      );
    });
  return pages.join('') || '<p>Aucun binôme.</p>';
}

/** Grille générale heures × binômes. */
export function documentGeneral(etat) {
  const liste = creneaux(etat.soiree);
  const parCase = {};
  etat.eleves.forEach((e) => {
    if (e.binomeId && e.slot != null) parCase[e.binomeId + '|' + e.slot] = e;
  });
  return (
    '<div class="page"><h2>Planning général</h2><div class="sous">' +
    entete(etat) +
    '</div><table><tr><th>Heure</th>' +
    etat.binomes
      .map(
        (b) =>
          '<th>' +
          echapper(libelleBinome(etat, b)) +
          '<br>' +
          echapper(classesDuBinome(etat, b)) +
          (b.salle ? ' · salle ' + echapper(b.salle) : '') +
          '</th>',
      )
      .join('') +
    '</tr>' +
    liste
      .map(
        (c, s) =>
          '<tr><td>' +
          formaterHeure(c.d) +
          '</td>' +
          etat.binomes
            .map((b) => {
              const e = parCase[b.id + '|' + s];
              return (
                '<td>' + (e ? echapper(nomEleve(e)) + ' <small>(' + echapper(nomClasse(etat, e.classeId)) + ')</small>' : '') + '</td>'
              );
            })
            .join('') +
          '</tr>',
      )
      .join('') +
    '</table></div>'
  );
}

/** Un coupon par élève planifié, deux colonnes par page. */
export function documentConvocations(etat) {
  const liste = creneaux(etat.soiree);
  const eleves = etat.eleves
    .filter((e) => e.binomeId && e.slot != null && liste[e.slot])
    .sort((a, b) => comparer(nomClasse(etat, a.classeId), nomClasse(etat, b.classeId)) || comparerEleves(a, b));
  if (!eleves.length) return '<p>Aucun rendez-vous planifié.</p>';
  const date = dateEnClair(etat);
  return (
    '<div class="page coupons">' +
    eleves
      .map((e) => {
        const b = trouverBinome(etat, e.binomeId);
        const c = liste[e.slot];
        return (
          '<div class="coupon"><h3>' +
          echapper(etat.soiree.etab || 'Rencontre parents-professeurs') +
          '</h3>' +
          '<div>Rencontre parents-professeurs' +
          (date ? ' du ' + echapper(date) : '') +
          '</div>' +
          '<p style="margin-top:8px">Madame, Monsieur,<br>vous êtes attendus pour échanger au sujet de <b>' +
          echapper(nomEleve(e)) +
          '</b> (' +
          echapper(nomClasse(etat, e.classeId)) +
          ') :</p>' +
          '<div class="heure">' +
          formaterHeure(c.d) +
          (b.salle ? ' — salle ' + echapper(b.salle) : '') +
          '</div>' +
          '<div>avec ' +
          echapper(profsEnClair(etat, b)) +
          '.</div>' +
          '<p style="margin-top:8px">Durée de l\'entretien : ' +
          (c.f - c.d) +
          " minutes. Merci de respecter l'horaire.</p></div>"
        );
      })
      .join('') +
    '</div>'
  );
}

/** Documents proposés dans l'onglet Documents : clé → { titre, generer(etat), paysage }. */
export const DOCUMENTS = {
  general: { titre: 'Planning général', generer: documentGeneral, paysage: true },
  classes: { titre: 'Planning par classe', generer: (etat) => documentParClasse(etat) },
  convocations: { titre: 'Convocations des familles', generer: documentConvocations },
};
