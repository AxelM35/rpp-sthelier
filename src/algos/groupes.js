// Groupes d'élèves : élèves d'une même classe qui ont la même équipe (cahier des charges v2, section 4.4).
//
// Ce sont les unités du calcul des binômes et de la répartition. Un binôme peut recevoir un groupe si la classe
// du groupe fait partie des classes du binôme et si ses deux professeurs appartiennent à l'équipe du groupe
// (règle V2-R2). Quand tous les enseignements portent sur la classe entière, chaque classe forme un seul groupe :
// le calcul est alors celui de la version 1.

import { classesTriees, nomClasse, profsDuBinome } from '../modele/acces.js';
import { dansEquipe, nomReference, restriction } from '../modele/equipe.js';
import { capacite, creneaux } from './creneaux.js';
import { calculerQuotas } from './quotas.js';

/**
 * Groupes des élèves donnés (par défaut : tous), dans l'ordre des classes puis d'apparition des élèves.
 * Renvoie [{ id, classeId, equipe: Set d'ids de professeurs, eleves: [élève] }].
 */
export function grouperEleves(etat, eleves = etat.eleves) {
  const parCle = new Map();
  for (const e of eleves) {
    const equipe = etat.profs.filter((p) => dansEquipe(etat, p, e)).map((p) => p.id);
    const cle = e.classeId + '|' + equipe.join(',');
    if (!parCle.has(cle)) parCle.set(cle, { id: 'g' + parCle.size, classeId: e.classeId, equipe: new Set(equipe), eleves: [] });
    parCle.get(cle).eleves.push(e);
  }
  const rang = new Map(etat.classes.map((c, i) => [c.id, i]));
  return [...parCle.values()].sort((a, b) => rang.get(a.classeId) - rang.get(b.classeId));
}

/** Le groupe peut-il être reçu par ces professeurs (ids) dans ces classes ? */
export const recevable = (g, profIds, classeIds) => classeIds.includes(g.classeId) && profIds.every((id) => g.equipe.has(id));

/** Ids des groupes qu'un binôme de l'état peut recevoir, dans l'ordre de ses classes. */
export function groupesDuBinome(etat, b, groupes) {
  const ids = profsDuBinome(etat, b).map((p) => p.id);
  return b.classeIds.flatMap((c) => groupes.filter((g) => g.classeId === c && recevable(g, ids, [c])).map((g) => g.id));
}

/**
 * Deux professeurs peuvent-ils former un binôme pour une classe (décision du 20 novembre, question 4c) ?
 * Non s'ils sont tous deux limités à une LVB ou une option différente : ils ne recevraient que les élèves
 * qui suivent les deux. Oui pour une même LVB ou option.
 */
export function compatibles(etat, p1, p2, classeId) {
  const a = restriction(etat, p1, classeId);
  const b = restriction(etat, p2, classeId);
  return !(a && b && (a.type !== b.type || a.refId !== b.refId));
}

/** Le binôme est-il limité à une partie d'une de ses classes (LVB ou option) ? Il sort alors du calcul de l'écart. */
export const binomeLimite = (etat, profs, classeIds) => classeIds.some((c) => profs.some((p) => restriction(etat, p, c)));

/** Profil d'un élève : LVB, options et ULIS (« Espagnol · Latin »), ou « Sans LVB ni option ». */
export function profilEleve(etat, e) {
  const parties = [];
  if (e.lvbId) parties.push(nomReference(etat, { type: 'lvb', refId: e.lvbId }));
  e.optionIds.forEach((o) => parties.push(nomReference(etat, { type: 'option', refId: o })));
  if (e.ulis) parties.push('ULIS');
  return parties.join(' · ') || 'Sans LVB ni option';
}

/**
 * Libellé d'un groupe : le profil de ses élèves, ou leurs différents profils quand ils ont la même équipe
 * sans avoir le même profil (« Allemand ou Espagnol · ULIS »), trois au plus.
 */
export function libelleGroupe(etat, g) {
  const profils = [...new Set(g.eleves.map((e) => profilEleve(etat, e)))];
  return profils.slice(0, 3).join(' ou ') + (profils.length > 3 ? ' ou …' : '');
}

/**
 * Couverture des élèves par les binômes actuels (tableau de l'onglet Binômes, V2-F7), par classe :
 * [{ classe, eleves, binomes, glissants, manque, groupes: [{ libelle, eleves, binomes, manque }] }].
 * « groupes » n'est rempli que si la classe compte plusieurs groupes.
 */
export function couverture(etat) {
  const liste = creneaux(etat.soiree);
  const groupes = grouperEleves(etat);
  const besoins = Object.fromEntries(groupes.map((g) => [g.id, g.eleves.length]));
  const bins = etat.binomes.map((b) => ({
    id: b.id,
    classeIds: groupesDuBinome(etat, b, groupes),
    cap: capacite(profsDuBinome(etat, b), liste),
  }));
  const q = calculerQuotas(bins, besoins);
  return classesTriees(etat).map((c) => {
    const bs = etat.binomes.filter((b) => b.classeIds.includes(c.id));
    const siens = groupes.filter((g) => g.classeId === c.id);
    return {
      classe: c,
      nom: nomClasse(etat, c.id),
      eleves: siens.reduce((n, g) => n + g.eleves.length, 0),
      binomes: bs.length,
      glissants: bs.filter((b) => b.classeIds.length > 1).length,
      manque: siens.reduce((n, g) => n + (q.nonPlaces[g.id] || 0), 0),
      groupes:
        siens.length > 1
          ? siens.map((g) => ({
              libelle: libelleGroupe(etat, g),
              eleves: g.eleves.length,
              binomes: bins.filter((b) => b.classeIds.includes(g.id)).length,
              manque: q.nonPlaces[g.id] || 0,
            }))
          : [],
    };
  });
}

/** Professeurs limités (LVB ou option) d'un binôme, avec ce qui les limite, par classe : pour les messages. */
export function limitesDuBinome(etat, b) {
  const profs = profsDuBinome(etat, b);
  return b.classeIds.flatMap((c) =>
    profs
      .map((p) => restriction(etat, p, c))
      .filter(Boolean)
      .map((x) => ({ classeId: c, nom: nomReference(etat, x) })),
  );
}
