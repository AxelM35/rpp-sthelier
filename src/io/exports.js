// Contenu des exports du planning (Excel et CSV), sous forme de tableaux de lignes.

import { creneaux } from '../algos/creneaux.js';
import {
  classesDuBinome,
  classesTriees,
  comparerEleves,
  elevesDuBinome,
  libelleBinome,
  nomClasse,
  nomEleve,
  profsDuBinome,
  trouverBinome,
} from '../modele/acces.js';
import { comparer, formaterHeure } from '../utils/texte.js';
import { ecrireCSV } from './csv.js';
import { creerClasseur } from './xlsx.js';

const parHoraire = (a, b) => (a.slot == null ? 999 : a.slot) - (b.slot == null ? 999 : b.slot) || comparerEleves(a, b);

/** Trois feuilles : planning général (heures × binômes), liste par classe, liste par binôme. */
export function feuillesPlanning(etat) {
  const liste = creneaux(etat.soiree);
  const binomes = etat.binomes;
  const parCase = {};
  etat.eleves.forEach((e) => {
    if (e.binomeId && e.slot != null) parCase[e.binomeId + '|' + e.slot] = e;
  });
  const heure = (e) => (e.slot != null && e.binomeId && liste[e.slot] ? formaterHeure(liste[e.slot].d) : '');

  const general = [
    ['Heure'].concat(binomes.map((b) => libelleBinome(etat, b) + '\n' + classesDuBinome(etat, b) + (b.salle ? ' · salle ' + b.salle : ''))),
  ];
  liste.forEach((c, s) =>
    general.push(
      [formaterHeure(c.d)].concat(
        binomes.map((b) => {
          const e = parCase[b.id + '|' + s];
          return e ? nomEleve(e) + ' (' + nomClasse(etat, e.classeId) + ')' : '';
        }),
      ),
    ),
  );

  const parClasse = [['Classe', 'Nom', 'Prénom', 'Heure', 'Professeur 1', 'Professeur 2', 'Salle']];
  classesTriees(etat).forEach((c) =>
    etat.eleves
      .filter((e) => e.classeId === c.id)
      .sort(parHoraire)
      .forEach((e) => {
        const b = trouverBinome(etat, e.binomeId);
        const p = b ? profsDuBinome(etat, b) : [];
        parClasse.push([c.nom, e.nom, e.prenom, heure(e), p[0] ? p[0].nom : '', p[1] ? p[1].nom : '', b ? b.salle : '']);
      }),
  );

  const parBinome = [['Binôme', 'Salle', 'Heure', 'Nom', 'Prénom', 'Classe']];
  binomes.forEach((b) =>
    elevesDuBinome(etat, b)
      .sort(parHoraire)
      .forEach((e) => parBinome.push([libelleBinome(etat, b), b.salle, heure(e), e.nom, e.prenom, nomClasse(etat, e.classeId)])),
  );

  return [
    { nom: 'Planning général', lignes: general, largeurs: [9].concat(binomes.map(() => 26)) },
    { nom: 'Par classe', lignes: parClasse, largeurs: [9, 20, 16, 9, 22, 22, 9] },
    { nom: 'Par binôme', lignes: parBinome, largeurs: [36, 9, 9, 20, 16, 9] },
  ];
}

/** Classeur Excel du planning (Uint8Array). */
export const classeurPlanning = (etat) => creerClasseur(feuillesPlanning(etat));

/** Export CSV : une ligne par élève, triée par classe puis nom. */
export function csvPlanning(etat) {
  const liste = creneaux(etat.soiree);
  const lignes = etat.eleves
    .slice()
    .sort((a, b) => comparer(nomClasse(etat, a.classeId), nomClasse(etat, b.classeId)) || comparerEleves(a, b))
    .map((e) => {
      const b = trouverBinome(etat, e.binomeId);
      const p = b ? profsDuBinome(etat, b) : [];
      return [
        nomClasse(etat, e.classeId),
        e.nom,
        e.prenom,
        e.slot != null && liste[e.slot] ? formaterHeure(liste[e.slot].d) : '',
        b ? b.salle : '',
        p[0] ? p[0].nom : '',
        p[1] ? p[1].nom : '',
      ];
    });
  return ecrireCSV([['Classe', 'Nom', 'Prénom', 'Heure', 'Salle', 'Professeur 1', 'Professeur 2']].concat(lignes));
}
