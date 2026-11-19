// Attribution des horaires aux élèves répartis.

import { comparerEleves, profsDuBinome } from '../modele/acces.js';
import { copierEtat } from '../modele/etat.js';
import { creneaux, disponibilites, familleDisponible } from './creneaux.js';

/** Code de fratrie normalisé (vide si aucun). */
export const cleFratrie = (e) => (e.fratrie || '').trim().toLowerCase();

const estContraint = (e) => Boolean(e.pasAvant || e.pasApres);

/**
 * Place chaque élève réparti sur un créneau de son binôme.
 * Ordre : rendez-vous verrouillés conservés, puis fratries sur des créneaux consécutifs,
 * puis familles contraintes, puis les autres par ordre alphabétique (couplage biparti).
 * Renvoie { etat, rapport }.
 */
export function planifierHoraires(etatInitial) {
  const etat = copierEtat(etatInitial);
  const liste = creneaux(etat.soiree);
  const occupe = {};
  etat.binomes.forEach((b) => (occupe[b.id] = disponibilites(profsDuBinome(etat, b), liste).map((ok) => (ok ? null : 'absent'))));
  etat.eleves.forEach((e) => {
    if (!e.binomeId) return;
    if (e.verrou && e.slot != null) occupe[e.binomeId][e.slot] = e.id;
    else e.slot = null;
  });
  const libre = (e, s) => s >= 0 && s < liste.length && occupe[e.binomeId][s] === null && familleDisponible(e, liste[s]);

  // Fratries : premier bloc de créneaux consécutifs libres pour tous.
  const fratries = {};
  etat.eleves.forEach((e) => {
    const k = cleFratrie(e);
    if (k && e.binomeId) (fratries[k] = fratries[k] || []).push(e);
  });
  Object.values(fratries).forEach((groupe) => {
    if (groupe.length < 2 || groupe.some((e) => e.slot != null)) return;
    for (let s = 0; s < liste.length; s++) {
      const possible = groupe.every((e, i) => libre(e, s + i) && (i === 0 || liste[s + i].d === liste[s + i - 1].f));
      if (possible) {
        groupe.forEach((e, i) => {
          e.slot = s + i;
          occupe[e.binomeId][s + i] = e.id;
        });
        break;
      }
    }
  });

  etat.binomes.forEach((b) => {
    const aPlacer = etat.eleves.filter((e) => e.binomeId === b.id && e.slot == null);
    const possibles = new Map(aPlacer.map((e) => [e.id, liste.map((_, s) => s).filter((s) => libre(e, s))]));
    aPlacer.sort(
      (a, c) =>
        estContraint(c) - estContraint(a) ||
        (estContraint(a) ? possibles.get(a.id).length - possibles.get(c.id).length : 0) ||
        comparerEleves(a, c),
    );
    // Couplage élève ↔ créneau par chemins augmentants.
    const parCreneau = {};
    const essayer = (e, vus) => {
      for (const s of possibles.get(e.id)) {
        if (vus.has(s)) continue;
        vus.add(s);
        if (!parCreneau[s] || essayer(parCreneau[s], vus)) {
          parCreneau[s] = e;
          return true;
        }
      }
      return false;
    };
    aPlacer.forEach((e) => essayer(e, new Set()));
    // Les élèves sans contrainte sont remis dans l'ordre alphabétique sur leurs créneaux.
    const creneauxLibres = Object.keys(parCreneau)
      .map(Number)
      .filter((s) => !estContraint(parCreneau[s]))
      .sort((a, c) => a - c);
    const ordonnes = creneauxLibres.map((s) => parCreneau[s]).sort(comparerEleves);
    creneauxLibres.forEach((s, i) => (parCreneau[s] = ordonnes[i]));
    Object.keys(parCreneau).forEach((s) => (parCreneau[s].slot = Number(s)));
  });

  const reste = etat.eleves.filter((e) => e.binomeId && e.slot == null).length;
  return {
    etat,
    rapport: reste
      ? { ok: false, txt: reste + " élève(s) n'ont pas pu être placés (créneaux ou contraintes horaires)." }
      : { ok: true, txt: 'Horaires générés pour tous les élèves répartis.' },
  };
}
