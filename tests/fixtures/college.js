// Jeu de données fictif pour les tests : 4 classes de 6e (108 élèves) et 20 professeurs.
// Les identifiants sont déterministes pour que les tests soient reproductibles.

import { etatVide } from '../../src/modele/etat.js';

const NOMS = [
  'Martin',
  'Bernard',
  'Dubois',
  'Thomas',
  'Robert',
  'Richard',
  'Petit',
  'Durand',
  'Leroy',
  'Moreau',
  'Simon',
  'Laurent',
  'Lefebvre',
  'Michel',
  'Garcia',
  'David',
  'Bertrand',
  'Roux',
  'Vincent',
  'Fournier',
  'Morel',
  'Girard',
  'André',
  'Lefèvre',
  'Mercier',
  'Dupont',
  'Lambert',
  'Bonnet',
  'François',
  'Martinez',
  'Legrand',
  'Garnier',
  'Faure',
  'Rousseau',
  'Blanc',
  'Guérin',
  'Muller',
  'Henry',
  'Roussel',
  'Nicolas',
  'Perrin',
];
const PRENOMS = [
  'Emma',
  'Lucas',
  'Jade',
  'Hugo',
  'Louise',
  'Léo',
  'Alice',
  'Gabriel',
  'Chloé',
  'Raphaël',
  'Lina',
  'Arthur',
  'Rose',
  'Louis',
  'Anna',
  'Jules',
  'Mila',
  'Adam',
  'Léa',
  'Maël',
  'Inès',
  'Nathan',
  'Zoé',
  'Ethan',
  'Sarah',
  'Noah',
  'Camille',
  'Tom',
  'Juliette',
  'Paul',
  'Manon',
  'Théo',
  'Clara',
  'Sacha',
  'Eva',
  'Noé',
  'Lou',
];
const PROFS = [
  ['Mme Aubert', 'Français', '6A'],
  ['M. Besson', 'Français', '6B,6C'],
  ['Mme Caron', 'Français', '6D'],
  ['M. Delmas', 'Mathématiques', '6A,6B'],
  ['Mme Etienne', 'Mathématiques', '6C,6D'],
  ['M. Ferrand', 'Histoire-géographie', '6A,6C'],
  ['Mme Gilbert', 'Histoire-géographie', '6B,6D'],
  ['Mme Hamon', 'Anglais', '6A,6B'],
  ['M. Imbert', 'Anglais', '6C,6D'],
  ['M. Joly', 'EPS', '6A,6D'],
  ['Mme Klein', 'EPS', '6B,6C'],
  ['Mme Lacroix', 'SVT', '6A,6B'],
  ['M. Marchal', 'SVT', '6C,6D'],
  ['M. Navarro', 'Physique-chimie', '6A,6B,6C,6D'],
  ['Mme Olivier', 'Technologie', '6A,6B'],
  ['M. Picard', 'Technologie', '6C,6D'],
  ['Mme Quentin', 'Arts plastiques', '6A,6B,6C,6D'],
  ['M. Renard', 'Éducation musicale', '6A,6B,6C,6D'],
  ['Mme Schmitt', 'Allemand', '6A,6B'],
  ['M. Tessier', 'Documentation', '6A,6B,6C,6D'],
];

/**
 * effectifs : élèves par classe (6A, 6B, 6C, 6D).
 * Contient une famille contrainte « pas avant 18h30 », une « pas après 18h00 » et une fratrie (code J1).
 */
export function college({ effectifs = [27, 28, 26, 27], date = '2026-12-01' } = {}) {
  const etat = etatVide();
  etat.soiree.etab = 'Collège (test)';
  etat.soiree.date = date;
  etat.soiree.duree = 15; // durée de la version 1 (une 6e neuve part sur 10 minutes) : 12 créneaux
  etat.classes = ['6A', '6B', '6C', '6D'].map((nom) => ({ id: 'c' + nom, nom, ppId: null }));
  let i = 0;
  etat.classes.forEach((c, k) => {
    for (let n = 0; n < effectifs[k]; n++, i++) {
      etat.eleves.push({
        id: 'e' + i,
        nom: NOMS[(i * 7) % NOMS.length],
        prenom: PRENOMS[(i * 11) % PRENOMS.length],
        classeId: c.id,
        lvbId: null,
        optionIds: [],
        ulis: false,
        fratrie: '',
        pasAvant: '',
        pasApres: '',
        binomeId: null,
        slot: null,
        verrou: false,
      });
    }
  });
  etat.eleves[3].pasAvant = '18:30';
  etat.eleves[40].pasApres = '18:00';
  etat.eleves[5].fratrie = 'J1';
  etat.eleves[30].fratrie = 'J1';
  etat.eleves[30].nom = etat.eleves[5].nom;
  etat.profs = PROFS.map(([nom, discipline, classes], k) => ({
    id: 'p' + k,
    nom,
    discipline,
    enseignements: classes.split(',').map((c) => ({ classeId: 'c' + c, type: 'classe', refId: null, sansUlis: false })),
    dispoDe: '',
    dispoA: '',
  }));
  return etat;
}

/**
 * Les mêmes données au format de la version 1 (application de la 6e) : pas de niveau, ni de listes de LVB
 * et d'options ; classes d'un professeur dans classeIds ; ni LVB, ni options, ni ULIS pour les élèves.
 */
export function enFormatV1(etat) {
  const v1 = structuredClone(etat);
  v1.v = 1;
  delete v1.niveau;
  delete v1.lvb;
  delete v1.options;
  v1.classes.forEach((c) => delete c.ppId);
  v1.profs.forEach((p) => {
    p.classeIds = p.enseignements.map((x) => x.classeId);
    delete p.enseignements;
  });
  v1.eleves.forEach((e) => {
    delete e.lvbId;
    delete e.optionIds;
    delete e.ulis;
  });
  return v1;
}
