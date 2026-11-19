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
  etat.classes = ['6A', '6B', '6C', '6D'].map((nom) => ({ id: 'c' + nom, nom }));
  let i = 0;
  etat.classes.forEach((c, k) => {
    for (let n = 0; n < effectifs[k]; n++, i++) {
      etat.eleves.push({
        id: 'e' + i,
        nom: NOMS[(i * 7) % NOMS.length],
        prenom: PRENOMS[(i * 11) % PRENOMS.length],
        classeId: c.id,
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
    classeIds: classes.split(',').map((c) => 'c' + c),
    dispoDe: '',
    dispoA: '',
  }));
  return etat;
}
