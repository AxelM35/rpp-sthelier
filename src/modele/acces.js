// Lecture de l'état : recherches, libellés et regroupements. Aucune fonction ne modifie l'état.

import { comparer } from '../utils/texte.js';

export const trouverClasse = (etat, id) => etat.classes.find((c) => c.id === id);
export const trouverProf = (etat, id) => etat.profs.find((p) => p.id === id);
export const trouverBinome = (etat, id) => etat.binomes.find((b) => b.id === id);
export const trouverEleve = (etat, id) => etat.eleves.find((e) => e.id === id);

/** « Nom Prénom ». */
export const nomEleve = (e) => (e.nom + ' ' + (e.prenom || '')).trim();

/** Tri alphabétique des élèves par nom puis prénom. */
export const comparerEleves = (a, b) => comparer(nomEleve(a), nomEleve(b));

export function nomClasse(etat, id) {
  const c = trouverClasse(etat, id);
  return c ? c.nom : '?';
}

export const classesTriees = (etat) => etat.classes.slice().sort((a, b) => comparer(a.nom, b.nom));

/** Professeurs existants d'un binôme (0, 1 ou 2). */
export const profsDuBinome = (etat, b) => b.profIds.map((id) => trouverProf(etat, id)).filter(Boolean);

/** Un binôme est complet quand ses deux professeurs sont renseignés. */
export const binomeComplet = (etat, b) => profsDuBinome(etat, b).length === 2;

/** « Mme Aubert / M. Joly ». */
export function libelleBinome(etat, b) {
  const p = profsDuBinome(etat, b);
  return p.length ? p.map((x) => x.nom).join(' / ') : '(binôme vide)';
}

/** « 6A + 6B ». */
export const classesDuBinome = (etat, b) =>
  b.classeIds
    .map((id) => nomClasse(etat, id))
    .sort(comparer)
    .join(' + ');

/** « Mme Aubert (Français) et M. Joly (EPS) ». */
export const profsEnClair = (etat, b) =>
  profsDuBinome(etat, b)
    .map((p) => p.nom + (p.discipline ? ' (' + p.discipline + ')' : ''))
    .join(' et ');

export const elevesDuBinome = (etat, b) => etat.eleves.filter((e) => e.binomeId === b.id);

/** Code court affiché partout : B1, B2… selon l'ordre des binômes. */
export const codeBinome = (etat, b) => 'B' + (etat.binomes.indexOf(b) + 1);

/** Nombre d'élèves par classe : { idClasse: n }. */
export function effectifs(etat) {
  const n = {};
  etat.classes.forEach((c) => (n[c.id] = 0));
  etat.eleves.forEach((e) => {
    if (e.classeId in n) n[e.classeId]++;
  });
  return n;
}

/** Classes où intervient un professeur, quel que soit le type d'enseignement. */
export const classesDuProf = (p) => p.enseignements.map((x) => x.classeId);

/** Classes où un professeur peut recevoir des familles : celles où il enseigne et celle dont il est professeur principal. */
export const classesPossibles = (etat, p) => [
  ...new Set(classesDuProf(p).concat(etat.classes.filter((c) => c.ppId === p.id).map((c) => c.id))),
];

/** Enseignement d'un professeur dans une classe, ou null. */
export const enseignementDans = (p, classeId) => p.enseignements.find((x) => x.classeId === classeId) || null;

/** Classes communes aux deux professeurs d'un binôme. */
export function classesCommunes(etat, b) {
  const p = profsDuBinome(etat, b);
  return p.length === 2 ? classesPossibles(etat, p[0]).filter((c) => classesPossibles(etat, p[1]).includes(c)) : [];
}

/** Classe dont le professeur est le professeur principal, ou null (un enseignant l'est d'une classe au plus). */
export const classeDuPP = (etat, profId) => etat.classes.find((c) => c.ppId === profId) || null;

/** Élèves prioritaires d'une classe (V2-R11). */
export const prioritairesDe = (etat, classeId) => etat.eleves.filter((e) => e.prioritaire && e.classeId === classeId);
