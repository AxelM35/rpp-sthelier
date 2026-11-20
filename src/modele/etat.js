// Format des données de l'application : création, migration et validation.
//
// Structure d'un état :
//   v        version du format
//   niveau   '6e' | '5e' | '4e' | '3e' (voir NIVEAUX)
//   soiree   { etab, date, debut, fin, duree, pauses:[{debut, duree}] }
//   lvb      [{ id, nom }]          langues vivantes B du niveau
//   options  [{ id, nom }]          options du niveau
//   classes  [{ id, nom, ppId }]    ppId : professeur principal (id d'un professeur) ou null
//   profs    [{ id, nom, discipline, enseignements:[{ classeId, type, refId, sansUlis }], dispoDe, dispoA }]
//   binomes  [{ id, fixe, profIds:[id|null, id|null], classeIds:[], salle }]
//   eleves   [{ id, nom, prenom, classeId, lvbId, optionIds:[], ulis,
//               fratrie, pasAvant, pasApres, binomeId, slot, verrou }]
//   opt      { mode: 'tous' | 'min' }
//
// Enseignement d'un professeur dans une classe (au plus un par classe), selon son type :
//   'classe'  toute la classe (refId : null)
//   'lvb'     les élèves de la LVB refId ; sansUlis : les élèves ULIS de la classe ne l'ont pas en cours
//   'option'  les élèves de l'option refId
//   'sauf'    toute la classe sauf les élèves de l'option refId (discipline partagée, par exemple
//             l'histoire-géographie enseignée en breton aux élèves bilingues)
// L'équipe d'un élève s'en déduit (modele/equipe.js).
//
// « slot » est l'indice du créneau dans la liste calculée par creneaux().

import { CLASSES_MAX_PAR_BINOME, LISTES_PAR_DEFAUT, NIVEAUX, SOIREE_PAR_DEFAUT, VERSION_DONNEES } from '../config.js';

/** Types d'enseignement d'un professeur dans une classe. */
export const TYPES_ENSEIGNEMENT = Object.freeze(['classe', 'lvb', 'option', 'sauf']);

/** Identifiant stable d'un élément d'une liste par défaut : « Espagnol » → « lvb-espagnol ». */
const idParDefaut = (prefixe, nom) =>
  prefixe +
  '-' +
  nom
    .normalize('NFD')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .toLowerCase();

/** Listes de LVB et d'options d'une nouvelle préparation du niveau (vides pour un niveau inconnu). */
export function listesParDefaut(niveau) {
  const l = LISTES_PAR_DEFAUT[niveau] || { lvb: [], options: [] };
  return {
    lvb: l.lvb.map((nom) => ({ id: idParDefaut('lvb', nom), nom })),
    options: l.options.map((nom) => ({ id: idParDefaut('opt', nom), nom })),
  };
}

/** État vide d'une nouvelle préparation du niveau indiqué. */
export function etatVide(niveau = NIVEAUX[0]) {
  return {
    v: VERSION_DONNEES,
    niveau,
    soiree: { ...SOIREE_PAR_DEFAUT, pauses: [] },
    ...listesParDefaut(niveau),
    classes: [],
    eleves: [],
    profs: [],
    binomes: [],
    opt: { mode: 'tous' },
  };
}

/** Copie profonde d'un état (les états ne contiennent que des données JSON). */
export function copierEtat(etat) {
  return structuredClone(etat);
}

/**
 * Migrations successives : MIGRATIONS[n] transforme des données de version n en version n + 1.
 * Pour faire évoluer le format : incrémenter VERSION_DONNEES et ajouter ici la migration correspondante.
 */
const MIGRATIONS = {
  // Version 1 (application de la 6e seulement) : les données deviennent la préparation du niveau 6e.
  1: (d) => ({ ...d, niveau: '6e' }),
  // Version 2 : les classes d'un professeur deviennent des enseignements « classe entière » ; les listes
  // de LVB et d'options du niveau sont celles par défaut. Élèves (LVB, options, ULIS) et professeur principal
  // prennent leur valeur par défaut à la validation.
  2: (d) => ({
    ...d,
    ...listesParDefaut(d.niveau),
    profs: Array.isArray(d.profs)
      ? d.profs.map((p) => {
          if (!p || typeof p !== 'object') return p;
          const { classeIds, ...reste } = p;
          return {
            ...reste,
            enseignements: Array.isArray(classeIds)
              ? classeIds.map((classeId) => ({ classeId, type: 'classe', refId: null, sansUlis: false }))
              : classeIds,
          };
        })
      : d.profs,
  }),
};

/** Amène des données d'une version antérieure à la version courante. */
export function migrer(donnees) {
  if (!donnees || typeof donnees !== 'object' || !Number.isInteger(donnees.v)) {
    throw new Error("ce fichier n'est pas une sauvegarde de cette application");
  }
  if (donnees.v > VERSION_DONNEES) {
    throw new Error("cette sauvegarde provient d'une version plus récente de l'application");
  }
  let d = donnees;
  while (d.v < VERSION_DONNEES) {
    const etape = MIGRATIONS[d.v];
    if (!etape) throw new Error('version de sauvegarde inconnue (' + d.v + ')');
    d = { ...etape(d), v: d.v + 1 };
  }
  return d;
}

const ID_VALIDE = /^[A-Za-z0-9_-]{1,40}$/;
const HEURE_VALIDE = /^\d{1,2}:\d{2}$/;
const DATE_VALIDE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Contrôle complet de données externes (fichier ouvert ou stockage local) :
 * reconstruit un état propre champ par champ, ou lève une erreur au message lisible.
 * Les identifiants sont strictement contrôlés car ils sont insérés dans le HTML.
 */
export function valider(brut) {
  const s = migrer(brut);

  const texte = (v, max = 200) => (v == null ? '' : String(v).slice(0, max));
  const heure = (v) => (HEURE_VALIDE.test(v || '') ? v : '');
  const liste = (v, nom) => {
    if (v == null) return [];
    if (!Array.isArray(v)) throw new Error('la liste « ' + nom + ' » est invalide');
    return v;
  };
  const objet = (v, nom) => {
    if (!v || typeof v !== 'object') throw new Error('un élément de « ' + nom + ' » est invalide');
    return v;
  };
  const dejaVus = new Set();
  const identifiant = (v, nom) => {
    if (typeof v !== 'string' || !ID_VALIDE.test(v)) throw new Error('identifiant invalide dans « ' + nom + ' »');
    if (dejaVus.has(v)) throw new Error('identifiant en double dans « ' + nom + ' »');
    dejaVus.add(v);
    return v;
  };

  if (!NIVEAUX.includes(s.niveau)) throw new Error('niveau inconnu');
  const etat = etatVide(s.niveau);
  const so = s.soiree && typeof s.soiree === 'object' ? s.soiree : {};
  etat.soiree = {
    etab: texte(so.etab),
    date: DATE_VALIDE.test(so.date || '') ? so.date : '',
    debut: heure(so.debut) || SOIREE_PAR_DEFAUT.debut,
    fin: heure(so.fin) || SOIREE_PAR_DEFAUT.fin,
    duree: Math.min(240, Math.max(1, Math.round(Number(so.duree)) || SOIREE_PAR_DEFAUT.duree)),
    pauses: liste(so.pauses, 'pauses').map((p) => {
      p = objet(p, 'pauses');
      return { debut: heure(p.debut) || '18:30', duree: Math.max(0, Math.round(Number(p.duree)) || 0) };
    }),
  };
  etat.opt = { mode: s.opt && s.opt.mode === 'min' ? 'min' : 'tous' };

  const nommes = (v, nom) =>
    liste(v, nom).map((x) => {
      x = objet(x, nom);
      return { id: identifiant(x.id, nom), nom: texte(x.nom, 60) || '?' };
    });
  etat.lvb = nommes(s.lvb, 'LVB');
  etat.options = nommes(s.options, 'options');
  const lvb = new Set(etat.lvb.map((x) => x.id));
  const options = new Set(etat.options.map((x) => x.id));

  const ppIds = {};
  etat.classes = liste(s.classes, 'classes').map((c) => {
    c = objet(c, 'classes');
    const id = identifiant(c.id, 'classes');
    ppIds[id] = c.ppId;
    return { id, nom: texte(c.nom, 30) || '?', ppId: null };
  });
  const classes = new Set(etat.classes.map((c) => c.id));

  etat.profs = liste(s.profs, 'professeurs').map((p) => {
    p = objet(p, 'professeurs');
    return {
      id: identifiant(p.id, 'professeurs'),
      nom: texte(p.nom, 100),
      discipline: texte(p.discipline, 100),
      enseignements: validerEnseignements(liste(p.enseignements, "enseignements d'un professeur"), { classes, lvb, options }),
      dispoDe: heure(p.dispoDe),
      dispoA: heure(p.dispoA),
    };
  });
  const profs = new Set(etat.profs.map((p) => p.id));
  etat.classes.forEach((c) => (c.ppId = profs.has(ppIds[c.id]) ? ppIds[c.id] : null));

  etat.binomes = liste(s.binomes, 'binômes').map((b) => {
    b = objet(b, 'binômes');
    const ids = liste(b.profIds, 'binômes');
    const p0 = profs.has(ids[0]) ? ids[0] : null;
    const p1 = profs.has(ids[1]) && ids[1] !== p0 ? ids[1] : null;
    return {
      id: identifiant(b.id, 'binômes'),
      fixe: b.fixe === true,
      profIds: [p0, p1],
      classeIds: [...new Set(liste(b.classeIds, 'binômes').filter((c) => classes.has(c)))].slice(0, CLASSES_MAX_PAR_BINOME),
      salle: texte(b.salle, 30),
    };
  });
  const binomes = new Set(etat.binomes.map((b) => b.id));

  etat.eleves = liste(s.eleves, 'élèves')
    .map((e) => {
      e = objet(e, 'élèves');
      const binomeId = binomes.has(e.binomeId) ? e.binomeId : null;
      const slot = binomeId && Number.isInteger(e.slot) && e.slot >= 0 ? e.slot : null;
      return {
        id: identifiant(e.id, 'élèves'),
        nom: texte(e.nom, 100),
        prenom: texte(e.prenom, 100),
        classeId: classes.has(e.classeId) ? e.classeId : null,
        lvbId: lvb.has(e.lvbId) ? e.lvbId : null,
        optionIds: [...new Set(liste(e.optionIds, "options d'un élève").filter((o) => options.has(o)))],
        ulis: e.ulis === true,
        fratrie: texte(e.fratrie, 40),
        pasAvant: heure(e.pasAvant),
        pasApres: heure(e.pasApres),
        binomeId,
        slot,
        verrou: slot != null && e.verrou === true,
      };
    })
    .filter((e) => e.classeId);

  return etat;
}

/**
 * Enseignements valides d'un professeur : classe connue, type connu, LVB ou option existante,
 * un seul enseignement par classe (le premier). Les autres sont écartés sans erreur.
 */
export function validerEnseignements(brut, { classes, lvb, options }) {
  const vus = new Set();
  const valides = [];
  for (const x of brut) {
    if (!x || typeof x !== 'object' || !classes.has(x.classeId) || vus.has(x.classeId)) continue;
    const ref =
      x.type === 'classe' ? null : x.type === 'lvb' ? (lvb.has(x.refId) ? x.refId : undefined) : options.has(x.refId) ? x.refId : undefined;
    if (!TYPES_ENSEIGNEMENT.includes(x.type) || ref === undefined) continue;
    vus.add(x.classeId);
    valides.push({ classeId: x.classeId, type: x.type, refId: ref, sansUlis: x.type === 'lvb' && x.sansUlis === true });
  }
  return valides;
}
