// Format des données de l'application : création, migration et validation.
//
// Structure d'un état :
//   v        version du format
//   soiree   { etab, date, debut, fin, duree, pauses:[{debut, duree}] }
//   classes  [{ id, nom }]
//   profs    [{ id, nom, discipline, classeIds:[], dispoDe, dispoA }]
//   binomes  [{ id, fixe, profIds:[id|null, id|null], classeIds:[], salle }]
//   eleves   [{ id, nom, prenom, classeId, fratrie, pasAvant, pasApres, binomeId, slot, verrou }]
//   opt      { mode: 'tous' | 'min' }
//
// « slot » est l'indice du créneau dans la liste calculée par creneaux().

import { CLASSES_MAX_PAR_BINOME, SOIREE_PAR_DEFAUT, VERSION_DONNEES } from '../config.js';

/** État vide d'une nouvelle préparation. */
export function etatVide() {
  return {
    v: VERSION_DONNEES,
    soiree: { ...SOIREE_PAR_DEFAUT, pauses: [] },
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
const MIGRATIONS = {};

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

  const etat = etatVide();
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

  etat.classes = liste(s.classes, 'classes').map((c) => {
    c = objet(c, 'classes');
    return { id: identifiant(c.id, 'classes'), nom: texte(c.nom, 30) || '?' };
  });
  const classes = new Set(etat.classes.map((c) => c.id));

  etat.profs = liste(s.profs, 'professeurs').map((p) => {
    p = objet(p, 'professeurs');
    return {
      id: identifiant(p.id, 'professeurs'),
      nom: texte(p.nom, 100),
      discipline: texte(p.discipline, 100),
      classeIds: [...new Set(liste(p.classeIds, "classes d'un professeur").filter((c) => classes.has(c)))],
      dispoDe: heure(p.dispoDe),
      dispoA: heure(p.dispoA),
    };
  });
  const profs = new Set(etat.profs.map((p) => p.id));

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
