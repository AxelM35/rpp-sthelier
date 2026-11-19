// Réactions aux clics (actions) et aux modifications de champs (champs).
//
// Après une action, evenements.js enregistre l'état (sauf actions listées dans SANS_ENREGISTREMENT)
// puis réaffiche l'onglet.

import { proposerBinomes, proposerVariantes } from '../algos/binomes.js';
import { deposer } from '../algos/deplacement.js';
import { completerGeneration, genererTout } from '../algos/generation.js';
import { planifierHoraires } from '../algos/horaires.js';
import { repartirEleves } from '../algos/repartition.js';
import { CLASSES_MAX_PAR_BINOME } from '../config.js';
import { classesTriees, nomEleve, profsDuBinome, trouverBinome, trouverClasse, trouverEleve, trouverProf } from '../modele/acces.js';
import { etatVide, valider } from '../modele/etat.js';
import { chiffreNiveau, nomFichier, preparationVide } from '../modele/niveaux.js';
import { lireCSV } from '../io/csv.js';
import { classeurPlanning, csvPlanning } from '../io/exports.js';
import { importerLignes } from '../io/import.js';
import { MIME_XLSX } from '../io/xlsx.js';
import { nouvelId } from '../utils/texte.js';
import { app } from './app.js';
import { $, annoncer, confirmer, telecharger, toast } from './dom.js';
import { afficherDialogue, chargerLignes, fermerDialogue, lireFichierImport, ouvrirDialogue } from './dialogueImport.js';
import { DOCUMENTS } from './documents.js';
import { LETTRES } from './vues/comparaison.js';
import { allerAAccueil, allerAuNiveau } from './navigation.js';
import {
  annulerDerniereModification,
  effacerNiveauDefinitivement,
  effacerToutDefinitivement,
  enregistrer,
  lireNiveau,
  noterSauvegardeFichier,
} from './stockage.js';

const RAPPEL_SAUVEGARDE = ' Pensez à cliquer sur « Sauvegarder » pour garder une copie.';
const FICHIER_PERSONNEL = 'Fichier téléchargé. Il contient des données personnelles : rangez-le dans un espace protégé.';
const SAUVEGARDE_PERSONNELLE = 'Sauvegarde téléchargée. Elle contient des données personnelles : rangez-la dans un espace protégé.';

/** « 108 élèves, 20 professeurs, 9 binômes ». */
const contenu = (etat) => etat.eleves.length + ' élèves, ' + etat.profs.length + ' professeurs, ' + etat.binomes.length + ' binômes';

/** Télécharge la sauvegarde d'un niveau et note sa date. */
function telechargerSauvegarde(etat) {
  telecharger(nomFichier('rencontres-parents-profs', etat.niveau, 'json'), JSON.stringify(etat, null, 1), 'application/json');
  noterSauvegardeFichier(etat.niveau);
  toast(SAUVEGARDE_PERSONNELLE);
}

/**
 * Ouvre une sauvegarde déjà validée.
 * Depuis l'accueil, elle est rangée dans le niveau indiqué par le fichier (après confirmation si ce niveau contient
 * des données), puis ce niveau s'ouvre. Dans un niveau, seule une sauvegarde de ce niveau est acceptée.
 */
function ouvrirSauvegarde(etat) {
  const niveau = etat.niveau;
  if (app.niveau && app.niveau !== niveau) {
    app.ui.message = {
      ok: false,
      txt:
        "Fichier refusé : c'est une sauvegarde de la " +
        niveau +
        ". Pour l'ouvrir, revenez à l'accueil. Les données de la " +
        app.niveau +
        ' sont conservées.',
    };
    return;
  }
  if (!app.niveau) {
    const actuel = lireNiveau(niveau);
    if (
      !preparationVide(actuel) &&
      !confirmer(
        'Ce fichier est une sauvegarde de la ' +
          niveau +
          ' (' +
          contenu(etat) +
          ').\n\nLa ' +
          niveau +
          ' contient déjà des données (' +
          contenu(actuel) +
          ') : elles seront remplacées. ' +
          'Le bouton « Annuler » de la ' +
          niveau +
          ' permettra de revenir en arrière.\n\nContinuer ?',
      )
    )
      return;
    allerAuNiveau(niveau, { focus: true });
  }
  app.etat = etat;
  app.ui.message = { ok: true, txt: 'Sauvegarde de la ' + niveau + ' ouverte : ' + contenu(etat) + '.' };
  enregistrer();
  noterSauvegardeFichier(niveau);
}

/** Avertit avant de remplacer un travail existant ; renvoie vrai pour continuer. */
function confirmerRegeneration(etendue) {
  const { etat } = app;
  const affectes = etat.eleves.filter((e) => e.binomeId && !e.verrou).length;
  const verrous = etat.eleves.filter((e) => e.verrou).length;
  if (!affectes) return true;
  const conserves = etat.binomes.filter((b) => b.fixe && profsDuBinome(etat, b).length === 2).length;
  const quoi =
    etendue === 'binomes'
      ? 'Les binômes' +
        (conserves ? ' non conservés' : '') +
        ', la répartition et les horaires actuels vont être remplacés.' +
        (conserves ? '\n' + conserves + ' binôme(s) marqué(s) « Conservé » seront gardés.' : '')
      : 'La répartition et les horaires actuels vont être remplacés.';
  return confirmer(
    quoi +
      '\n\n' +
      affectes +
      ' élève(s) affecté(s) perdront leur binôme et leur horaire.' +
      (verrous
        ? '\n' +
          verrous +
          ' rendez-vous verrouillé(s) (cadenas) seront conservés' +
          (etendue === 'binomes' ? ', avec leur binôme' : '') +
          '.'
        : '\nAstuce : verrouillez (cadenas) les rendez-vous à conserver.') +
      '\n\nContinuer ?',
  );
}

/** Applique le résultat d'un algorithme : nouvel état et message. */
function appliquer({ etat, rapport }, rappel = false) {
  app.etat = etat;
  app.ui.message = rappel && rapport.ok ? { ...rapport, txt: rapport.txt + RAPPEL_SAUVEGARDE } : rapport;
}

/** Déplace l'élève sélectionné (ou glissé) vers une cible de l'interface. */
export function deposerEleve(eleveId, cible) {
  const r = deposer(app.etat, eleveId, cible);
  if (r.refus) toast(r.refus);
  app.etat = r.etat;
  enregistrer();
}

/** Fin d'un déplacement par sélection : annonce et focus sur l'élève déplacé. */
function terminerDeplacement(eleveId, cible) {
  const nom = nomEleve(trouverEleve(app.etat, eleveId));
  deposerEleve(eleveId, cible);
  app.ui.selection = null;
  app.ui.focus = 'action:selectionner|' + eleveId + '|';
  annoncer(nom + ' déplacé(e).');
}

export const actions = {
  // Accueil
  ouvrirNiveau: (el) => allerAuNiveau(el.dataset.id, { focus: true }),
  accueil: () => allerAAccueil(),
  choisirSauvegarde: () => $('#fichierSauvegarde').click(),
  sauvegarderNiveau: (el) => telechargerSauvegarde(lireNiveau(el.dataset.id)),
  effacerNiveau(el) {
    const niveau = el.dataset.id;
    const etat = lireNiveau(niveau);
    const ok = confirmer(
      'Effacer définitivement les données de la ' +
        niveau +
        ' de ce navigateur (' +
        contenu(etat) +
        ') ?\n\n' +
        'Cette action ne peut pas être annulée. Les autres niveaux ne sont pas concernés, ' +
        "ni les fichiers déjà sauvegardés ou exportés : supprimez-les vous-même s'ils ne servent plus.",
    );
    if (!ok) return;
    effacerNiveauDefinitivement(niveau);
    app.ui.message = { ok: true, txt: 'Les données de la ' + niveau + ' ont été effacées de ce navigateur.' };
    app.ui.focus = 'action:ouvrirNiveau|' + niveau + '|';
  },
  effacerToutDefinitivement() {
    const ok = confirmer(
      'Effacer définitivement les données de tous les niveaux (6e à 3e) de ce navigateur ?\n\n' +
        'Cette action ne peut pas être annulée. Les fichiers déjà sauvegardés ou exportés ne sont pas concernés : ' +
        "supprimez-les vous-même s'ils ne servent plus.",
    );
    if (!ok) return;
    effacerToutDefinitivement();
    app.ui.message = { ok: true, txt: 'Les données de tous les niveaux ont été effacées de ce navigateur.' };
  },

  // Navigation
  onglet(el) {
    app.ui.onglet = el.dataset.id;
    app.ui.message = null;
    app.ui.selection = null;
  },
  vuePlanning: (el) => (app.ui.vuePlanning = el.dataset.id),
  choisirDocument: (el) => (app.ui.document = el.dataset.id),
  basculerCompact: () => (app.ui.compact = !app.ui.compact),

  // En-tête
  annuler() {
    if (!annulerDerniereModification()) {
      toast('Rien à annuler.');
      return;
    }
    annoncer('Dernière modification annulée.');
    app.ui.message = null;
  },
  sauvegarder: () => telechargerSauvegarde(app.etat),
  toutEffacer() {
    const { etat } = app;
    const ok = confirmer(
      'Effacer toutes les données de la ' +
        app.niveau +
        ' (' +
        contenu(etat) +
        ') ?\n\n' +
        "Pensez à cliquer sur « Sauvegarder » avant. Le bouton Annuler permet de revenir en arrière tant que la page n'est pas rechargée. " +
        "Pour ne laisser aucune trace (après la soirée), utilisez plutôt « Effacer définitivement » dans l'onglet Soirée.",
    );
    if (!ok) return;
    app.etat = etatVide(app.niveau);
    app.ui.message = { ok: true, txt: 'Tout a été effacé. Le bouton Annuler permet de revenir en arrière.' };
  },

  effacerDefinitivement() {
    const ok = confirmer(
      'Effacer définitivement toutes les données de la ' +
        app.niveau +
        ' de ce navigateur (élèves, professeurs, binômes, planning) ?\n\n' +
        'Cette action ne peut pas être annulée. Les autres niveaux ne sont pas concernés, ' +
        "ni les fichiers déjà sauvegardés ou exportés : supprimez-les vous-même s'ils ne servent plus.",
    );
    if (!ok) return;
    effacerNiveauDefinitivement(app.niveau);
    Object.assign(app.ui, {
      onglet: 'soiree',
      selection: null,
      message: { ok: true, txt: 'Toutes les données de la ' + app.niveau + ' ont été effacées de ce navigateur.' },
    });
  },

  // Soirée
  ajouterPause: () => app.etat.soiree.pauses.push({ debut: '18:30', duree: 15 }),
  supprimerPause: (el) => app.etat.soiree.pauses.splice(Number(el.dataset.id), 1),

  // Données
  ajouterClasse() {
    app.etat.classes.push({ id: nouvelId(), nom: chiffreNiveau(app.niveau) + String.fromCharCode(65 + (app.etat.classes.length % 26)) });
  },
  supprimerClasse(el) {
    const { etat } = app;
    const c = trouverClasse(etat, el.dataset.id);
    const n = etat.eleves.filter((e) => e.classeId === c.id).length;
    if (n && !confirmer('Supprimer la classe ' + c.nom + ' et ses ' + n + ' élèves ?')) return;
    etat.classes = etat.classes.filter((x) => x.id !== c.id);
  },
  ajouterEleve() {
    const { etat, ui } = app;
    if (!etat.classes.length) {
      toast("Créez d'abord une classe.");
      return;
    }
    etat.eleves.push({
      id: nouvelId(),
      nom: '',
      prenom: '',
      classeId: ui.filtreDonnees || classesTriees(etat)[0].id,
      fratrie: '',
      pasAvant: '',
      pasApres: '',
      binomeId: null,
      slot: null,
      verrou: false,
    });
  },
  supprimerEleve: (el) => (app.etat.eleves = app.etat.eleves.filter((e) => e.id !== el.dataset.id)),
  ajouterProf: () => app.etat.profs.push({ id: nouvelId(), nom: '', discipline: '', classeIds: [], dispoDe: '', dispoA: '' }),
  supprimerProf: (el) => (app.etat.profs = app.etat.profs.filter((p) => p.id !== el.dataset.id)),
  basculerClasseProf(el) {
    const p = trouverProf(app.etat, el.dataset.id);
    const c = el.dataset.param;
    p.classeIds = p.classeIds.includes(c) ? p.classeIds.filter((x) => x !== c) : p.classeIds.concat(c);
  },

  // Binômes
  ajouterBinome() {
    const b = { id: nouvelId(), fixe: true, profIds: [null, null], classeIds: [], salle: '' };
    app.etat.binomes.push(b);
    app.ui.focus = 'champ:profBinome|' + b.id + '|0';
  },
  supprimerBinome: (el) => (app.etat.binomes = app.etat.binomes.filter((b) => b.id !== el.dataset.id)),
  supprimerTousBinomes() {
    const n = app.etat.binomes.length;
    if (!n || !confirmer('Supprimer les ' + n + ' binômes, y compris ceux conservés ?\nLes élèves perdront leur binôme et leur horaire.'))
      return;
    app.etat.binomes = [];
  },
  basculerConserve(el) {
    const b = trouverBinome(app.etat, el.dataset.id);
    b.fixe = !b.fixe;
    annoncer(
      b.fixe ? 'Binôme conservé lors des prochaines propositions.' : 'Ce binôme pourra être remplacé par la proposition automatique.',
    );
  },
  basculerClasseBinome(el) {
    const b = trouverBinome(app.etat, el.dataset.id);
    const c = el.dataset.param;
    if (b.classeIds.includes(c)) b.classeIds = b.classeIds.filter((x) => x !== c);
    else if (b.classeIds.length >= CLASSES_MAX_PAR_BINOME) toast('Un binôme glissant couvre au plus deux classes.');
    else b.classeIds.push(c);
  },

  // Générations
  proposerBinomes() {
    if (confirmerRegeneration('binomes')) appliquer(proposerBinomes(app.etat));
  },
  repartir() {
    if (confirmerRegeneration('repartition')) appliquer(repartirEleves(app.etat));
  },
  planifier: () => appliquer(planifierHoraires(app.etat)),
  toutGenerer() {
    if (confirmerRegeneration('binomes')) appliquer(genererTout(app.etat), true);
  },
  comparerPropositions() {
    const r = proposerVariantes(app.etat);
    if (r.erreur) {
      app.ui.message = r.erreur;
      return;
    }
    app.ui.message = null;
    app.ui.comparaison = { source: JSON.stringify(app.etat), variantes: r.variantes };
    app.ui.focus = 'action:choisirProposition|0|';
    annoncer(r.variantes.length + ' proposition(s) affichée(s) pour comparaison.');
  },
  choisirProposition(el) {
    const i = Number(el.dataset.id);
    const variante = app.ui.comparaison && app.ui.comparaison.variantes[i];
    if (!variante || !confirmerRegeneration('binomes')) return;
    appliquer(completerGeneration(variante), true);
    app.ui.message = { ...app.ui.message, txt: 'Proposition ' + LETTRES[i] + ' retenue. ' + app.ui.message.txt };
    app.ui.comparaison = null;
  },
  fermerComparaison: () => (app.ui.comparaison = null),
  effacerHoraires: () => app.etat.eleves.forEach((e) => !e.verrou && (e.slot = null)),

  // Déplacements et verrous
  basculerVerrou(el) {
    const e = trouverEleve(app.etat, el.dataset.id);
    e.verrou = !e.verrou;
  },
  selectionner(el) {
    const { ui } = app;
    const id = el.dataset.id;
    if (ui.selection && ui.selection !== id) {
      const zone = el.closest('[data-cible]');
      if (zone) {
        terminerDeplacement(ui.selection, zone.dataset.cible);
        return;
      }
    }
    ui.selection = ui.selection === id ? null : id;
    if (ui.selection)
      annoncer(nomEleve(trouverEleve(app.etat, id)) + ' sélectionné(e). Choisissez une destination, ou Échap pour annuler.');
  },
  placer(el) {
    if (app.ui.selection) terminerDeplacement(app.ui.selection, el.dataset.id);
  },
  annulerSelection() {
    const id = app.ui.selection;
    app.ui.selection = null;
    if (id) app.ui.focus = 'action:selectionner|' + id + '|';
    annoncer('Sélection annulée.');
  },

  // Import
  ouvrirImport: (el) => ouvrirDialogue(el.dataset.id),
  fermerImport: () => fermerDialogue(),
  analyserTexteColle() {
    const texte = $('#impTxt').value;
    if (!texte.trim()) {
      toast('Collez des données ou choisissez un fichier.');
      return;
    }
    chargerLignes(lireCSV(texte));
  },
  validerImport() {
    const imp = app.ui.import;
    const r = importerLignes(app.etat, imp);
    if (r.erreur) {
      toast(r.erreur);
      return;
    }
    app.etat = r.etat;
    const eleves = imp.type === 'eleves';
    app.ui.message = {
      ok: true,
      txt:
        r.ajoutes +
        (eleves ? ' élève(s) importé(s)' : ' professeur(s) importé(s)') +
        (r.doublons
          ? ' ; ' +
            r.doublons +
            (eleves
              ? ' doublon(s) ignoré(s) (même nom, prénom et classe).'
              : ' professeur(s) déjà présent(s) : leurs classes ont été complétées.')
          : '.'),
    };
    fermerDialogue();
    app.ui.focus = 'action:ouvrirImport|' + imp.type + '|';
    enregistrer();
  },

  // Exports
  exporterExcel() {
    if (!app.etat.binomes.length) {
      toast('Aucun planning à exporter.');
      return;
    }
    telecharger(nomFichier('planning-rencontres', app.niveau, 'xlsx'), classeurPlanning(app.etat), MIME_XLSX);
    toast(FICHIER_PERSONNEL);
  },
  exporterCSV() {
    telecharger(nomFichier('planning-rencontres', app.niveau, 'csv'), csvPlanning(app.etat), 'text/csv');
    toast(FICHIER_PERSONNEL);
  },
  imprimer() {
    const d = DOCUMENTS[app.ui.document];
    $('#print').innerHTML =
      '<style>@page{size:A4 ' + (d.paysage ? 'landscape' : 'portrait') + ';margin:12mm}</style>' + d.generer(app.etat);
    window.print();
  },
};

/** Actions qui ne modifient pas les données (pas d'enregistrement ni d'historique). */
export const SANS_ENREGISTREMENT = new Set([
  'ouvrirNiveau',
  'accueil',
  'choisirSauvegarde',
  'sauvegarderNiveau',
  'effacerNiveau',
  'effacerToutDefinitivement',
  'effacerDefinitivement',
  'comparerPropositions',
  'fermerComparaison',
  'onglet',
  'vuePlanning',
  'choisirDocument',
  'basculerCompact',
  'annuler',
  'sauvegarder',
  'selectionner',
  'placer',
  'annulerSelection',
  'ouvrirImport',
  'fermerImport',
  'analyserTexteColle',
  'validerImport',
  'exporterExcel',
  'exporterCSV',
  'imprimer',
]);

/** Actions qui ne touchent qu'au dialogue d'import (pas de nouveau rendu de la page). */
export const DIALOGUE_SEUL = new Set(['ouvrirImport', 'fermerImport', 'analyserTexteColle']);

export const champs = {
  soiree(el) {
    const p = el.dataset.param;
    app.etat.soiree[p] = p === 'duree' ? Math.max(1, Number(el.value) || 15) : el.value;
  },
  pause(el) {
    const p = el.dataset.param;
    app.etat.soiree.pauses[Number(el.dataset.id)][p] = p === 'duree' ? Number(el.value) || 0 : el.value;
  },
  classe(el) {
    if (el.value.trim()) trouverClasse(app.etat, el.dataset.id).nom = el.value.trim();
  },
  eleve: (el) => (trouverEleve(app.etat, el.dataset.id)[el.dataset.param] = el.value.trim()),
  prof: (el) => (trouverProf(app.etat, el.dataset.id)[el.dataset.param] = el.value.trim()),
  binome: (el) => (trouverBinome(app.etat, el.dataset.id)[el.dataset.param] = el.value.trim()),
  option: (el) => (app.etat.opt[el.dataset.param] = el.value),
  profBinome(el) {
    const { etat } = app;
    const b = trouverBinome(etat, el.dataset.id);
    b.profIds[Number(el.dataset.param)] = el.value || null;
    b.fixe = true; // un binôme composé à la main est conservé
    const profs = profsDuBinome(etat, b);
    if (profs.length === 2 && !b.classeIds.length) {
      const communes = profs[0].classeIds.filter((c) => profs[1].classeIds.includes(c));
      if (communes.length === 1) b.classeIds = communes;
    }
  },
  filtre: (el) => (app.ui[el.dataset.param] = el.value),
  ouvrirFichier(el, apres) {
    const fichier = el.files[0];
    if (!fichier) return;
    const lecteur = new FileReader();
    lecteur.onload = () => {
      let etat;
      try {
        etat = valider(JSON.parse(lecteur.result));
      } catch (x) {
        const raison = x instanceof SyntaxError ? "ce n'est pas un fichier de sauvegarde lisible" : x.message;
        app.ui.message = { ok: false, txt: 'Fichier refusé : ' + raison + '. Les données actuelles sont conservées.' };
      }
      if (etat) ouvrirSauvegarde(etat);
      apres();
    };
    lecteur.readAsText(fichier);
    el.value = '';
  },
  fichierImport: (el) => el.files[0] && lireFichierImport(el.files[0]),
  colonneImport: (el) => (app.ui.import.colonnes[el.dataset.param] = Number(el.value)),
  optionImport(el) {
    app.ui.import[el.dataset.param] = el.checked;
    afficherDialogue();
  },
};

/** Champs qui ne modifient pas les données ou gèrent eux-mêmes l'enregistrement et le rendu. */
export const CHAMPS_SANS_ENREGISTREMENT = new Set(['filtre', 'ouvrirFichier', 'fichierImport', 'colonneImport', 'optionImport']);
export const CHAMPS_SANS_RENDU = new Set(['ouvrirFichier', 'fichierImport', 'colonneImport', 'optionImport']);
