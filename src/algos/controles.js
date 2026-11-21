// Contrôles de cohérence affichés dans l'interface.
//
// Chaque point : { niveau: 'bloquant' | 'avertissement' | 'info', texte, onglet }.

import { ECART_CHARGE_VISE, PRIORITAIRES_MAX } from '../config.js';
import {
  classesPossibles,
  codeBinome,
  elevesDuBinome,
  enseignementDans,
  libelleBinome,
  nomClasse,
  nomEleve,
  profsDuBinome,
  trouverBinome,
  trouverProf,
} from '../modele/acces.js';
import { concerne, dansEquipe, nomReference } from '../modele/equipe.js';
import { formaterHeure } from '../utils/texte.js';
import { capacite, creneaux, disponibilites, familleDisponible, profDisponible } from './creneaux.js';
import { chargesActuelles, ecartCharges } from './equilibre.js';
import { compatibles, grouperEleves, limitesDuBinome } from './groupes.js';
import { cleFratrie } from './horaires.js';

/** « Nom Prénom (4 B), … » : cinq élèves au plus, puis « … ». */
function quelquesEleves(etat, eleves) {
  const noms = eleves.slice(0, 5).map((e) => nomEleve(e) + ' (' + nomClasse(etat, e.classeId) + ')');
  return noms.join(', ') + (eleves.length > 5 ? ', …' : '');
}

/**
 * Contrôles des équipes (cahier des charges v2, sections 4.4 et 6.3) : élèves sans binôme possible,
 * LVB et options sans enseignant ou sans élève, deux enseignants d'une même LVB, élèves sans LVB.
 */
function controlerEquipes(etat, ajouter) {
  const sansEquipe = grouperEleves(etat)
    .filter((g) => g.equipe.size < 2)
    .flatMap((g) => g.eleves);
  if (etat.profs.length && sansEquipe.length) {
    ajouter(
      'avertissement',
      sansEquipe.length +
        ' élève(s) ont moins de deux enseignants dans leur équipe : aucun binôme ne peut les recevoir. ' +
        'Complétez les enseignements de leur classe ou désignez son professeur principal : ' +
        quelquesEleves(etat, sansEquipe) +
        '.',
      'binomes',
    );
  }

  for (const c of etat.classes) {
    const profs = etat.profs.filter((p) => enseignementDans(p, c.id));
    if (!profs.length) continue;
    const eleves = etat.eleves.filter((e) => e.classeId === c.id);
    const classe = c.nom;
    // LVB et options suivies sans enseignant dans la classe.
    const suivies = new Map();
    eleves.forEach((e) => {
      if (e.lvbId) suivies.set('lvb|' + e.lvbId, (suivies.get('lvb|' + e.lvbId) || 0) + 1);
      e.optionIds.forEach((o) => suivies.set('option|' + o, (suivies.get('option|' + o) || 0) + 1));
    });
    for (const [cle, nb] of suivies) {
      const [type, refId] = cle.split('|');
      if (profs.some((p) => enseignementDans(p, c.id).type === type && enseignementDans(p, c.id).refId === refId)) continue;
      ajouter(
        'info',
        classe + ' : ' + nb + ' élève(s) suivent ' + nomReference(etat, { type, refId }) + ', sans enseignant déclaré dans la classe.',
        'donnees',
      );
    }
    // LVB et options enseignées sans élève concerné.
    profs.forEach((p) => {
      const x = enseignementDans(p, c.id);
      if ((x.type === 'lvb' || x.type === 'option') && !eleves.some((e) => concerne(x, e))) {
        ajouter(
          'info',
          p.nom + ' enseigne ' + nomReference(etat, x) + ' en ' + classe + ', mais aucun élève de la classe ne le suit.',
          'donnees',
        );
      }
    });
    // Deux enseignants d'une même LVB (question 2) : les deux comptent pour tous les élèves de la LVB.
    etat.lvb.forEach((l) => {
      const memes = profs.filter((p) => enseignementDans(p, c.id).type === 'lvb' && enseignementDans(p, c.id).refId === l.id);
      if (memes.length > 1) {
        ajouter(
          'avertissement',
          classe +
            ' : ' +
            memes.length +
            " enseignants d'" +
            l.nom +
            ' (' +
            memes.map((p) => p.nom).join(', ') +
            ') : chacun est compté dans l’équipe de tous les élèves de cette LVB.',
          'donnees',
        );
      }
    });
  }

  // Élèves sans LVB, hors élèves ULIS (question 6).
  if (etat.lvb.length) {
    const sansLvb = etat.eleves.filter((e) => !e.lvbId && !e.ulis);
    if (sansLvb.length) ajouter('info', sansLvb.length + ' élève(s) sans LVB : ' + quelquesEleves(etat, sansLvb) + '.', 'donnees');
  }
}

/**
 * Élèves prioritaires du professeur principal (V2-R11, section 6.3, décisions 2b, 2c et 3 du lot 4) : classe sans
 * professeur principal ; plus de PRIORITAIRES_MAX élèves prioritaires dans une classe ; professeur principal sans
 * binôme ou présent sur trop peu de créneaux ; élève prioritaire reçu par un binôme sans son professeur principal.
 */
function controlerPrioritaires(etat, ajouter, liste) {
  for (const c of etat.classes) {
    const eleves = etat.eleves.filter((e) => e.prioritaire && e.classeId === c.id);
    if (!eleves.length) continue;
    const pp = c.ppId && trouverProf(etat, c.ppId);
    if (pp) {
      const b = etat.binomes.find((x) => x.profIds.includes(pp.id));
      const prioritaires = eleves.length + ' élève(s) prioritaire(s) de ' + c.nom;
      if (etat.binomes.length && !b) {
        ajouter(
          'avertissement',
          pp.nom + ', professeur principal de ' + c.nom + ', n’a pas de binôme pour recevoir ses ' + prioritaires + '.',
          'binomes',
        );
      }
      const profs = b ? profsDuBinome(etat, b) : [pp];
      const presents = disponibilites(profs, liste).filter(Boolean).length;
      if (liste.length && presents < Math.min(eleves.length, PRIORITAIRES_MAX)) {
        ajouter(
          'avertissement',
          (b ? 'Le binôme ' + libelleBinome(etat, b) : pp.nom) +
            ' n’est présent que sur ' +
            presents +
            ' créneau(x) pour les ' +
            prioritaires +
            ' : les autres seront reçus par un autre binôme.',
          b ? 'binomes' : 'donnees',
        );
      }
    }
    if (!c.ppId) {
      ajouter(
        'avertissement',
        c.nom +
          ' : ' +
          eleves.length +
          ' élève(s) prioritaire(s), mais aucun professeur principal désigné pour les recevoir. Désignez-le dans la carte « Classes ».',
        'donnees',
      );
    }
    if (eleves.length > PRIORITAIRES_MAX) {
      ajouter(
        'avertissement',
        c.nom +
          ' : ' +
          eleves.length +
          ' élèves prioritaires, ' +
          PRIORITAIRES_MAX +
          ' au plus. Décochez-en ' +
          (eleves.length - PRIORITAIRES_MAX) +
          ' dans la liste des élèves : ' +
          quelquesEleves(etat, eleves) +
          '.',
        'donnees',
      );
    }
  }
}

export function controler(etat) {
  const liste = creneaux(etat.soiree);
  const points = [];
  const ajouter = (niveau, texte, onglet) => points.push({ niveau, texte, onglet });

  // Soirée
  if (!liste.length) ajouter('bloquant', 'Aucun créneau : vérifiez les heures de début et de fin et la durée.', 'soiree');
  if (!etat.soiree.date && etat.eleves.length) {
    ajouter('avertissement', "La date de la soirée n'est pas renseignée : elle n'apparaîtra pas sur les convocations.", 'soiree');
  }

  controlerEquipes(etat, ajouter);
  controlerPrioritaires(etat, ajouter, liste);

  // Binômes
  const pris = new Set();
  etat.binomes.forEach((b) => b.profIds.forEach((id) => id && pris.add(id)));
  const sansBinome = etat.profs.filter((p) => p.enseignements.length && !pris.has(p.id));
  if (etat.binomes.length && sansBinome.length) {
    ajouter('info', sansBinome.length + ' professeur(s) sans binôme : ' + sansBinome.map((p) => p.nom).join(', ') + '.', 'binomes');
  }
  const salles = {};
  const limitesParNom = new Map(); // LVB ou option → binômes qu'elle limite
  etat.binomes.forEach((b) => {
    const profs = profsDuBinome(etat, b);
    const nom = libelleBinome(etat, b);
    if (profs.length < 2) ajouter('avertissement', 'Binôme incomplet : ' + nom + '.', 'binomes');
    if (!b.classeIds.length) ajouter('avertissement', 'Binôme sans classe : ' + nom + '.', 'binomes');
    b.classeIds.forEach((c) =>
      profs.forEach((p) => {
        if (!classesPossibles(etat, p).includes(c))
          ajouter('avertissement', p.nom + " n'enseigne pas en " + nomClasse(etat, c) + ' (binôme ' + nom + ').', 'binomes');
      }),
    );
    if (profs.length === 2) {
      b.classeIds.forEach((c) => {
        if (!compatibles(etat, profs[0], profs[1], c)) {
          ajouter(
            'avertissement',
            'Binôme ' +
              nom +
              ' : en ' +
              nomClasse(etat, c) +
              ', il ne peut recevoir que les élèves qui suivent à la fois ' +
              limitesDuBinome(etat, { ...b, classeIds: [c] })
                .map((x) => x.nom)
                .join(' et ') +
              '.',
            'binomes',
          );
        }
      });
      const limites = limitesDuBinome(etat, b);
      if (limites.length && b.classeIds.every((c) => compatibles(etat, profs[0], profs[1], c))) {
        limites.forEach((x) => limitesParNom.set(x.nom, [...(limitesParNom.get(x.nom) || []), b]));
      }
    }
    const recus = elevesDuBinome(etat, b).length;
    const cap = capacite(profs, liste);
    if (recus > cap) ajouter('avertissement', 'Binôme ' + nom + ' : ' + recus + ' élèves pour ' + cap + ' créneaux.', 'repartition');
    const salle = (b.salle || '').trim().toLowerCase();
    if (salle) (salles[salle] = salles[salle] || []).push(b);
  });
  Object.values(salles).forEach((groupe) => {
    if (groupe.length > 1) {
      ajouter(
        'bloquant',
        'Salle ' + groupe[0].salle + ' attribuée à plusieurs binômes : ' + groupe.map((b) => libelleBinome(etat, b)).join(' ; ') + '.',
        'binomes',
      );
    }
  });
  // Binômes limités à une LVB ou une option : un seul message, regroupé par LVB ou option (allègement du 20 novembre).
  if (limitesParNom.size) {
    const binomes = new Set([...limitesParNom.values()].flat());
    ajouter(
      'info',
      binomes.size +
        ' binôme(s) limité(s) à une LVB ou une option, hors calcul de l’écart : ' +
        [...limitesParNom]
          .map(([nom, liste]) => nom + ' (' + [...new Set(liste)].map((b) => codeBinome(etat, b)).join(', ') + ')')
          .join(', ') +
        '.',
      'binomes',
    );
  }
  const sansSalle = etat.binomes.filter((b) => !(b.salle || '').trim()).length;
  if (etat.binomes.length && sansSalle) ajouter('info', sansSalle + ' binôme(s) sans salle.', 'binomes');

  // Répartition
  const nonAffectes = etat.eleves.filter((e) => !e.binomeId);
  if (nonAffectes.length) ajouter('avertissement', nonAffectes.length + ' élève(s) sans binôme.', 'repartition');
  const sansPP = etat.eleves.filter((e) => {
    const b = e.prioritaire && trouverBinome(etat, e.binomeId);
    const pp = b && etat.classes.find((c) => c.id === e.classeId).ppId;
    return b && pp && !b.profIds.includes(pp);
  });
  if (sansPP.length) {
    ajouter(
      'avertissement',
      sansPP.length +
        ' élève(s) prioritaire(s) reçu(s) par un binôme sans leur professeur principal : ' +
        quelquesEleves(etat, sansPP) +
        '.',
      'repartition',
    );
  }
  const charges = ecartCharges(chargesActuelles(etat));
  if (etat.eleves.some((e) => e.binomeId) && charges.ecart > ECART_CHARGE_VISE) {
    ajouter(
      'avertissement',
      'Répartition déséquilibrée : de ' +
        charges.min +
        ' à ' +
        charges.max +
        ' élèves selon les binômes (écart visé : ' +
        ECART_CHARGE_VISE +
        ' au plus).',
      'repartition',
    );
  }

  // Planning
  const sansHoraire = etat.eleves.filter((e) => e.binomeId && e.slot == null);
  if (sansHoraire.length) ajouter('avertissement', sansHoraire.length + ' élève(s) sans horaire.', 'planning');
  const occupes = {};
  etat.eleves.forEach((e) => {
    const b = trouverBinome(etat, e.binomeId);
    if (!b) return;
    const horsEquipe = profsDuBinome(etat, b).filter((p) => !dansEquipe(etat, p, e));
    if (b.classeIds.includes(e.classeId) && horsEquipe.length) {
      ajouter(
        'avertissement',
        nomEleve(e) +
          ' (' +
          nomClasse(etat, e.classeId) +
          ') est reçu(e) par ' +
          horsEquipe.map((p) => p.nom).join(' et ') +
          ", qui ne l'" +
          (horsEquipe.length > 1 ? 'ont' : 'a') +
          ' pas en cours (binôme ' +
          libelleBinome(etat, b) +
          ').',
        'repartition',
      );
    }
    if (!b.classeIds.includes(e.classeId)) {
      ajouter(
        'avertissement',
        nomEleve(e) +
          ' (' +
          nomClasse(etat, e.classeId) +
          ') est chez un binôme qui ne couvre pas sa classe (' +
          libelleBinome(etat, b) +
          ').',
        'repartition',
      );
    }
    if (e.slot == null) return;
    const c = liste[e.slot];
    const cle = b.id + '|' + e.slot;
    if (occupes[cle])
      ajouter(
        'bloquant',
        'Deux élèves sur le même créneau : ' + nomEleve(e) + ' et ' + nomEleve(occupes[cle]) + ' (' + formaterHeure(c.d) + ').',
        'planning',
      );
    occupes[cle] = e;
    if (!familleDisponible(e, c))
      ajouter(
        'avertissement',
        nomEleve(e) + ' : rendez-vous à ' + formaterHeure(c.d) + ' hors des disponibilités de la famille.',
        'planning',
      );
    profsDuBinome(etat, b).forEach((p) => {
      if (!profDisponible(p, c))
        ajouter(
          'avertissement',
          p.nom + ' est indisponible à ' + formaterHeure(c.d) + ' (rendez-vous de ' + nomEleve(e) + ').',
          'planning',
        );
    });
  });
  const fratries = {};
  etat.eleves.forEach((e) => {
    const k = cleFratrie(e);
    if (k && e.slot != null && e.binomeId) (fratries[k] = fratries[k] || []).push(e);
  });
  Object.values(fratries).forEach((groupe) => {
    groupe.sort((a, b) => a.slot - b.slot);
    for (let i = 1; i < groupe.length; i++) {
      const ecart = groupe[i].slot - groupe[i - 1].slot;
      const noms = nomEleve(groupe[i - 1]) + ' / ' + nomEleve(groupe[i]);
      if (ecart === 0) ajouter('avertissement', 'Fratrie ' + noms + ' : rendez-vous simultanés.', 'planning');
      else if (ecart > 2) ajouter('info', 'Fratrie ' + noms + ' : rendez-vous éloignés.', 'planning');
    }
  });

  return points;
}

/** Points à traiter (hors simples informations). */
export const aCorriger = (points) => points.filter((p) => p.niveau !== 'info');
