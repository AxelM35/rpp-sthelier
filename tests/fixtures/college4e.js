// Jeu de données fictif d'un niveau de 4e, inspiré des exports Pronote d'un collège (aucune donnée réelle) :
// 5 classes, 127 élèves, 24 enseignants. Il réunit les cas du cahier des charges v2 :
//   - LVB : espagnol pour presque tous, allemand pour quelques élèves de 4A et 4D ;
//   - options : breton et histoire-géographie en breton (bilingues de 4A), latin (4C, 4D), athlétisme (4B, 4C) ;
//   - histoire-géographie partagée en 4A : M. Hamel a les bilingues, Mme Hervé les autres (« sauf ») ;
//   - élèves ULIS en 4D (l'enseignante d'espagnol ne les a pas en cours) et en 4E (dont un sans LVB) ;
//   - professeure principale de 4E qui n'enseigne que l'espagnol dans cette classe.
// Les identifiants sont déterministes pour que les tests soient reproductibles.

import { etatVide } from '../../src/modele/etat.js';

const NOMS = ['Adam', 'Bodin', 'Caron', 'Denis', 'Étienne', 'Fabre', 'Gauthier', 'Hubert', 'Jacob', 'Klein', 'Lambert', 'Marchand', 'Noël'];
const PRENOMS = ['Alix', 'Basile', 'Céleste', 'Dorian', 'Elsa', 'Félix', 'Gaïa', 'Hugo', 'Inès', 'Jules', 'Lina', 'Malo', 'Nina', 'Oscar'];

const ESP = 'lvb-espagnol';
const ALL = 'lvb-allemand';
const BZH = 'opt-breton';
const LAT = 'opt-latin';
const ATH = 'opt-athle';
const HGB = 'opt-hgbzh';

/** Enseignement : [classe, type, référence, sansUlis]. */
const e = (classe, type = 'classe', refId = null, sansUlis = false) => ({ classeId: 'c' + classe, type, refId, sansUlis });
const toutes = (...classes) => classes.map((c) => e(c));

const PROFS = [
  ['pF1', 'Mme Fournier', 'Français', toutes('4A', '4B')],
  ['pF2', 'M. Ferry', 'Français', toutes('4C', '4D')],
  ['pF3', 'Mme Faure', 'Français', toutes('4E')],
  ['pM1', 'M. Morin', 'Mathématiques', toutes('4A', '4C')],
  ['pM2', 'Mme Meunier', 'Mathématiques', toutes('4B', '4D', '4E')],
  ['pH1', 'Mme Hervé', 'Histoire-géographie', [e('4A', 'sauf', HGB), e('4B')]],
  ['pH2', 'M. Huet', 'Histoire-géographie', toutes('4C', '4D', '4E')],
  ['pHB', 'M. Hamel', 'Histoire-géographie en breton', [e('4A', 'option', HGB)]],
  ['pS1', 'Mme Simon', 'SVT', toutes('4A', '4B', '4C')],
  ['pS2', 'M. Sabatier', 'SVT', toutes('4D', '4E')],
  ['pP1', 'M. Perrin', 'Physique-chimie', toutes('4A', '4B', '4C', '4D', '4E')],
  ['pT1', 'Mme Texier', 'Technologie', toutes('4A', '4B', '4C', '4D', '4E')],
  ['pA1', 'M. Arnaud', 'Arts plastiques', toutes('4A', '4B', '4C', '4D', '4E')],
  ['pMu', 'Mme Muller', 'Éducation musicale', toutes('4A', '4B', '4C', '4D', '4E')],
  ['pE1', 'M. Etienne', 'EPS', toutes('4A', '4B', '4C')],
  ['pE2', 'Mme Esnault', 'EPS', toutes('4D', '4E')],
  ['pN1', 'Mme Nicolas', 'Anglais', toutes('4A', '4B')],
  ['pN2', 'M. Noblet', 'Anglais', toutes('4C', '4D', '4E')],
  ['pEs1', 'M. Estève', 'Espagnol', [e('4A', 'lvb', ESP), e('4B', 'lvb', ESP), e('4C', 'lvb', ESP)]],
  ['pEs2', 'Mme Espinasse', 'Espagnol', [e('4D', 'lvb', ESP, true), e('4E', 'lvb', ESP)]],
  ['pAl', 'Mme Albrecht', 'Allemand', [e('4A', 'lvb', ALL), e('4D', 'lvb', ALL)]],
  ['pBz', 'Mme Bréhat', 'Breton', [e('4A', 'option', BZH)]],
  ['pLa', 'M. Lacaze', 'Latin', [e('4C', 'option', LAT), e('4D', 'option', LAT)]],
  ['pAt', 'M. Athané', 'Athlétisme', [e('4B', 'option', ATH), e('4C', 'option', ATH)]],
];

/** Professeur principal de chaque classe. */
const PP = { '4A': 'pF1', '4B': 'pM2', '4C': 'pS1', '4D': 'pF2', '4E': 'pEs2' };

/** Profil de l'élève j de la classe. */
function profil(classe, j) {
  const options = [];
  let lvbId = ESP;
  let ulis = false;
  if ((classe === '4A' || classe === '4D') && j % 9 === 0) lvbId = ALL;
  if (classe === '4A' && (j === 1 || j === 2)) options.push(BZH, HGB);
  if ((classe === '4C' || classe === '4D') && j % 4 === 1) options.push(LAT);
  if ((classe === '4B' || classe === '4C') && j % 3 === 2) options.push(ATH);
  if (classe === '4D' && (j === 5 || j === 6)) ulis = true;
  if (classe === '4E' && (j === 3 || j === 4)) ulis = true;
  if (classe === '4E' && j === 4) lvbId = null;
  return { lvbId, optionIds: options, ulis };
}

/** Le niveau de 4e. effectifs : élèves par classe (4A à 4E) ; fin : heure de fin de la soirée (début 17 h). */
export function college4e({ effectifs = [26, 24, 25, 26, 26], date = '2027-01-14', fin = '20:30' } = {}) {
  const etat = etatVide('4e');
  etat.soiree.etab = 'Collège (test)';
  etat.soiree.date = date;
  etat.soiree.fin = fin; // 14 créneaux de 15 minutes
  etat.options = [
    { id: BZH, nom: 'Breton' },
    { id: LAT, nom: 'Latin' },
    { id: ATH, nom: 'Athlétisme' },
    { id: HGB, nom: 'Histoire-géographie en breton' },
  ];
  const classes = ['4A', '4B', '4C', '4D', '4E'];
  etat.classes = classes.map((nom) => ({ id: 'c' + nom, nom, ppId: PP[nom] }));
  let i = 0;
  classes.forEach((classe, k) => {
    for (let j = 0; j < effectifs[k]; j++, i++) {
      etat.eleves.push({
        id: 'e' + i,
        nom: NOMS[(i * 5) % NOMS.length],
        prenom: PRENOMS[(i * 3) % PRENOMS.length] + ' ' + i,
        classeId: 'c' + classe,
        ...profil(classe, j),
        prioritaire: false,
        fratrie: '',
        pasAvant: '',
        pasApres: '',
        binomeId: null,
        slot: null,
        verrou: false,
      });
    }
  });
  etat.profs = PROFS.map(([id, nom, discipline, enseignements]) => ({ id, nom, discipline, enseignements, dispoDe: '', dispoA: '' }));
  return etat;
}
