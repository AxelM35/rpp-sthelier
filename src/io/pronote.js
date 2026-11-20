// Import des exports bruts de Pronote (règles détaillées dans docs/import-pronote.md).
//
// Deux exports sont reconnus à leurs en-têtes :
//   - enseignants : Ressources → Classes → Équipe pédagogique, toutes les classes, « Cumuler par classe » ;
//     un bloc par classe (ligne-titre, ligne « N professeurs », une ligne par enseignant) ;
//   - élèves : Ressources → Élèves → Liste, un niveau ; une ligne par élève.
// Chaque import se fait en deux temps : analyser (ce qui sera importé, avec les points à confirmer),
// puis importer selon les choix de l'organisateur. Ce module n'utilise pas le navigateur.

import { PRONOTE } from '../config.js';
import { copierEtat } from '../modele/etat.js';
import { chiffreNiveau } from '../modele/niveaux.js';
import { nouvelId } from '../utils/texte.js';
import { classeParNom } from './import.js';

/** Texte comparable : sans accents, en majuscules, espaces simplifiés. */
export const normaliser = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
const sansEspace = (s) => normaliser(s).replace(/ /g, '');

/** « enseignants », « eleves » ou null selon les en-têtes de la première ligne. */
export function detecterPronote(lignes) {
  const tete = (lignes[0] || []).map(normaliser);
  if (tete.includes('MATIERE/FONCTION') && tete.includes('PROFESSEUR PRINCIPAL')) return 'profs';
  if (tete.includes('TOUTES LES OPTIONS') && tete.includes('CLASSE') && tete.includes('NOM')) return 'eleves';
  return null;
}

/** La classe (« 4 B ») est-elle du niveau (« 4e ») ? */
const duNiveau = (classe, niveau) => sansEspace(classe).startsWith(chiffreNiveau(niveau));

/**
 * Nom affiché d'une matière ou option : « ESPAGNOL LV2 » → « Espagnol ». Une valeur saisie en minuscules
 * (import d'un autre fichier que Pronote) est gardée telle quelle, accents compris.
 */
export function nomAffiche(valeur) {
  const v = normaliser(valeur);
  if (PRONOTE.noms[v]) return PRONOTE.noms[v];
  const brut = String(valeur).trim().replace(/\s+/g, ' ').replace(/ LV2$/i, '');
  const court = brut === brut.toUpperCase() ? brut.toLowerCase() : brut;
  return court.charAt(0).toUpperCase() + court.slice(1);
}

/** Élément d'une liste du niveau (LVB ou options) qui correspond à une valeur Pronote (un nom commence par l'autre). */
export function correspondance(liste, valeur) {
  const v = normaliser(valeur);
  const affiche = normaliser(nomAffiche(valeur));
  return (
    liste.find((x) => {
      const n = normaliser(x.nom);
      return [v, affiche].some((c) => c && n && (c.startsWith(n) || n.startsWith(c)));
    }) || null
  );
}

/**
 * Catégorie d'une matière de l'export des enseignants : 'classe', 'lvb', 'option', 'ignoree' ou 'inconnue'.
 * classement : catégories choisies par l'organisateur pour les matières inconnues.
 */
export function categorie(matiere, classement = {}) {
  const m = normaliser(matiere);
  if (PRONOTE.classeEntiere.includes(m)) return 'classe';
  if (/ LV2$/.test(m)) return 'lvb';
  if (PRONOTE.options.includes(m)) return 'option';
  if (PRONOTE.ignorees.includes(m)) return 'ignoree';
  return classement[m] || 'inconnue';
}

const indice = (tete, nom) => tete.findIndex((h) => normaliser(h) === nom);
const entier = (v) => (v === '' || v == null || !/^\d+$/.test(String(v).trim()) ? null : Number(v));

/** Blocs de l'export des enseignants : [{ classe, lignes: [{ civilite, nom, cle, matieres, pp, effectif }] }]. */
export function lireBlocs(lignes) {
  const tete = lignes[0] || [];
  const col = {
    civilite: indice(tete, 'CIVILITE'),
    nom: indice(tete, 'NOM'),
    matieres: indice(tete, 'MATIERE/FONCTION'),
    pp: indice(tete, 'PROFESSEUR PRINCIPAL'),
    effectif: indice(tete, 'EFFECTIF'),
  };
  const blocs = [];
  for (const l of lignes.slice(1)) {
    const cellules = l.map((v) => String(v ?? '').trim());
    if (!cellules.some(Boolean)) continue;
    const premiere = cellules[0];
    if (premiere && cellules.every((v) => v === premiere)) {
      if (!/^\d+ PROFESSEURS?$/.test(normaliser(premiere))) blocs.push({ classe: premiere, lignes: [] });
      continue;
    }
    const nom = cellules[col.nom] || '';
    if (!blocs.length || !nom) continue;
    const civilite = col.civilite >= 0 ? cellules[col.civilite] : '';
    blocs.at(-1).lignes.push({
      civilite,
      nom,
      cle: normaliser(civilite + ' ' + nom),
      affiche: (civilite ? civilite + ' ' : '') + nom,
      matieres: (cellules[col.matieres] || '')
        .split(',')
        .map((m) => m.trim())
        .filter(Boolean),
      pp: col.pp >= 0 && normaliser(cellules[col.pp]) === 'X',
      effectif: col.effectif >= 0 ? entier(cellules[col.effectif]) : null,
    });
  }
  return blocs;
}

/** Effectif le plus fréquent d'une classe : estimation de sa taille. */
function tailleEstimee(lignes) {
  const n = new Map();
  lignes.forEach((l) => l.effectif != null && n.set(l.effectif, (n.get(l.effectif) || 0) + 1));
  return [...n].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0]?.[0] ?? 0;
}

/**
 * Analyse de l'export des enseignants pour un niveau.
 * choix : { classement: { MATIERE: catégorie }, partages: { clé: booléen } }.
 */
export function analyserProfs(lignes, etat, niveau, choix = {}) {
  const classement = choix.classement || {};
  const blocs = lireBlocs(lignes);
  const exclus = new Map();
  blocs.forEach((b) =>
    b.lignes.forEach((l) => l.matieres.some((m) => normaliser(m) === PRONOTE.exclusion) && exclus.set(l.cle, l.affiche)),
  );
  const retenus = blocs.filter((b) => duNiveau(b.classe, niveau));

  // Matières inconnues, avec une catégorie proposée : toute la classe si l'effectif est celui de la classe.
  const inconnues = new Map();
  retenus.forEach((b) => {
    const taille = tailleEstimee(b.lignes);
    b.lignes
      .filter((l) => !exclus.has(l.cle))
      .forEach((l) =>
        l.matieres
          .filter((m) => categorie(m) === 'inconnue')
          .forEach((m) => {
            const k = normaliser(m);
            const x = inconnues.get(k) || { matiere: k, occurrences: 0, proposee: 'ignoree' };
            x.occurrences++;
            if (l.effectif != null && taille && l.effectif >= 0.8 * taille) x.proposee = 'classe';
            inconnues.set(k, x);
          }),
      );
  });
  const classementFinal = { ...Object.fromEntries([...inconnues.values()].map((x) => [x.matiere, x.proposee])), ...classement };
  inconnues.forEach((x) => (x.categorie = classementFinal[x.matiere]));

  const profs = new Map();
  const pp = {};
  const references = { lvb: new Map(), option: new Map() };
  const partages = [];
  let nonRattaches = 0;
  for (const b of retenus) {
    const taille = tailleEstimee(b.lignes);
    const lignesProfs = [];
    for (const l of b.lignes) {
      if (exclus.has(l.cle)) continue;
      const cats = l.matieres.map((m) => [m, categorie(m, classementFinal)]);
      const de = (c) => cats.filter(([, x]) => x === c).map(([m]) => normaliser(m));
      const ens = de('classe').length
        ? { type: 'classe', disciplines: de('classe') }
        : de('lvb').length
          ? { type: 'lvb', ref: de('lvb')[0] }
          : de('option').length
            ? { type: 'option', ref: de('option')[0] }
            : null;
      if (l.pp) pp[b.classe] = l.cle;
      if (!ens) {
        nonRattaches++;
        continue;
      }
      if (ens.ref) references[ens.type].set(ens.ref, nomAffiche(ens.ref));
      lignesProfs.push({ l, ens });
    }

    // Discipline partagée : un enseignant n'a qu'une petite partie de la classe dans une discipline de classe entière,
    // un autre a le reste (histoire-géographie en breton). Les lignes sans effectif n'entrent pas en compte.
    const traites = new Set();
    for (const d of PRONOTE.classeEntiere) {
      const avec = lignesProfs.filter((x) => x.ens.type === 'classe' && x.ens.disciplines.includes(d) && x.l.effectif != null);
      if (avec.length < 2 || !taille) continue;
      const petits = avec.filter((x) => x.l.effectif < 0.5 * taille);
      const grands = avec.filter((x) => x.l.effectif >= 0.5 * taille);
      if (petits.length !== 1 || !grands.length || traites.has(petits[0])) continue;
      const [petit] = petits;
      const partagees = petit.ens.disciplines;
      const grandsPartages = grands.filter((x) => x.ens.disciplines.every((m) => partagees.includes(m)));
      if (!grandsPartages.length) continue;
      const option = nomAffiche(d) + ' (groupe à part)';
      const cle = b.classe + '|' + d;
      const accepte = choix.partages?.[cle] ?? true;
      partages.push({
        cle,
        classe: b.classe,
        discipline: nomAffiche(d),
        valeur: d,
        option,
        petit: { nom: petit.l.affiche, effectif: petit.l.effectif },
        grands: grandsPartages.map((x) => ({ nom: x.l.affiche, effectif: x.l.effectif })),
        accepte,
      });
      traites.add(petit);
      if (!accepte) continue;
      references.option.set(normaliser(option), option);
      petit.ens = { type: 'option', ref: normaliser(option) };
      grandsPartages.forEach((x) => (x.ens = { type: 'sauf', ref: normaliser(option) }));
    }

    for (const { l, ens } of lignesProfs) {
      if (!profs.has(l.cle)) {
        profs.set(l.cle, { cle: l.cle, nom: l.affiche, matieres: new Set(), enseignements: [] });
      }
      const p = profs.get(l.cle);
      l.matieres.filter((m) => ['classe', 'lvb', 'option'].includes(categorie(m, classementFinal))).forEach((m) => p.matieres.add(m));
      const refNom = ens.ref ? references.lvb.get(ens.ref) || references.option.get(ens.ref) : null;
      p.enseignements.push({ classe: b.classe, type: ens.type, ref: ens.ref || null, refNom, effectif: l.effectif });
    }
  }

  const nouvelles = (type, liste) =>
    [...references[type]].filter(([valeur]) => !correspondance(liste, valeur)).map(([valeur, nom]) => ({ valeur, nom }));
  return {
    type: 'profs',
    classes: retenus.map((b) => b.classe),
    autresClasses: blocs.length - retenus.length,
    exclus: [...exclus.values()],
    inconnues: [...inconnues.values()],
    partages,
    nonRattaches,
    nouvellesLvb: nouvelles('lvb', etat.lvb),
    nouvellesOptions: nouvelles('option', etat.options),
    pp: Object.entries(pp).map(([classe, cle]) => ({ classe, nom: profs.get(cle)?.nom || cle })),
    ppCles: pp,
    profs: [...profs.values()].map((p) => ({ ...p, discipline: [...p.matieres].join(', ') })),
  };
}

/**
 * Fonction valeur Pronote → id dans une liste du niveau (LVB ou options). Les valeurs de « ajouts »
 * ([{ valeur, nom }]) absentes de la liste y sont ajoutées sous leur nom à la première demande.
 */
function completerListe(liste, ajouts, prefixe) {
  return (valeur) => {
    let x = correspondance(liste, valeur);
    const ajout = ajouts.find((a) => a.valeur === normaliser(valeur));
    if (!x && ajout) {
      x = { id: prefixe + nouvelId(), nom: ajout.nom };
      liste.push(x);
    }
    return x ? x.id : null;
  };
}

/** Importe l'analyse de l'export des enseignants. remplacer : les professeurs et binômes actuels sont retirés. */
export function importerProfs(etatInitial, analyse, { remplacer = false } = {}) {
  const etat = copierEtat(etatInitial);
  if (remplacer) {
    etat.profs = [];
    etat.binomes = [];
  }
  const idLvb = completerListe(etat.lvb, analyse.nouvellesLvb, 'lvb-');
  const idOption = completerListe(etat.options, analyse.nouvellesOptions, 'opt-');
  const classes = new Map(analyse.classes.map((nom) => [nom, classeParNom(etat, nom)]));
  let ajoutes = 0;
  let completes = 0;
  const parCle = new Map();
  for (const x of analyse.profs) {
    let p = etat.profs.find((q) => normaliser(q.nom) === normaliser(x.nom));
    if (p) completes++;
    else {
      p = { id: nouvelId(), nom: x.nom, discipline: x.discipline, enseignements: [], dispoDe: '', dispoA: '' };
      etat.profs.push(p);
      ajoutes++;
    }
    parCle.set(x.cle, p);
    for (const e of x.enseignements) {
      const classeId = classes.get(e.classe).id;
      const refId = e.type === 'lvb' ? idLvb(e.ref) : e.type === 'classe' ? null : idOption(e.ref);
      if (e.type !== 'classe' && !refId) continue;
      const ens = { classeId, type: e.type, refId, sansUlis: false };
      if (e.effectif != null) ens.effectif = e.effectif;
      p.enseignements = p.enseignements.filter((y) => y.classeId !== classeId).concat(ens);
    }
  }
  Object.entries(analyse.ppCles).forEach(([classe, cle]) => {
    if (parCle.has(cle)) classes.get(classe).ppId = parCle.get(cle).id;
  });
  return { etat, ajoutes, completes };
}

/**
 * Analyse de l'export des élèves d'un niveau.
 * choix : { ajouts: { VALEUR: booléen }, ulis: { clé: booléen } }.
 */
export function analyserEleves(lignes, etat, niveau, choix = {}) {
  const tete = lignes[0] || [];
  const col = {
    nom: indice(tete, 'NOM'),
    prenom: indice(tete, 'PRENOM'),
    usage: indice(tete, "PRENOM D'USAGE"),
    classe: indice(tete, 'CLASSE'),
    formation: indice(tete, 'FORMATION'),
    options: indice(tete, 'TOUTES LES OPTIONS'),
  };
  const lues = new Set(Object.values(col).filter((i) => i >= 0));
  const colonnesIgnorees = tete.filter((h, i) => String(h).trim() && !lues.has(i)).map((h) => String(h).trim());

  const eleves = [];
  let autres = 0;
  for (const l of lignes.slice(1)) {
    const v = (i) => (i >= 0 ? String(l[i] ?? '').trim() : '');
    if (!v(col.nom)) continue;
    if (!duNiveau(v(col.classe), niveau)) {
      autres++;
      continue;
    }
    eleves.push({
      nom: v(col.nom),
      prenom: v(col.usage) || v(col.prenom),
      classe: v(col.classe),
      ulis: sansEspace(v(col.formation)).endsWith('ULIS'),
      valeurs: v(col.options)
        .split(',')
        .map((x) => normaliser(x))
        .filter(Boolean),
    });
  }

  // Classement des valeurs de « Toutes les options ». Les disciplines enseignées à toute la classe (ANGLAIS LV1,
  // la LVA de tous les élèves ; HISTOIRE-GEOGRAPHIE…) ne sont pas des options : leurs enseignants ont déjà toute
  // la classe. Seule exception, l'option d'une discipline partagée (« Histoire-géographie (groupe à part) »).
  const inconnues = new Map();
  const ignorees = new Map();
  const partagee = (val) => etat.options.find((x) => normaliser(x.nom).startsWith(normaliser(nomAffiche(val)))) || null;
  const comptes = new Map();
  const compter = (map, k) => map.set(k, (map.get(k) || 0) + 1);
  for (const e of eleves) {
    e.lvb = null;
    e.options = [];
    for (const val of e.valeurs) {
      const commune = PRONOTE.classeEntiere.includes(val);
      const lvb = / LV2$/.test(val) ? correspondance(etat.lvb, val) : null;
      const option = commune ? partagee(val) : !/ LV2$/.test(val) ? correspondance(etat.options, val) : null;
      if (lvb) {
        e.lvb = { valeur: val, nom: lvb.nom };
        compter(comptes, lvb.nom);
      } else if (option) {
        e.options.push({ valeur: val, nom: option.nom });
        compter(comptes, option.nom);
      } else if (commune) {
        continue; // enseignée à toute la classe
      } else if (PRONOTE.ignorees.includes(val)) {
        compter(ignorees, val);
      } else {
        const x = inconnues.get(val) || { valeur: val, nom: nomAffiche(val), type: / LV2$/.test(val) ? 'lvb' : 'option', eleves: 0 };
        x.eleves++;
        x.ajouter = choix.ajouts?.[val] ?? true;
        inconnues.set(val, x);
        if (x.ajouter && x.type === 'lvb' && !e.lvb) e.lvb = { valeur: val, nom: x.nom, nouvelle: true };
        else if (x.ajouter) e.options.push({ valeur: val, nom: x.nom, nouvelle: true });
      }
    }
  }

  // Élèves ULIS et LVB (U1 bis) : l'effectif de l'enseignant de LVB dit s'il a les élèves ULIS de la classe.
  const ulis = [];
  const verifications = [];
  for (const classe of [...new Set(eleves.map((e) => e.classe))]) {
    const c = etat.classes.find((x) => sansEspace(x.nom) === sansEspace(classe));
    const siens = eleves.filter((e) => e.classe === classe);
    if (!c) continue;
    for (const p of etat.profs) {
      const ens = p.enseignements.find((x) => x.classeId === c.id);
      if (!ens || ens.effectif == null) continue;
      if (ens.type === 'lvb') {
        const lvb = etat.lvb.find((x) => x.id === ens.refId);
        const de = siens.filter((e) => e.lvb && e.lvb.nom === lvb?.nom);
        const n = de.length;
        const horsUlis = de.filter((e) => !e.ulis).length;
        if (n === horsUlis) continue; // pas d'élève ULIS dans cette LVB
        const cle = classe + '|' + p.id;
        const propose = ens.effectif === horsUlis;
        ulis.push({
          cle,
          classe,
          prof: p.nom,
          lvb: lvb?.nom || '?',
          effectif: ens.effectif,
          eleves: n,
          ulis: n - horsUlis,
          certain: ens.effectif === horsUlis || ens.effectif === n,
          sansUlis: choix.ulis?.[cle] ?? propose,
          profId: p.id,
          classeId: c.id,
        });
      } else if (ens.type === 'option') {
        const option = etat.options.find((x) => x.id === ens.refId);
        const n = siens.filter((e) => e.options.some((o) => o.nom === option?.nom)).length;
        if (n !== ens.effectif) verifications.push({ classe, prof: p.nom, option: option?.nom || '?', effectif: ens.effectif, eleves: n });
      }
    }
  }

  return {
    type: 'eleves',
    eleves,
    autres,
    colonnesIgnorees,
    classes: [...new Set(eleves.map((e) => e.classe))],
    comptes: [...comptes].map(([nom, n]) => ({ nom, n })),
    ignorees: [...ignorees].map(([valeur, n]) => ({ valeur, n })),
    inconnues: [...inconnues.values()],
    ulis,
    verifications,
    sansProfs: !etat.profs.length,
  };
}

/** Importe l'analyse de l'export des élèves. remplacer : les élèves actuels sont retirés. */
export function importerEleves(etatInitial, analyse, { remplacer = false } = {}) {
  const etat = copierEtat(etatInitial);
  if (remplacer) etat.eleves = [];
  const ajouts = analyse.inconnues.filter((x) => x.ajouter);
  const idLvb = completerListe(
    etat.lvb,
    ajouts.filter((x) => x.type === 'lvb'),
    'lvb-',
  );
  const idOption = completerListe(
    etat.options,
    ajouts.filter((x) => x.type === 'option'),
    'opt-',
  );
  const cle = (nom, prenom, classeId) => (nom + '|' + prenom + '|' + classeId).toLowerCase();
  const vus = new Set(etat.eleves.map((e) => cle(e.nom, e.prenom, e.classeId)));
  let ajoutes = 0;
  let doublons = 0;
  for (const x of analyse.eleves) {
    const classe = classeParNom(etat, x.classe);
    const k = cle(x.nom, x.prenom, classe.id);
    if (vus.has(k)) {
      doublons++;
      continue;
    }
    vus.add(k);
    etat.eleves.push({
      id: nouvelId(),
      nom: x.nom,
      prenom: x.prenom,
      classeId: classe.id,
      lvbId: x.lvb ? idLvb(x.lvb.valeur) : null,
      optionIds: [...new Set(x.options.map((o) => idOption(o.valeur)).filter(Boolean))],
      ulis: x.ulis,
      fratrie: '',
      pasAvant: '',
      pasApres: '',
      binomeId: null,
      slot: null,
      verrou: false,
    });
    ajoutes++;
  }
  analyse.ulis.forEach((u) => {
    const p = etat.profs.find((q) => q.id === u.profId);
    const ens = p && p.enseignements.find((x) => x.classeId === u.classeId && x.type === 'lvb');
    if (ens) ens.sansUlis = u.sansUlis;
  });
  return { etat, ajoutes, doublons };
}
