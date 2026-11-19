// Répartition des élèves entre les binômes de leur classe.

import { comparerEleves, libelleBinome, profsDuBinome } from '../modele/acces.js';
import { copierEtat } from '../modele/etat.js';
import { comparer } from '../utils/texte.js';
import { capacite, creneaux } from './creneaux.js';
import { chargesActuelles, ecartCharges } from './equilibre.js';
import { calculerQuotas } from './quotas.js';

/**
 * Affecte chaque élève non verrouillé à un binôme qui reçoit sa classe, en équilibrant les charges.
 * Les élèves sont distribués par ordre alphabétique. Renvoie { etat, rapport }.
 */
export function repartirEleves(etatInitial) {
  const etat = copierEtat(etatInitial);
  const liste = creneaux(etat.soiree);
  const bins = etat.binomes.map((b) => ({ id: b.id, classeIds: b.classeIds, cap: capacite(profsDuBinome(etat, b), liste) }));

  const base = {};
  const besoins = {};
  etat.eleves.forEach((e) => {
    if (e.verrou && e.binomeId) {
      base[e.binomeId] = (base[e.binomeId] || 0) + 1;
    } else {
      e.binomeId = null;
      e.slot = null;
      besoins[e.classeId] = (besoins[e.classeId] || 0) + 1;
    }
  });

  const q = calculerQuotas(bins, besoins, base);
  const ordre = etat.binomes.slice().sort((a, b) => comparer(libelleBinome(etat, a), libelleBinome(etat, b)));
  Object.keys(besoins).forEach((c) => {
    const aPlacer = etat.eleves.filter((e) => e.classeId === c && !e.binomeId).sort(comparerEleves);
    let i = 0;
    ordre.forEach((b) => {
      for (let k = 0; k < (q.x[b.id][c] || 0); k++) aPlacer[i++].binomeId = b.id;
    });
  });

  const reste = etat.eleves.filter((e) => !e.binomeId).length;
  if (reste) {
    return {
      etat,
      rapport: { ok: false, txt: reste + ' élève(s) sans binôme : la capacité des binômes de leur classe est insuffisante.' },
    };
  }
  const c = ecartCharges(chargesActuelles(etat));
  const txt =
    'Tous les élèves sont répartis : ' +
    (c.min === c.max ? c.max : 'de ' + c.min + ' à ' + c.max) +
    ' élèves par binôme' +
    (c.reduit ? ' (moins pour les binômes dont un professeur est présent sur une partie de la soirée).' : '.');
  return { etat, rapport: { ok: true, txt } };
}
