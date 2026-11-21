// Durée des rendez-vous par niveau et aide au réglage de la capacité (lot 4, étape 4a).

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bilanCapacite, profsMobilisables } from '../../src/algos/reglages.js';
import { NIVEAUX } from '../../src/config.js';
import { bornerDuree, dureeParDefaut, etatVide } from '../../src/modele/etat.js';
import { college } from '../fixtures/college.js';

/** Niveau fictif : « eleves » élèves dans une classe, « profs » professeurs qui y enseignent, soirée de 17h à 20h. */
function niveau({ eleves, profs, ...soiree }) {
  const etat = etatVide('6e');
  Object.assign(etat.soiree, { duree: 15, ...soiree });
  etat.classes = [{ id: 'c6A', nom: '6A', ppId: null }];
  for (let i = 0; i < profs; i++) {
    etat.profs.push({
      id: 'p' + i,
      nom: 'P' + i,
      discipline: '',
      enseignements: [{ classeId: 'c6A', type: 'classe' }],
      dispoDe: '',
      dispoA: '',
    });
  }
  for (let i = 0; i < eleves; i++) {
    etat.eleves.push({ id: 'e' + i, nom: 'N' + i, prenom: '', classeId: 'c6A', lvbId: null, optionIds: [], ulis: false });
  }
  return etat;
}

test('une soirée neuve dure 10 minutes en 6e, 15 minutes aux autres niveaux', () => {
  assert.deepEqual(
    NIVEAUX.map((n) => etatVide(n).soiree.duree),
    [10, 15, 15, 15],
  );
  assert.equal(dureeParDefaut('5e'), 15);
});

test('la durée saisie va de 5 à 60 minutes, à la minute près', () => {
  assert.equal(bornerDuree('12', '5e'), 12);
  assert.equal(bornerDuree(3, '5e'), 5);
  assert.equal(bornerDuree(90, '5e'), 60);
  assert.equal(bornerDuree(12.4, '5e'), 12);
  assert.equal(bornerDuree('', '6e'), 10, 'champ vidé : durée par défaut du niveau');
  assert.equal(bornerDuree('abc', '4e'), 15);
});

test('capacité suffisante : aucune proposition', () => {
  const b = bilanCapacite(college());
  assert.deepEqual([b.binomes, b.creneaux, b.besoin, b.suffit], [10, 12, 11, true]);
  assert.equal(b.duree, null);
  assert.equal(b.fin, null);
});

test('rien à calculer sans élève ou sans binôme possible', () => {
  assert.equal(bilanCapacite(niveau({ eleves: 0, profs: 4 })), null);
  assert.equal(bilanCapacite(niveau({ eleves: 30, profs: 1 })), null);
});

test('cas de la 6e réelle (139 élèves, 21 professeurs) : 10 minutes ou fin à 20h30', () => {
  const b = bilanCapacite(niveau({ eleves: 139, profs: 21 }));
  assert.deepEqual([b.binomes, b.creneaux, b.besoin, b.suffit], [10, 12, 14, false]);
  assert.deepEqual(b.duree, { minutes: 10, creneaux: 18 }, 'durée ronde, plutôt que 12 minutes');
  assert.deepEqual(b.fin, { heure: '20:30', creneaux: 14 });
});

test("l'heure de fin proposée tient compte des pauses", () => {
  const b = bilanCapacite(niveau({ eleves: 139, profs: 21, pauses: [{ debut: '18:30', duree: 15 }] }));
  assert.equal(b.creneaux, 11);
  assert.deepEqual(b.fin, { heure: '20:45', creneaux: 14 }, '6 créneaux avant la pause, 8 après 18h45');
});

test('la durée proposée est plus courte que la durée actuelle, et une durée non ronde est arrondie vers le bas', () => {
  const b = bilanCapacite(niveau({ eleves: 160, profs: 10, duree: 12 })); // besoin : 32 créneaux
  assert.deepEqual(b.duree, { minutes: 5, creneaux: 36 });
  assert.equal(b.fin, null, 'fin au-delà de 22h00 : pas de proposition');
});

test('aucun réglage raisonnable ne suffit', () => {
  const b = bilanCapacite(niveau({ eleves: 200, profs: 2 }));
  assert.equal(b.suffit, false);
  assert.deepEqual([b.duree, b.fin], [null, null]);
});

test('un professeur principal sans enseignement compte parmi les professeurs mobilisables', () => {
  const etat = niveau({ eleves: 10, profs: 3 });
  etat.profs[2].enseignements = [];
  assert.equal(profsMobilisables(etat), 2);
  etat.classes[0].ppId = 'p2';
  assert.equal(profsMobilisables(etat), 3);
});
