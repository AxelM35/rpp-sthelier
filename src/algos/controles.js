// Contrôles de cohérence affichés dans l'interface.
//
// Chaque point : { niveau: 'bloquant' | 'avertissement' | 'info', texte, onglet }.

import { ECART_CHARGE_VISE } from '../config.js';
import { elevesDuBinome, libelleBinome, nomClasse, nomEleve, profsDuBinome, trouverBinome } from '../modele/acces.js';
import { formaterHeure } from '../utils/texte.js';
import { capacite, creneaux, familleDisponible, profDisponible } from './creneaux.js';
import { chargesActuelles, ecartCharges } from './equilibre.js';
import { cleFratrie } from './horaires.js';

export function controler(etat) {
  const liste = creneaux(etat.soiree);
  const points = [];
  const ajouter = (niveau, texte, onglet) => points.push({ niveau, texte, onglet });

  // Soirée
  if (!liste.length) ajouter('bloquant', 'Aucun créneau : vérifiez les heures de début et de fin et la durée.', 'soiree');
  if (!etat.soiree.date && etat.eleves.length) {
    ajouter('avertissement', "La date de la soirée n'est pas renseignée : elle n'apparaîtra pas sur les convocations.", 'soiree');
  }

  // Binômes
  const pris = new Set();
  etat.binomes.forEach((b) => b.profIds.forEach((id) => id && pris.add(id)));
  const sansBinome = etat.profs.filter((p) => p.classeIds.length && !pris.has(p.id));
  if (etat.binomes.length && sansBinome.length) {
    ajouter('info', sansBinome.length + ' professeur(s) sans binôme : ' + sansBinome.map((p) => p.nom).join(', ') + '.', 'binomes');
  }
  const salles = {};
  etat.binomes.forEach((b) => {
    const profs = profsDuBinome(etat, b);
    const nom = libelleBinome(etat, b);
    if (profs.length < 2) ajouter('avertissement', 'Binôme incomplet : ' + nom + '.', 'binomes');
    if (!b.classeIds.length) ajouter('avertissement', 'Binôme sans classe : ' + nom + '.', 'binomes');
    b.classeIds.forEach((c) =>
      profs.forEach((p) => {
        if (!p.classeIds.includes(c))
          ajouter('avertissement', p.nom + " n'enseigne pas en " + nomClasse(etat, c) + ' (binôme ' + nom + ').', 'binomes');
      }),
    );
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
  const sansSalle = etat.binomes.filter((b) => !(b.salle || '').trim()).length;
  if (etat.binomes.length && sansSalle) ajouter('info', sansSalle + ' binôme(s) sans salle.', 'binomes');

  // Répartition
  const nonAffectes = etat.eleves.filter((e) => !e.binomeId);
  if (nonAffectes.length) ajouter('avertissement', nonAffectes.length + ' élève(s) sans binôme.', 'repartition');
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
