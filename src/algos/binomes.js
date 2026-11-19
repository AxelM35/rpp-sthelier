// Proposition automatique des binômes de professeurs.
//
// Principe : on construit de nombreuses compositions possibles (de façon gloutonne, avec un peu de
// hasard) et on garde la meilleure selon un score qui pénalise, par ordre d'importance :
// les élèves sans place, le nombre de binômes (ou de professeurs inoccupés), le déséquilibre
// des charges et le nombre de binômes glissants.

import { ESSAIS_PROPOSITION, GRAINE_PROPOSITION } from '../config.js';
import { binomeComplet, classesDuBinome, effectifs, libelleBinome, nomClasse, profsDuBinome, trouverBinome } from '../modele/acces.js';
import { copierEtat } from '../modele/etat.js';
import { creerAlea } from '../utils/alea.js';
import { comparer, nouvelId } from '../utils/texte.js';
import { capacite, creneaux, disponibilites } from './creneaux.js';
import { ecartCharges } from './equilibre.js';
import { calculerQuotas } from './quotas.js';

/**
 * Binômes conservés par une nouvelle proposition : ceux marqués « Conservé »
 * et ceux qui contiennent un rendez-vous verrouillé.
 */
export function binomesConserves(etat) {
  return etat.binomes.filter((b) => binomeComplet(etat, b) && (b.fixe || etat.eleves.some((e) => e.verrou && e.binomeId === b.id)));
}

/**
 * Propose des binômes pour recevoir tous les élèves.
 * Renvoie un nouvel état (l'état reçu n'est pas modifié) et un rapport { ok, txt }.
 * Les binômes conservés sont gardés ; les élèves des autres binômes perdent binôme et horaire.
 */
export function proposerBinomes(etatInitial, { alea = creerAlea(GRAINE_PROPOSITION), essais = ESSAIS_PROPOSITION } = {}) {
  const etat = copierEtat(etatInitial);
  const liste = creneaux(etat.soiree);
  const n = effectifs(etat);
  const mode = etat.opt.mode;
  const classes = etat.classes.filter((c) => n[c.id] > 0).map((c) => c.id);
  const profs = etat.profs.map((p) => ({ p, cs: p.classeIds.filter((c) => classes.includes(c)) })).filter((o) => o.cs.length);

  if (!liste.length) return { etat: etatInitial, rapport: { ok: false, txt: 'Aucun créneau : vérifiez les horaires de la soirée.' } };
  if (!classes.length || profs.length < 2) {
    return {
      etat: etatInitial,
      rapport: { ok: false, txt: 'Il faut des élèves et au moins deux professeurs rattachés à leurs classes.' },
    };
  }

  const capacites = new Map();
  const capPaire = (a, b) => {
    const cle = a.p.id < b.p.id ? a.p.id + b.p.id : b.p.id + a.p.id;
    if (!capacites.has(cle)) capacites.set(cle, disponibilites([a.p, b.p], liste).filter(Boolean).length);
    return capacites.get(cle);
  };
  const communes = (a, b) => a.cs.filter((c) => b.cs.includes(c));

  const fixes = binomesConserves(etat);
  const profsFixes = new Set(fixes.flatMap((b) => b.profIds));
  const disponibles = profs.filter((o) => !profsFixes.has(o.p.id));

  // Une construction gloutonne. « bruit » perturbe les choix, « pGliss » règle la tendance aux glissants.
  function construire(bruit, pGliss) {
    const reste = { ...n };
    const libres = new Set(disponibles);
    const bins = [];

    fixes.forEach((b) => {
      const k = capacite(profsDuBinome(etat, b), liste);
      let r = k;
      b.classeIds.forEach((c) => {
        if (c in reste) {
          const t = Math.min(r, Math.max(0, reste[c]));
          reste[c] -= t;
          r -= t;
        }
      });
      bins.push({ fixe: b, classeIds: b.classeIds.slice(), cap: k });
    });

    // Souplesse d'un professeur : nombre d'autres classes encore à couvrir où il enseigne.
    const souplesse = (o, c) => o.cs.filter((k) => k !== c && reste[k] > 0).length;

    for (let garde = 0; garde < 200; garde++) {
      const aCouvrir = classes.filter((c) => reste[c] > 0 && [...libres].filter((o) => o.cs.includes(c)).length >= 2);
      if (!aCouvrir.length) break;
      const c = aCouvrir.reduce((a, b) => (reste[b] + alea() * bruit * 2 > reste[a] + alea() * bruit * 2 ? b : a));
      const candidats = [...libres].filter((o) => o.cs.includes(c));
      let meilleur = null;
      for (let i = 0; i < candidats.length; i++) {
        for (let j = i + 1; j < candidats.length; j++) {
          const a = candidats[i];
          const b = candidats[j];
          const k = capPaire(a, b);
          if (!k) continue;
          const autres = communes(a, b).filter((o) => o !== c && reste[o] > 0);
          let score;
          if (reste[c] >= k) {
            score = k * 3 - (souplesse(a, c) + souplesse(b, c));
          } else {
            const libre = k - reste[c];
            const glisse = pGliss && autres.length ? Math.max(...autres.map((o) => Math.min(libre, reste[o]))) : 0;
            score = k * 3 + glisse * 2 - (souplesse(a, c) + souplesse(b, c)) * (glisse ? 0.3 : 1);
          }
          score += alea() * bruit;
          if (!meilleur || score > meilleur.score) meilleur = { score, a, b, k, autres };
        }
      }
      if (!meilleur) {
        reste[c] = -Math.abs(reste[c]) || -1; // classe impossible à couvrir : on la met de côté
        continue;
      }
      const bin = { profs: [meilleur.a, meilleur.b], classeIds: [c], cap: meilleur.k };
      const pris = Math.min(meilleur.k, reste[c]);
      reste[c] -= pris;
      if (pris < meilleur.k && meilleur.autres.length && alea() < pGliss) {
        const place = meilleur.k - pris;
        const o = meilleur.autres.reduce((x, y) => (Math.min(place, reste[y]) > Math.min(place, reste[x]) ? y : x));
        bin.classeIds.push(o);
        reste[o] -= Math.min(place, reste[o]);
      }
      libres.delete(meilleur.a);
      libres.delete(meilleur.b);
      bins.push(bin);
    }

    if (mode === 'tous') {
      // Les professeurs restants renforcent les classes les plus chargées.
      for (let garde = 0; garde < 200; garde++) {
        const couverture = {};
        classes.forEach((c) => (couverture[c] = 0));
        bins.forEach((b) => b.classeIds.forEach((c) => (couverture[c] += 1 / b.classeIds.length)));
        const L = [...libres];
        let meilleur = null;
        for (let i = 0; i < L.length; i++) {
          for (let j = i + 1; j < L.length; j++) {
            const k = capPaire(L[i], L[j]);
            if (!k) continue;
            for (const c of communes(L[i], L[j])) {
              const score = n[c] / (couverture[c] || 0.01) + alea() * bruit * 0.2;
              if (!meilleur || score > meilleur.score) meilleur = { score, a: L[i], b: L[j], c, k };
            }
          }
        }
        if (!meilleur) break;
        bins.push({ profs: [meilleur.a, meilleur.b], classeIds: [meilleur.c], cap: meilleur.k });
        libres.delete(meilleur.a);
        libres.delete(meilleur.b);
      }
    }

    bins.forEach((b, i) => (b.id = 'b' + i));
    const q = calculerQuotas(bins, n);
    const glissants = bins.filter((b) => b.classeIds.length > 1).length;
    const ecart = ecartCharges(bins.map((b) => ({ n: q.charge[b.id], cap: b.cap }))).ecart;
    const score =
      q.manque * 1e5 +
      (mode === 'min' ? bins.length : libres.size) * 100 +
      Math.max(0, ecart - 2) * 300 +
      Math.max(0, ecart - 1) * 40 +
      glissants * 10 +
      ecart;
    return { bins, q, score, libres: libres.size };
  }

  let meilleur = null;
  for (let i = 0; i < essais; i++) {
    const r = construire(i ? 4 : 0, [1, 0, 0.5][i % 3]);
    if (!meilleur || r.score < meilleur.score) meilleur = r;
  }

  // Un binôme glissant qui ne reçoit finalement aucun élève d'une de ses classes la perd.
  meilleur.bins.forEach((b) => {
    if (!b.fixe && b.classeIds.length > 1) {
      const utiles = b.classeIds.filter((c) => (meilleur.q.x[b.id][c] || 0) > 0);
      if (utiles.length) b.classeIds = utiles;
    }
  });

  const anciens = etat.binomes;
  etat.binomes = meilleur.bins
    .map((b) => {
      if (b.fixe) return b.fixe;
      const ids = b.profs.map((o) => o.p.id);
      const ancien = anciens.find((x) => ids.every((i) => x.profIds.includes(i)));
      return { id: nouvelId(), fixe: false, profIds: ids, classeIds: b.classeIds, salle: ancien ? ancien.salle : '' };
    })
    .sort((a, b) => comparer(classesDuBinome(etat, a) + libelleBinome(etat, a), classesDuBinome(etat, b) + libelleBinome(etat, b)));

  const idsFixes = new Set(fixes.map((b) => b.id));
  etat.eleves.forEach((e) => {
    if (!(e.verrou && e.slot != null && idsFixes.has(e.binomeId) && trouverBinome(etat, e.binomeId))) {
      e.binomeId = null;
      e.slot = null;
      e.verrou = false;
    }
  });

  const glissants = etat.binomes.filter((b) => b.classeIds.length > 1).length;
  let txt =
    etat.binomes.length + ' binômes proposés' + (glissants ? ' dont ' + glissants + ' glissant' + (glissants > 1 ? 's' : '') : '') + '. ';
  const verrous = etat.eleves.filter((e) => e.verrou).length;
  if (fixes.length)
    txt += fixes.length + ' binôme(s) conservé(s)' + (verrous ? ', avec ' + verrous + ' rendez-vous verrouillé(s)' : '') + '. ';
  if (meilleur.q.manque) {
    txt +=
      'Capacité insuffisante : ' +
      Object.keys(meilleur.q.nonPlaces)
        .map((c) => {
          const k = meilleur.q.nonPlaces[c];
          return nomClasse(etat, c) + ' (il manque ' + k + ' créneau' + (k > 1 ? 'x' : '') + ')';
        })
        .join(', ') +
      '. Allongez la soirée, raccourcissez les rendez-vous ou complétez les équipes pédagogiques.';
    return { etat, rapport: { ok: false, txt, manque: meilleur.q.nonPlaces } };
  }
  txt +=
    'Chaque élève peut obtenir un rendez-vous.' + (meilleur.libres ? ' ' + meilleur.libres + ' professeur(s) restent sans binôme.' : '');
  return { etat, rapport: { ok: true, txt } };
}
