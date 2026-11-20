// Équipe d'un élève (cahier des charges v2, section 4.4) : les enseignants qui l'ont en cours.
//
// Un enseignant appartient à l'équipe d'un élève quand :
//   - il est le professeur principal de sa classe (quelle que soit sa discipline) ;
//   - ou il enseigne dans sa classe, et son enseignement concerne l'élève :
//       'classe'  toujours ;
//       'lvb'     l'élève suit cette LVB, sauf s'il est en ULIS et que l'enseignant n'a pas les élèves ULIS (sansUlis) ;
//       'option'  l'élève suit cette option ;
//       'sauf'    l'élève ne suit pas cette option.
// Les deux enseignants d'un binôme doivent appartenir à l'équipe de chaque élève reçu (règle V2-R2).

import { enseignementDans, trouverClasse } from './acces.js';

/** L'enseignement x (d'un professeur dans la classe de l'élève) concerne-t-il cet élève ? */
export function concerne(x, eleve) {
  switch (x.type) {
    case 'classe':
      return true;
    case 'lvb':
      return eleve.lvbId === x.refId && !(eleve.ulis && x.sansUlis);
    case 'option':
      return eleve.optionIds.includes(x.refId);
    case 'sauf':
      return !eleve.optionIds.includes(x.refId);
    default:
      return false;
  }
}

/** Le professeur appartient-il à l'équipe de l'élève ? */
export function dansEquipe(etat, prof, eleve) {
  const classe = trouverClasse(etat, eleve.classeId);
  if (!classe) return false;
  if (classe.ppId === prof.id) return true;
  const x = enseignementDans(prof, eleve.classeId);
  return Boolean(x && concerne(x, eleve));
}

/**
 * Enseignement qui limite un professeur à une partie de la classe (LVB ou option), ou null : enseignement
 * de toute la classe (« classe entière », ou « sauf », qui n'écarte que quelques élèves), professeur principal
 * de la classe, ou aucun enseignement.
 */
export function restriction(etat, prof, classeId) {
  const classe = trouverClasse(etat, classeId);
  if (classe && classe.ppId === prof.id) return null;
  const x = enseignementDans(prof, classeId);
  return x && (x.type === 'lvb' || x.type === 'option') ? x : null;
}

/** Nom de la LVB ou de l'option d'un enseignement (« Espagnol »). */
export function nomReference(etat, x) {
  const ref = (x.type === 'lvb' ? etat.lvb : etat.options).find((o) => o.id === x.refId);
  return ref ? ref.nom : '?';
}

/** Professeurs de l'équipe d'un élève, dans l'ordre de la liste des professeurs. */
export const equipeEleve = (etat, eleve) => etat.profs.filter((p) => dansEquipe(etat, p, eleve));
