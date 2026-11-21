// Proposition automatique des binômes de professeurs.
//
// Principe : on construit de nombreuses compositions possibles (de façon gloutonne, avec un peu de
// hasard) et on garde la meilleure selon un score qui pénalise, par ordre d'importance :
// les élèves sans place, les élèves prioritaires reçus sans leur professeur principal, le nombre de binômes
// (ou de professeurs inoccupés), le déséquilibre des charges et le nombre de binômes glissants.
// Le professeur principal d'une classe qui a des élèves prioritaires est toujours placé dans un binôme (V2-R11).

import { ESSAIS_PROPOSITION, GRAINE_PROPOSITION } from '../config.js';
import {
  binomeComplet,
  classesDuBinome,
  classesPossibles,
  libelleBinome,
  nomClasse,
  profsDuBinome,
  trouverBinome,
} from '../modele/acces.js';
import { copierEtat } from '../modele/etat.js';
import { creerAlea } from '../utils/alea.js';
import { comparer, nouvelId } from '../utils/texte.js';
import { capacite, creneaux, disponibilites } from './creneaux.js';
import { ecartCharges } from './equilibre.js';
import { binomeLimite, compatibles, grouperEleves, quotasAvecRepli, recevable } from './groupes.js';

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
/**
 * Explore de nombreuses compositions possibles. Renvoie { erreur } si aucune proposition n'est possible,
 * sinon { candidats, fixes } : candidats triés du meilleur au moins bon score.
 */
function explorer(etatInitial, { alea, essais }) {
  const etat = copierEtat(etatInitial);
  const liste = creneaux(etat.soiree);
  const mode = etat.opt.mode;

  // Unités du calcul : les groupes d'élèves de même équipe (un seul par classe quand tout est « classe entière »).
  const groupes = grouperEleves(etat);
  const n = Object.fromEntries(groupes.map((g) => [g.id, g.eleves.length]));
  const groupesDe = {};
  groupes.forEach((g) => (groupesDe[g.classeId] = groupesDe[g.classeId] || []).push(g));
  const classes = etat.classes.filter((c) => groupesDe[c.id]).map((c) => c.id);
  const profs = etat.profs.map((p) => ({ p, cs: classesPossibles(etat, p).filter((c) => classes.includes(c)) })).filter((o) => o.cs.length);
  profs.forEach((o, k) => (o.k = k));

  if (!liste.length) return { erreur: { ok: false, txt: 'Aucun créneau : vérifiez les horaires de la soirée.' } };
  if (!classes.length || profs.length < 2) {
    return { erreur: { ok: false, txt: 'Il faut des élèves et au moins deux professeurs rattachés à leurs classes.' } };
  }

  const capacites = new Map();
  const capPaire = (a, b) => {
    const cle = a.p.id < b.p.id ? a.p.id + b.p.id : b.p.id + a.p.id;
    if (!capacites.has(cle)) capacites.set(cle, disponibilites([a.p, b.p], liste).filter(Boolean).length);
    return capacites.get(cle);
  };
  // Groupes d'une classe que deux professeurs peuvent recevoir ensemble (vide si la paire est interdite, question 4c).
  // Calcul mis en cache par paire puis par classe : il est demandé des milliers de fois.
  const eligibles = new Map();
  const groupesPaire = (a, b, c) => {
    const cle = a.k < b.k ? a.k * 4096 + b.k : b.k * 4096 + a.k;
    let parClasse = eligibles.get(cle);
    if (!parClasse) eligibles.set(cle, (parClasse = new Map()));
    let liste = parClasse.get(c);
    if (!liste) {
      const ids = [a.p.id, b.p.id];
      liste = compatibles(etat, a.p, b.p, c) ? (groupesDe[c] || []).filter((g) => recevable(g, ids, [c])) : [];
      parClasse.set(c, liste);
    }
    return liste;
  };
  // Binôme conservé (composé à la main) : la règle 4c ne s'applique pas, seule compte l'équipe des élèves.
  const groupesFixe = (ids, c) => (groupesDe[c] || []).filter((g) => recevable(g, ids, [c]));
  const groupesBin = (b, c) => (b.fixe ? groupesFixe(b.fixe.profIds, c) : groupesPaire(b.profs[0], b.profs[1], c));
  const paire = (a, b) => [a.p.id, b.p.id];
  const communes = (a, b) => a.cs.filter((c) => b.cs.includes(c) && groupesPaire(a, b, c).length);
  const limite = (ids, classeIds) =>
    binomeLimite(
      etat,
      ids.map((id) => etat.profs.find((p) => p.id === id)),
      classeIds,
    );

  // Professeur principal (entrée de « profs ») à placer en premier dans chaque classe qui a des élèves prioritaires.
  const ppDe = {};
  groupes.forEach((g) => {
    if (g.pp) ppDe[g.classeId] = profs.find((o) => o.p.id === g.pp) || null;
  });

  const fixes = binomesConserves(etat);
  const profsFixes = new Set(fixes.flatMap((b) => b.profIds));
  const disponibles = profs.filter((o) => !profsFixes.has(o.p.id));

  // Une construction gloutonne. « bruit » perturbe les choix, « pGliss » règle la tendance aux glissants,
  // « poidsPrio » favorise, pour le professeur principal, un partenaire qui peut recevoir ses élèves prioritaires.
  function construire(bruit, pGliss, poidsPrio) {
    const reste = { ...n }; // élèves restant à couvrir par groupe (négatif : groupe impossible à couvrir)
    const rc = {}; // élèves restant à couvrir par classe (somme des restes positifs de ses groupes)
    classes.forEach((c) => (rc[c] = groupesDe[c].reduce((t, g) => t + n[g.id], 0)));
    const libres = new Set(disponibles);
    const bins = [];
    const resteClasse = (c) => rc[c];
    const somme = (liste) => {
      let t = 0;
      for (const g of liste) if (reste[g.id] > 0) t += reste[g.id];
      return t;
    };
    const servable = (a, b, c) => somme(groupesPaire(a, b, c));
    // Élèves prioritaires que la paire peut recevoir (nul sans professeur principal dans la paire).
    const servablePrio = (a, b, c) => somme(groupesPaire(a, b, c).filter((g) => g.pp));
    // Retire jusqu'à « max » élèves des groupes de la liste (ceux qu'une paire peut recevoir dans la classe c).
    const prendre = (c, max, liste) => {
      let pris = 0;
      for (const g of liste) {
        const t = Math.min(max - pris, Math.max(0, reste[g.id]));
        reste[g.id] -= t;
        pris += t;
      }
      rc[c] -= pris;
      return pris;
    };

    fixes.forEach((b) => {
      const k = capacite(profsDuBinome(etat, b), liste);
      let r = k;
      b.classeIds.forEach((c) => {
        if (groupesDe[c]) r -= prendre(c, r, groupesFixe(b.profIds, c));
      });
      bins.push({ fixe: b, classeIds: b.classeIds.slice(), cap: k, limite: limite(b.profIds.filter(Boolean), b.classeIds) });
    });

    // Souplesse d'un professeur : nombre d'autres classes encore à couvrir où il peut recevoir des familles.
    const souplesse = (o, c) => o.cs.filter((k) => k !== c && resteClasse(k) > 0).length;

    for (let garde = 0; garde < 500; garde++) {
      const aCouvrir = classes.filter((c) => resteClasse(c) > 0 && [...libres].filter((o) => o.cs.includes(c)).length >= 2);
      if (!aCouvrir.length) break;
      const c = aCouvrir.reduce((a, b) => (resteClasse(b) + alea() * bruit * 2 > resteClasse(a) + alea() * bruit * 2 ? b : a));
      const candidats = [...libres].filter((o) => o.cs.includes(c));
      const total = resteClasse(c);
      let meilleur = null;
      // Élèves prioritaires (V2-R11). Premier passage : si la classe en a encore à couvrir, la paire comprend leur
      // professeur principal (s'il est libre) ; et aucune paire n'immobilise le professeur principal d'une autre classe
      // qui attend les siens, sauf si elle peut aussi les recevoir. À défaut de paire possible, choix habituel.
      const pp = ppDe[c];
      const exiger = pp && libres.has(pp) && groupesDe[c].some((g) => g.pp && reste[g.id] > 0);
      const enAttente = new Map(); // professeur principal libre d'une autre classe → cette classe
      for (const [x, o] of Object.entries(ppDe)) {
        if (x !== c && o && o !== pp && libres.has(o) && groupesDe[x].some((g) => g.pp && reste[g.id] > 0)) enAttente.set(o, x);
      }
      const bloque = (a, b) => [a, b].some((o) => enAttente.has(o) && !(o.cs.includes(c) && servablePrio(a, b, enAttente.get(o)) > 0));
      const contraint = exiger || enAttente.size > 0;
      for (const strict of contraint ? [true, false] : [false]) {
        if (meilleur) break;
        for (let i = 0; i < candidats.length; i++) {
          for (let j = i + 1; j < candidats.length; j++) {
            const a = candidats[i];
            const b = candidats[j];
            if (strict && ((exiger && a !== pp && b !== pp) || bloque(a, b))) continue;
            const k = capPaire(a, b);
            if (!k) continue;
            const utiles = servable(a, b, c);
            if (!utiles) continue;
            const autres = communes(a, b).filter((o) => o !== c && servable(a, b, o) > 0);
            let score;
            if (utiles >= k) {
              score = k * 3 - (souplesse(a, c) + souplesse(b, c));
            } else {
              const libre = k - utiles;
              const glisse = pGliss && autres.length ? Math.max(...autres.map((o) => Math.min(libre, servable(a, b, o)))) : 0;
              score = k * 3 + glisse * 2 - (souplesse(a, c) + souplesse(b, c)) * (glisse ? 0.3 : 1);
            }
            // Une paire limitée à une LVB ou une option laisse des élèves de la classe qu'une autre paire aurait reçus.
            score -= Math.max(0, Math.min(k, total) - utiles) * 3;
            // Partenaire du professeur principal qui peut recevoir ses élèves prioritaires (V2-R11). Une construction
            // sur deux seulement : le score départage ensuite élèves prioritaires reçus ailleurs et élèves sans place.
            if (poidsPrio) score += Math.min(k, servablePrio(a, b, c)) * poidsPrio;
            score += alea() * bruit;
            if (!meilleur || score > meilleur.score) meilleur = { score, a, b, k, autres };
          }
        }
      }
      if (!meilleur) {
        // Classe impossible à couvrir davantage : on met de côté ses groupes restants.
        groupesDe[c].forEach((g) => reste[g.id] > 0 && (reste[g.id] = -reste[g.id]));
        rc[c] = 0;
        continue;
      }
      const { a, b } = meilleur;
      const bin = { profs: [a, b], classeIds: [c], cap: meilleur.k };
      const pris = prendre(c, meilleur.k, groupesPaire(a, b, c));
      if (pris < meilleur.k && meilleur.autres.length && alea() < pGliss) {
        const place = meilleur.k - pris;
        const o = meilleur.autres.reduce((x, y) => (Math.min(place, servable(a, b, y)) > Math.min(place, servable(a, b, x)) ? y : x));
        bin.classeIds.push(o);
        prendre(o, place, groupesPaire(a, b, o));
      }
      bin.limite = limite(paire(a, b), bin.classeIds);
      libres.delete(meilleur.a);
      libres.delete(meilleur.b);
      bins.push(bin);
    }

    if (mode === 'tous') {
      // Les professeurs restants renforcent les classes les plus chargées, y compris auprès d'un seul groupe
      // (binôme limité à une LVB ou une option, question 4b).
      for (let garde = 0; garde < 200; garde++) {
        const couvert = {};
        classes.forEach((c) => (couvert[c] = 0));
        bins.forEach((b) => b.classeIds.forEach((c) => (couvert[c] += 1 / b.classeIds.length)));
        const L = [...libres];
        let meilleur = null;
        for (let i = 0; i < L.length; i++) {
          for (let j = i + 1; j < L.length; j++) {
            const k = capPaire(L[i], L[j]);
            if (!k) continue;
            for (const c of communes(L[i], L[j])) {
              const eleves = groupesPaire(L[i], L[j], c).reduce((t, g) => t + n[g.id], 0);
              const score = eleves / (couvert[c] || 0.01) + alea() * bruit * 0.2;
              if (!meilleur || score > meilleur.score) meilleur = { score, a: L[i], b: L[j], c, k };
            }
          }
        }
        if (!meilleur) break;
        const ids = paire(meilleur.a, meilleur.b);
        bins.push({ profs: [meilleur.a, meilleur.b], classeIds: [meilleur.c], cap: meilleur.k, limite: limite(ids, [meilleur.c]) });
        libres.delete(meilleur.a);
        libres.delete(meilleur.b);
      }
    }

    bins.forEach((b, i) => (b.id = 'b' + i));
    const parId = new Map(bins.map((b) => [b.id, b]));
    // Repli des élèves prioritaires chez un autre binôme de leur équipe (décision 3 du lot 4) : la paire peut recevoir
    // leur équipe, et la règle 4c s'applique comme pour les autres groupes (sauf binôme conservé).
    const peutRepli = (x, r) => {
      const b = parId.get(x.id);
      const ids = b.fixe ? b.fixe.profIds : paire(b.profs[0], b.profs[1]);
      return recevable(r, ids, b.classeIds) && (b.fixe || compatibles(etat, b.profs[0].p, b.profs[1].p, r.classeId));
    };
    const qg = quotasAvecRepli(
      bins.map((b) => ({ id: b.id, cap: b.cap, classeIds: b.classeIds.flatMap((c) => groupesBin(b, c).map((g) => g.id)) })),
      groupes,
      peutRepli,
    );
    const q = quotasParClasse(qg, qg.groupes);
    const glissants = bins.filter((b) => b.classeIds.length > 1).length;
    const ecart = ecartCharges(bins.map((b) => ({ n: q.charge[b.id], cap: b.cap, limite: b.limite }))).ecart;
    const score =
      (q.manque + qg.manquePrio) * 1e5 + // un élève prioritaire sans place compte double
      qg.horsPP * 1000 +
      (mode === 'min' ? bins.length : libres.size) * 100 +
      Math.max(0, ecart - 2) * 300 +
      Math.max(0, ecart - 1) * 40 +
      glissants * 10 +
      ecart;
    return { bins, q, score, libres: libres.size, horsPP: qg.horsPP };
  }

  const candidats = [];
  for (let i = 0; i < essais; i++) candidats.push(construire(i ? 4 : 0, [1, 0, 0.5][i % 3], Math.floor(i / 3) % 2 ? 0 : 6));
  candidats.sort((a, b) => a.score - b.score); // tri stable : à score égal, l'ordre de construction est conservé
  return { candidats, fixes: fixes.map((b) => b.id) };
}

/** Résultat de calculerQuotas, exprimé par groupe, ramené aux classes : x[binôme][classe] et nonPlaces[classe]. */
function quotasParClasse(q, groupes) {
  const classeDe = Object.fromEntries(groupes.map((g) => [g.id, g.classeId]));
  const x = {};
  for (const [b, parGroupe] of Object.entries(q.x)) {
    x[b] = {};
    for (const [g, k] of Object.entries(parGroupe)) x[b][classeDe[g]] = (x[b][classeDe[g]] || 0) + k;
  }
  const nonPlaces = {};
  for (const [g, k] of Object.entries(q.nonPlaces)) nonPlaces[classeDe[g]] = (nonPlaces[classeDe[g]] || 0) + k;
  return { x, charge: q.charge, nonPlaces, manque: q.manque };
}

/** Signature d'un binôme proposé (professeurs et classes), pour comparer des propositions. */
const signatureBin = (b) =>
  (b.fixe ? b.fixe.profIds : b.profs.map((o) => o.p.id)).slice().sort().join('+') + ':' + b.classeIds.slice().sort().join('+');

/** Nombre de binômes de la proposition a absents de la proposition b. */
function differences(a, b) {
  const presents = new Set(b.bins.map(signatureBin));
  return a.bins.filter((x) => !presents.has(signatureBin(x))).length;
}

/** Transforme une composition retenue en nouvel état, avec son rapport et ses indicateurs. */
function materialiser(etatInitial, candidat, idsFixes) {
  const etat = copierEtat(etatInitial);
  const anciens = etat.binomes;
  const fixes = new Set(idsFixes);

  // Un binôme glissant qui ne reçoit finalement aucun élève d'une de ses classes la perd.
  const classesUtiles = (b) => {
    if (b.fixe || b.classeIds.length < 2) return b.classeIds.slice();
    const utiles = b.classeIds.filter((c) => (candidat.q.x[b.id][c] || 0) > 0);
    return utiles.length ? utiles : b.classeIds.slice();
  };

  etat.binomes = candidat.bins
    .map((b) => {
      if (b.fixe) return anciens.find((x) => x.id === b.fixe.id);
      const ids = b.profs.map((o) => o.p.id);
      const ancien = anciens.find((x) => ids.every((i) => x.profIds.includes(i)));
      return { id: nouvelId(), fixe: false, profIds: ids, classeIds: classesUtiles(b), salle: ancien ? ancien.salle : '' };
    })
    .sort((a, b) => comparer(classesDuBinome(etat, a) + libelleBinome(etat, a), classesDuBinome(etat, b) + libelleBinome(etat, b)));

  etat.eleves.forEach((e) => {
    if (!(e.verrou && e.slot != null && fixes.has(e.binomeId) && trouverBinome(etat, e.binomeId))) {
      e.binomeId = null;
      e.slot = null;
      e.verrou = false;
    }
  });

  // Les binômes limités à une LVB ou une option ne comptent pas dans la charge affichée (question 4a).
  const comptes = candidat.bins.filter((b) => !b.limite);
  const charges = (comptes.length ? comptes : candidat.bins).map((b) => candidat.q.charge[b.id]);
  const indicateurs = {
    binomes: etat.binomes.length,
    glissants: etat.binomes.filter((b) => b.classeIds.length > 1).length,
    limites: candidat.bins.length - comptes.length,
    profsSansBinome: candidat.libres,
    chargeMin: Math.min(...charges),
    chargeMax: Math.max(...charges),
    sansPlace: candidat.q.manque,
    horsPP: candidat.horsPP,
  };

  const { glissants } = indicateurs;
  let txt =
    etat.binomes.length + ' binômes proposés' + (glissants ? ' dont ' + glissants + ' glissant' + (glissants > 1 ? 's' : '') : '') + '. ';
  const verrous = etat.eleves.filter((e) => e.verrou).length;
  if (fixes.size) txt += fixes.size + ' binôme(s) conservé(s)' + (verrous ? ', avec ' + verrous + ' rendez-vous verrouillé(s)' : '') + '. ';
  if (candidat.horsPP) {
    txt +=
      candidat.horsPP +
      ' élève(s) prioritaire(s) reçu(s) par un autre binôme que celui de leur professeur principal, faute de place chez lui. ';
  }
  if (candidat.q.manque) {
    txt +=
      'Capacité insuffisante : ' +
      Object.keys(candidat.q.nonPlaces)
        .map((c) => {
          const k = candidat.q.nonPlaces[c];
          return nomClasse(etat, c) + ' (il manque ' + k + ' créneau' + (k > 1 ? 'x' : '') + ')';
        })
        .join(', ') +
      '. Allongez la soirée, raccourcissez les rendez-vous ou complétez les équipes pédagogiques.';
    return { etat, rapport: { ok: false, txt, manque: candidat.q.nonPlaces }, indicateurs };
  }
  txt +=
    'Chaque élève peut obtenir un rendez-vous.' + (candidat.libres ? ' ' + candidat.libres + ' professeur(s) restent sans binôme.' : '');
  return { etat, rapport: { ok: true, txt }, indicateurs };
}

/**
 * Propose des binômes pour recevoir tous les élèves.
 * Renvoie un nouvel état (l'état reçu n'est pas modifié) et un rapport { ok, txt }.
 * Les binômes conservés sont gardés ; les élèves des autres binômes perdent binôme et horaire.
 */
export function proposerBinomes(etatInitial, { alea = creerAlea(GRAINE_PROPOSITION), essais = ESSAIS_PROPOSITION } = {}) {
  const r = explorer(etatInitial, { alea, essais });
  if (r.erreur) return { etat: etatInitial, rapport: r.erreur };
  const { etat, rapport } = materialiser(etatInitial, r.candidats[0], r.fixes);
  return { etat, rapport };
}

/**
 * Plusieurs propositions nettement différentes, pour comparaison.
 * La première est celle de proposerBinomes. Les suivantes sont les meilleures compositions qui diffèrent
 * d'au moins « ecartMin » binômes de chacune des propositions déjà retenues, sans laisser plus d'élèves sans place.
 * Renvoie { erreur } ou { variantes: [{ etat, rapport, indicateurs, differences }] },
 * « differences » comptant les binômes absents de la première proposition.
 */
export function proposerVariantes(
  etatInitial,
  { nombre = 3, ecartMin = 2, alea = creerAlea(GRAINE_PROPOSITION), essais = ESSAIS_PROPOSITION } = {},
) {
  const r = explorer(etatInitial, { alea, essais });
  if (r.erreur) return { erreur: r.erreur };
  const [premier] = r.candidats;
  const retenus = [premier];
  for (const c of r.candidats) {
    if (retenus.length >= nombre) break;
    if (c.q.manque > premier.q.manque) continue;
    if (retenus.every((x) => differences(c, x) >= ecartMin)) retenus.push(c);
  }
  return {
    variantes: retenus.map((c) => ({ ...materialiser(etatInitial, c, r.fixes), differences: differences(c, premier) })),
  };
}
