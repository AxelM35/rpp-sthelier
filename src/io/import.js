// Import de listes d'élèves et de professeurs à partir de lignes de tableur.

import { copierEtat } from '../modele/etat.js';
import { nouvelId } from '../utils/texte.js';

/** Champs attendus par type d'import : [clé, libellé, motif de reconnaissance de l'en-tête]. */
export const CHAMPS = {
  eleves: [
    ['nom', 'Nom *', /^nom|élève|eleve/i],
    ['prenom', 'Prénom', /pr[ée]nom/i],
    ['classe', 'Classe *', /classe|division/i],
    ['fratrie', 'Fratrie (code)', /fratrie|famille/i],
  ],
  profs: [
    ['nom', 'Nom *', /nom|professeur|enseignant/i],
    ['discipline', 'Discipline', /mati[èe]re|discipline/i],
    ['classe', 'Classe(s) *', /classe|division/i],
  ],
};

/**
 * Devine la colonne de chaque champ d'après la première ligne.
 * Renvoie { entete, colonnes } : colonnes[cle] = indice de colonne, ou -1 si absent.
 * Sans en-tête reconnu, les colonnes sont prises dans l'ordre des champs.
 */
export function detecterColonnes(type, lignes) {
  const tete = lignes[0] || [];
  const colonnes = {};
  let entete = false;
  CHAMPS[type].forEach(([cle, , motif]) => {
    const j = tete.findIndex((h, x) => motif.test(h) && !(cle === 'nom' && /pr[ée]nom/i.test(h)) && !Object.values(colonnes).includes(x));
    entete = entete || j >= 0;
    colonnes[cle] = j;
  });
  if (!Object.values(colonnes).some((j) => j >= 0)) {
    entete = false;
    CHAMPS[type].forEach(([cle], i) => (colonnes[cle] = i < tete.length ? i : -1));
  }
  return { entete, colonnes };
}

/** Classe portant ce nom (sans tenir compte de la casse), créée si besoin dans l'état fourni. */
function classeParNom(etat, nom) {
  nom = String(nom).trim();
  if (!nom) return null;
  let c = etat.classes.find((x) => x.nom.toLowerCase() === nom.toLowerCase());
  if (!c) {
    c = { id: nouvelId(), nom };
    etat.classes.push(c);
  }
  return c;
}

/**
 * Ajoute les élèves ou professeurs des lignes à l'état.
 * options : { type: 'eleves' | 'profs', lignes, colonnes, entete, remplacer }
 * Élèves : un élève déjà présent (même nom, prénom et classe) est ignoré et compté comme doublon.
 * Professeurs : un professeur déjà présent n'est pas recréé ; ses classes sont complétées.
 * Renvoie { etat, ajoutes, doublons } ou { erreur } si les colonnes obligatoires manquent.
 */
export function importerLignes(etatInitial, { type, lignes, colonnes, entete, remplacer = false }) {
  if (!(colonnes.nom >= 0) || !(colonnes.classe >= 0)) return { erreur: 'Indiquez au moins les colonnes Nom et Classe.' };
  const etat = copierEtat(etatInitial);
  const donnees = entete ? lignes.slice(1) : lignes;
  const valeur = (l, cle) => (colonnes[cle] >= 0 ? (l[colonnes[cle]] || '').trim() : '');
  let ajoutes = 0;
  let doublons = 0;

  if (type === 'eleves') {
    if (remplacer) etat.eleves = [];
    const cle = (nom, prenom, classeId) => (nom + '|' + prenom + '|' + classeId).toLowerCase();
    const vus = new Set(etat.eleves.map((e) => cle(e.nom, e.prenom, e.classeId)));
    donnees.forEach((l) => {
      const nom = valeur(l, 'nom');
      const classe = classeParNom(etat, valeur(l, 'classe'));
      if (!nom || !classe) return;
      const k = cle(nom, valeur(l, 'prenom'), classe.id);
      if (vus.has(k)) {
        doublons++;
        return;
      }
      vus.add(k);
      etat.eleves.push({
        id: nouvelId(),
        nom,
        prenom: valeur(l, 'prenom'),
        classeId: classe.id,
        fratrie: valeur(l, 'fratrie'),
        pasAvant: '',
        pasApres: '',
        binomeId: null,
        slot: null,
        verrou: false,
      });
      ajoutes++;
    });
  } else {
    if (remplacer) {
      etat.profs = [];
      etat.binomes = [];
    }
    const vusDansFichier = new Set();
    donnees.forEach((l) => {
      const nom = valeur(l, 'nom');
      if (!nom) return;
      let p = etat.profs.find((x) => x.nom.toLowerCase() === nom.toLowerCase());
      if (!p) {
        p = { id: nouvelId(), nom, discipline: valeur(l, 'discipline'), classeIds: [], dispoDe: '', dispoA: '' };
        etat.profs.push(p);
        ajoutes++;
      } else if (!vusDansFichier.has(p.id)) {
        doublons++;
      }
      vusDansFichier.add(p.id);
      valeur(l, 'classe')
        .split(/[,;/|\n]+/)
        .forEach((x) => {
          const c = classeParNom(etat, x);
          if (c && !p.classeIds.includes(c.id)) p.classeIds.push(c.id);
        });
    });
  }
  return { etat, ajoutes, doublons };
}
