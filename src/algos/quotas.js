// Répartition du nombre d'élèves de chaque classe entre les binômes (« quotas »).
//
// Problème d'affectation avec capacités : chaque élève d'une classe doit aller chez un binôme qui
// reçoit cette classe, sans dépasser le nombre de créneaux du binôme. On place les élèves un par un ;
// si tous les binômes possibles sont pleins, on cherche une chaîne de déplacements à travers les
// binômes glissants (chemin augmentant). On équilibre ensuite les charges par des chaînes de transferts.

/**
 * @param {Array<{id, classeIds, cap}>} binomes  binômes avec leur capacité
 * @param {Object<string, number>} besoins       élèves à placer par classe
 * @param {Object<string, number>} [base]        élèves déjà placés (verrouillés) par binôme
 * @param {Set<string>} [enPremier]              classes (groupes) à placer avant les autres : élèves prioritaires
 * @returns {{x, charge, nonPlaces, manque}}
 *   x[idBinome][idClasse] : nombre d'élèves de la classe attribués au binôme
 *   charge[idBinome]      : total d'élèves du binôme (base comprise)
 *   nonPlaces[idClasse]   : élèves sans place faute de capacité
 */
export function calculerQuotas(binomes, besoins, base = {}, enPremier = new Set()) {
  const charge = {};
  const x = {};
  const parClasse = {};
  const nonPlaces = {};
  binomes.forEach((b) => {
    charge[b.id] = base[b.id] || 0;
    x[b.id] = {};
    b.classeIds.forEach((c) => (parClasse[c] = parClasse[c] || []).push(b));
  });

  const ajouter = (b, c, n) => {
    x[b.id][c] = (x[b.id][c] || 0) + n;
    charge[b.id] += n;
  };

  function placer(classe, visites) {
    const possibles = (parClasse[classe] || []).filter((b) => !visites.has(b.id)).sort((a, b) => charge[a.id] - charge[b.id]);
    for (const b of possibles) {
      if (charge[b.id] < b.cap) {
        ajouter(b, classe, 1);
        return true;
      }
    }
    // Binômes pleins : libérer une place en déplaçant un élève d'une autre classe ailleurs.
    for (const b of possibles) {
      visites.add(b.id);
      for (const autre of b.classeIds) {
        if (autre === classe || !(x[b.id][autre] > 0)) continue;
        ajouter(b, autre, -1);
        if (placer(autre, visites)) {
          ajouter(b, classe, 1);
          return true;
        }
        ajouter(b, autre, 1);
      }
    }
    return false;
  }

  // Les élèves prioritaires d'abord (V2-F6), puis les classes servies par le moins de binômes.
  Object.keys(besoins)
    .sort((a, b) => enPremier.has(b) - enPremier.has(a) || (parClasse[a] || []).length - (parClasse[b] || []).length)
    .forEach((c) => {
      for (let i = 0; i < besoins[c]; i++) {
        if (!placer(c, new Set())) nonPlaces[c] = (nonPlaces[c] || 0) + 1;
      }
    });

  equilibrer(binomes, parClasse, x, charge);

  return { x, charge, nonPlaces, manque: Object.values(nonPlaces).reduce((a, b) => a + b, 0) };
}

/**
 * Tant que possible, fait passer un élève du binôme le plus chargé vers un binôme qui a au moins
 * deux élèves de moins, directement ou par une chaîne de transferts via les binômes glissants.
 */
function equilibrer(binomes, parClasse, x, charge) {
  for (let garde = 0; garde < 5000; garde++) {
    let transfert = false;
    for (const haut of binomes.slice().sort((a, b) => charge[b.id] - charge[a.id])) {
      const precedent = new Map([[haut.id, null]]);
      const file = [haut];
      let cible = null;
      while (file.length && !cible) {
        const b = file.shift();
        for (const c of b.classeIds) {
          if (!(x[b.id][c] > 0)) continue;
          for (const b2 of parClasse[c]) {
            if (precedent.has(b2.id)) continue;
            precedent.set(b2.id, { de: b, classe: c });
            if (charge[b2.id] < b2.cap && charge[b2.id] <= charge[haut.id] - 2) {
              cible = b2;
              break;
            }
            file.push(b2);
          }
          if (cible) break;
        }
      }
      if (cible) {
        for (let b = cible; precedent.get(b.id); ) {
          const { de, classe } = precedent.get(b.id);
          x[de.id][classe]--;
          x[b.id][classe] = (x[b.id][classe] || 0) + 1;
          b = de;
        }
        charge[haut.id]--;
        charge[cible.id]++;
        transfert = true;
        break;
      }
    }
    if (!transfert) return;
  }
}
