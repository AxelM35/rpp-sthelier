// Groupes d'élèves : élèves d'une même classe qui ont la même équipe (cahier des charges v2, section 4.4).
//
// Ce sont les unités du calcul des binômes et de la répartition. Un binôme peut recevoir un groupe si la classe
// du groupe fait partie des classes du binôme et si ses deux professeurs appartiennent à l'équipe du groupe
// (règle V2-R2). Quand tous les enseignements portent sur la classe entière, chaque classe forme un seul groupe :
// le calcul est alors celui de la version 1.
//
// Les élèves prioritaires d'une classe qui a un professeur principal forment des groupes à part (« pp » : id du
// professeur principal), que seul un binôme comprenant ce professeur peut recevoir (V2-R11). Servis par un seul
// binôme, ils sont placés en premier par calculerQuotas (V2-F6). S'ils ne tiennent pas tous dans ce binôme, les
// autres sont reçus par un autre binôme de leur équipe (repli, décision 3 du lot 4 : voir quotasAvecRepli).

import { classesTriees, comparerEleves, nomClasse, profsDuBinome } from '../modele/acces.js';
import { dansEquipe, nomReference, restriction } from '../modele/equipe.js';
import { capacite, creneaux } from './creneaux.js';
import { calculerQuotas } from './quotas.js';

/** Professeur principal qui doit recevoir l'élève (id), s'il est prioritaire et que sa classe en a un ; sinon null. */
export function ppExige(etat, e) {
  if (!e.prioritaire) return null;
  const classe = etat.classes.find((c) => c.id === e.classeId);
  return (classe && classe.ppId && etat.profs.some((p) => p.id === classe.ppId) && classe.ppId) || null;
}

/**
 * Groupes des élèves donnés (par défaut : tous), dans l'ordre des classes puis d'apparition des élèves.
 * Renvoie [{ id, classeId, equipe: Set d'ids de professeurs, pp: id du professeur principal exigé ou null,
 * eleves: [élève] }].
 */
export function grouperEleves(etat, eleves = etat.eleves) {
  const parCle = new Map();
  for (const e of eleves) {
    const equipe = etat.profs.filter((p) => dansEquipe(etat, p, e)).map((p) => p.id);
    const pp = ppExige(etat, e);
    const cle = e.classeId + '|' + equipe.join(',') + (pp ? '|pp' : '');
    if (!parCle.has(cle)) parCle.set(cle, { id: 'g' + parCle.size, classeId: e.classeId, equipe: new Set(equipe), pp, eleves: [] });
    parCle.get(cle).eleves.push(e);
  }
  const rang = new Map(etat.classes.map((c, i) => [c.id, i]));
  return [...parCle.values()].sort((a, b) => rang.get(a.classeId) - rang.get(b.classeId));
}

/**
 * Le groupe peut-il être reçu par ces professeurs (ids) dans ces classes ? Les deux appartiennent à l'équipe du groupe
 * (V2-R2) ; pour des élèves prioritaires, l'un d'eux est leur professeur principal (V2-R11).
 */
export const recevable = (g, profIds, classeIds) =>
  classeIds.includes(g.classeId) && profIds.every((id) => g.equipe.has(id)) && (!g.pp || profIds.includes(g.pp));

/**
 * Quotas d'élèves par binôme et par groupe (calculerQuotas), avec repli des élèves prioritaires (décision 3 du lot 4).
 * bins : [{ id, cap, classeIds: ids des groupes qu'il peut recevoir }]. Si des élèves prioritaires ne trouvent pas de
 * place chez le binôme de leur professeur principal (présence partielle, binôme plein, pas de binôme), ceux qui
 * restent (les derniers par ordre alphabétique) forment un groupe de repli, sans exigence de professeur principal,
 * que peut recevoir tout binôme pour lequel « peutRepli(bin, groupe) » est vrai. Sans ce cas, le résultat est
 * exactement celui de calculerQuotas.
 * Les élèves prioritaires, repli compris, sont placés avant les autres (V2-F6).
 * Renvoie le résultat de calculerQuotas, plus { groupes (repli compris), horsPP : élèves prioritaires placés
 * ailleurs que chez leur professeur principal, manquePrio : élèves prioritaires sans place }.
 */
export function quotasAvecRepli(bins, groupes, peutRepli, base = {}) {
  const besoins = Object.fromEntries(groupes.map((g) => [g.id, g.eleves.length]));
  const prioritaires = new Set(groupes.filter((g) => g.pp).map((g) => g.id));
  const q = calculerQuotas(bins, besoins, base, prioritaires);
  const enManque = groupes.filter((g) => g.pp && q.nonPlaces[g.id]);
  if (!enManque.length) return { ...q, groupes, horsPP: 0, manquePrio: 0 };

  const repli = [];
  const groupes2 = groupes.map((g) => {
    if (!enManque.includes(g)) return g;
    const eleves = g.eleves.slice().sort(comparerEleves);
    const garde = eleves.length - q.nonPlaces[g.id];
    repli.push({ ...g, id: g.id + 'r', pp: null, repliDe: g.id, eleves: eleves.slice(garde) });
    return { ...g, eleves: eleves.slice(0, garde) };
  });
  const tous = groupes2.concat(repli);
  const bins2 = bins.map((b) => ({ ...b, classeIds: b.classeIds.concat(repli.filter((r) => peutRepli(b, r)).map((r) => r.id)) }));
  repli.forEach((r) => prioritaires.add(r.id));
  const q2 = calculerQuotas(bins2, Object.fromEntries(tous.map((g) => [g.id, g.eleves.length])), base, prioritaires);
  const horsPP = repli.reduce((n, r) => n + r.eleves.length - (q2.nonPlaces[r.id] || 0), 0);
  const manquePrio = [...prioritaires].reduce((n, id) => n + (q2.nonPlaces[id] || 0), 0);
  return { ...q2, groupes: tous, horsPP, manquePrio };
}

/** Fonction peutRepli de quotasAvecRepli pour des binômes de l'état (bins dont l'id est celui du binôme). */
export function repliPour(etat) {
  return (bin, groupe) => {
    const b = etat.binomes.find((x) => x.id === bin.id);
    return (
      Boolean(b) &&
      recevable(
        groupe,
        profsDuBinome(etat, b).map((p) => p.id),
        b.classeIds,
      )
    );
  };
}

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
 * sans avoir le même profil (« Allemand ou Espagnol · ULIS »), trois au plus. Élèves prioritaires : « ★ Prioritaires · … ».
 */
export function libelleGroupe(etat, g) {
  const profils = [...new Set(g.eleves.map((e) => profilEleve(etat, e)))];
  return (g.pp ? '★ Prioritaires · ' : '') + profils.slice(0, 3).join(' ou ') + (profils.length > 3 ? ' ou …' : '');
}

/**
 * Couverture des élèves par les binômes actuels (tableau de l'onglet Binômes, V2-F7), par classe :
 * [{ classe, eleves, binomes, glissants, manque, groupes: [{ libelle, eleves, binomes, manque }] }].
 * « groupes » n'est rempli que si la classe compte plusieurs groupes.
 */
export function couverture(etat) {
  const liste = creneaux(etat.soiree);
  const groupes = grouperEleves(etat);
  const bins = etat.binomes.map((b) => ({
    id: b.id,
    classeIds: groupesDuBinome(etat, b, groupes),
    cap: capacite(profsDuBinome(etat, b), liste),
  }));
  const q = quotasAvecRepli(bins, groupes, repliPour(etat));
  // Élèves sans place d'un groupe, repli compris.
  const manque = (g) => (q.nonPlaces[g.id] || 0) + (q.nonPlaces[g.id + 'r'] || 0);
  return classesTriees(etat).map((c) => {
    const bs = etat.binomes.filter((b) => b.classeIds.includes(c.id));
    const siens = groupes.filter((g) => g.classeId === c.id);
    return {
      classe: c,
      nom: nomClasse(etat, c.id),
      eleves: siens.reduce((n, g) => n + g.eleves.length, 0),
      binomes: bs.length,
      glissants: bs.filter((b) => b.classeIds.length > 1).length,
      manque: siens.reduce((n, g) => n + manque(g), 0),
      groupes:
        siens.length > 1
          ? siens.map((g) => ({
              libelle: libelleGroupe(etat, g),
              eleves: g.eleves.length,
              binomes: bins.filter((b) => b.classeIds.includes(g.id)).length,
              manque: manque(g),
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
