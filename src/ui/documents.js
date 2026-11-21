// Documents imprimables (HTML) : plannings et convocations.

import { creneaux } from '../algos/creneaux.js';
import {
  classesDuBinome,
  classesTriees,
  comparerEleves,
  elevesDuBinome,
  libelleBinome,
  lvbOptionsEleve,
  nomClasse,
  nomEleve,
  profsEnClair,
  trouverBinome,
} from '../modele/acces.js';
import { dateEnClair, titreSoiree } from '../modele/niveaux.js';
import { comparer, echapper, formaterHeure } from '../utils/texte.js';

const entete = (etat) => echapper(titreSoiree(etat));
const parHoraire = (a, b) => (a.slot == null ? 999 : a.slot) - (b.slot == null ? 999 : b.slot) || comparerEleves(a, b);

/** « Espagnol · Latin, Breton », ou '—' : LVB et options d'un élève, sans l'indication ULIS. */
function texteLvbOptions(etat, e) {
  const x = lvbOptionsEleve(etat, e);
  return [x.lvb, x.options].filter(Boolean).join(' · ') || '—';
}

/**
 * Une page par classe (filtre : id de classe ou '' pour toutes). Avec etat.opt.lvbOptions, une colonne indique la LVB
 * et les options de chaque élève (V2-F10). Les élèves prioritaires n'y sont pas signalés (décision 4 du lot 4).
 */
export function documentParClasse(etat, filtre = '') {
  const liste = creneaux(etat.soiree);
  const avecLvb = etat.opt.lvbOptions;
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
        '<table><tr><th>Heure</th><th>Élève</th>' +
        (avecLvb ? '<th>LVB et options</th>' : '') +
        '<th>Professeurs</th><th>Salle</th></tr>' +
        eleves
          .map((e) => {
            const b = trouverBinome(etat, e.binomeId);
            return (
              '<tr><td>' +
              (e.slot != null && liste[e.slot] ? formaterHeure(liste[e.slot].d) : '—') +
              '</td><td>' +
              echapper(nomEleve(e)) +
              '</td>' +
              (avecLvb ? '<td>' + echapper(texteLvbOptions(etat, e)) + '</td>' : '') +
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

/**
 * Une page par binôme (filtre : binômes recevant cette classe), destinée à ses deux enseignants : les élèves
 * prioritaires y sont marqués d'une étoile (V2-F6 bis, décision 4 du lot 4).
 */
export function documentParBinome(etat, filtre = '') {
  const liste = creneaux(etat.soiree);
  const pages = etat.binomes
    .filter((b) => !filtre || b.classeIds.includes(filtre))
    .map((b) => {
      const eleves = elevesDuBinome(etat, b).sort(parHoraire);
      const prioritaires = eleves.some((e) => e.prioritaire);
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
              (e.prioritaire ? '<span class="prio" title="Élève prioritaire">★</span> ' : '') +
              echapper(nomEleve(e)) +
              (e.prioritaire ? '<span class="sr-only"> (prioritaire)</span>' : '') +
              '</td><td>' +
              echapper(nomClasse(etat, e.classeId)) +
              '</td></tr>'
            );
          })
          .join('') +
        '</table>' +
        (prioritaires ? '<p class="legende-doc">★ Élève prioritaire : rendez-vous demandé par le professeur principal.</p>' : '') +
        '</div>'
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
          '<div>Rencontre parents-professeurs de ' +
          echapper(etat.niveau) +
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
  binomes: { titre: 'Planning par binôme', generer: (etat) => documentParBinome(etat) },
  convocations: { titre: 'Convocations des familles', generer: documentConvocations },
};
