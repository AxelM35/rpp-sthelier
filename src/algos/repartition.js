// Répartition des élèves entre les binômes qui peuvent les recevoir.

import { comparerEleves, libelleBinome, profsDuBinome } from '../modele/acces.js';
import { copierEtat } from '../modele/etat.js';
import { comparer } from '../utils/texte.js';
import { capacite, creneaux } from './creneaux.js';
import { chargesActuelles, ecartCharges } from './equilibre.js';
import { groupesDuBinome, grouperEleves } from './groupes.js';
import { calculerQuotas } from './quotas.js';

/**
 * Affecte chaque élève non verrouillé à un binôme qui peut le recevoir : sa classe fait partie des classes du binôme
 * et les deux professeurs appartiennent à son équipe (règle V2-R2). Les charges sont équilibrées ; les élèves de
 * chaque groupe (classe et équipe identiques) sont distribués par ordre alphabétique. Renvoie { etat, rapport }.
 */
export function repartirEleves(etatInitial) {
  const etat = copierEtat(etatInitial);
  const liste = creneaux(etat.soiree);

  const base = {};
  const aPlacer = [];
  etat.eleves.forEach((e) => {
    if (e.verrou && e.binomeId) {
      base[e.binomeId] = (base[e.binomeId] || 0) + 1;
    } else {
      e.binomeId = null;
      e.slot = null;
      aPlacer.push(e);
    }
  });
  const groupes = grouperEleves(etat, aPlacer);
  const besoins = Object.fromEntries(groupes.map((g) => [g.id, g.eleves.length]));
  const bins = etat.binomes.map((b) => ({
    id: b.id,
    classeIds: groupesDuBinome(etat, b, groupes),
    cap: capacite(profsDuBinome(etat, b), liste),
  }));

  const q = calculerQuotas(bins, besoins, base);
  const ordre = etat.binomes.slice().sort((a, b) => comparer(libelleBinome(etat, a), libelleBinome(etat, b)));
  groupes.forEach((g) => {
    const eleves = g.eleves.slice().sort(comparerEleves);
    let i = 0;
    ordre.forEach((b) => {
      for (let k = 0; k < (q.x[b.id][g.id] || 0); k++) eleves[i++].binomeId = b.id;
    });
  });

  const reste = etat.eleves.filter((e) => !e.binomeId).length;
  if (reste) {
    return {
      etat,
      rapport: { ok: false, txt: reste + ' élève(s) sans binôme : la capacité des binômes qui peuvent les recevoir est insuffisante.' },
    };
  }
  const c = ecartCharges(chargesActuelles(etat));
  const txt =
    'Tous les élèves sont répartis : ' +
    (c.min === c.max ? c.max : 'de ' + c.min + ' à ' + c.max) +
    ' élèves par binôme' +
    (c.limites ? ', hors ' + c.limites + ' binôme(s) limité(s) à une LVB ou une option' : '') +
    (c.reduit ? ' (moins pour les binômes dont un professeur est présent sur une partie de la soirée).' : '.');
  return { etat, rapport: { ok: true, txt } };
}
