// Écran de confirmation d'un import Pronote (enseignants ou élèves), affiché dans le dialogue d'import.
// L'analyse est refaite à chaque choix de l'organisateur (catégorie d'une matière inconnue, partage, ajout,
// élèves ULIS) ; l'import lui-même se fait par l'action validerImport.

import { analyserEleves, analyserProfs, importerEleves, importerProfs } from '../io/pronote.js';
import { echapper } from '../utils/texte.js';
import { app } from './app.js';

/** Choix de l'organisateur, conservés tant que le dialogue est ouvert. */
export const choixVides = () => ({ classement: {}, partages: {}, ajouts: {}, ulis: {} });

/** Analyse le fichier chargé selon les choix actuels et la range dans app.ui.import.analyse. */
export function analyser(imp) {
  const { etat, niveau } = app;
  imp.analyse =
    imp.type === 'profs' ? analyserProfs(imp.lignes, etat, niveau, imp.pronote) : analyserEleves(imp.lignes, etat, niveau, imp.pronote);
  return imp.analyse;
}

/** Applique un choix fait dans l'écran de confirmation (champ « choixPronote »). */
export function choisir(imp, el) {
  const [quoi, i] = el.dataset.param.split('|');
  const a = imp.analyse;
  const c = imp.pronote;
  if (quoi === 'classement') c.classement[a.inconnues[i].matiere] = el.value;
  if (quoi === 'partage') c.partages[a.partages[i].cle] = el.checked;
  if (quoi === 'ajout') c.ajouts[a.inconnues[i].valeur] = el.checked;
  if (quoi === 'ulis') c.ulis[a.ulis[i].cle] = el.checked;
}

/** Importe selon l'analyse ; renvoie { etat, message }. */
export function importer(imp) {
  const a = imp.analyse;
  if (imp.type === 'profs') {
    const r = importerProfs(app.etat, a, { remplacer: imp.remplacer });
    return {
      etat: r.etat,
      message:
        r.ajoutes +
        ' professeur(s) importé(s) depuis Pronote' +
        (r.completes ? ', ' + r.completes + ' déjà présent(s) mis à jour' : '') +
        ' (classes ' +
        a.classes.join(', ') +
        '). Importez maintenant les élèves.',
    };
  }
  const r = importerEleves(app.etat, a, { remplacer: imp.remplacer });
  return {
    etat: r.etat,
    message:
      r.ajoutes +
      ' élève(s) importé(s) depuis Pronote' +
      (r.doublons ? ' ; ' + r.doublons + ' doublon(s) ignoré(s) (même nom, prénom et classe)' : '') +
      '.',
  };
}

const section = (titre, contenu) => (contenu ? '<h3 class="import-titre">' + titre + '</h3>' + contenu : '');
const liste = (elements) => '<ul class="liste">' + elements.map((x) => '<li>' + x + '</li>').join('') + '</ul>';
const case_ = (param, coche, texte) =>
  '<label class="case"><input type="checkbox" data-champ="choixPronote" data-param="' +
  param +
  '"' +
  (coche ? ' checked' : '') +
  '> <span>' +
  texte +
  '</span></label>';

function vueProfs(a) {
  const { etat, niveau } = app;
  const libelle = (e) => echapper(e.classe) + (e.type === 'classe' ? '' : ' · ' + (e.type === 'sauf' ? 'sauf ' : '') + echapper(e.refNom));
  const categories = [
    ['classe', 'Toute la classe'],
    ['lvb', 'LVB'],
    ['option', 'Option'],
    ['ignoree', 'Ignorée'],
  ];
  return (
    '<p>Export Pronote des équipes pédagogiques reconnu. Classes de la ' +
    niveau +
    ' : <b>' +
    (echapper(a.classes.join(', ')) || 'aucune') +
    '</b>' +
    (a.autresClasses ? ' (' + a.autresClasses + ' classe(s) d’autres niveaux ignorée(s))' : '') +
    '.</p>' +
    (a.classes.length ? '' : '<div class="msg bad">Ce fichier ne contient aucune classe de la ' + niveau + '.</div>') +
    section(
      'Enseignants (' + a.profs.length + ')',
      a.profs.length
        ? '<details><summary>Voir les enseignements</summary><div class="scroll"><table class="t"><tr><th scope="col">Enseignant</th><th scope="col">Classes</th></tr>' +
            a.profs
              .map((p) => '<tr><td>' + echapper(p.nom) + '</td><td>' + p.enseignements.map(libelle).join(', ') + '</td></tr>')
              .join('') +
            '</table></div></details>'
        : '',
    ) +
    section(
      'Professeurs principaux',
      a.pp.length ? '<p>' + a.pp.map((x) => echapper(x.classe + ' : ' + x.nom)).join(' ; ') + '.</p>' : '',
    ) +
    section(
      'Ajouté aux langues et options du niveau',
      a.nouvellesLvb.length || a.nouvellesOptions.length
        ? liste(a.nouvellesLvb.map((x) => 'LVB : ' + echapper(x.nom)).concat(a.nouvellesOptions.map((x) => 'Option : ' + echapper(x.nom))))
        : '',
    ) +
    section(
      'Matières inconnues',
      a.inconnues.length
        ? '<p class="note">Indiquez ce que chacune représente.</p><div class="scroll"><table class="t">' +
            '<tr><th scope="col">Matière</th><th scope="col">Lignes</th><th scope="col">Élèves concernés</th></tr>' +
            a.inconnues
              .map(
                (x, i) =>
                  '<tr><td>' +
                  echapper(x.matiere) +
                  '</td><td>' +
                  x.occurrences +
                  '</td><td><select data-champ="choixPronote" data-param="classement|' +
                  i +
                  '" aria-label="' +
                  echapper('Matière ' + x.matiere) +
                  '">' +
                  categories
                    .map(([v, t]) => '<option value="' + v + '"' + (v === x.categorie ? ' selected' : '') + '>' + t + '</option>')
                    .join('') +
                  '</select></td></tr>',
              )
              .join('') +
            '</table></div>'
        : '',
    ) +
    section(
      'Disciplines partagées',
      a.partages.length
        ? a.partages
            .map((x, i) =>
              case_(
                'partage|' + i,
                x.accepte,
                echapper(x.classe) +
                  ', ' +
                  echapper(x.discipline.toLowerCase()) +
                  ' : <b>' +
                  echapper(x.petit.nom) +
                  '</b> (' +
                  x.petit.effectif +
                  ' élèves) reçoit les élèves de l’option « ' +
                  echapper(x.option) +
                  ' », ' +
                  x.grands.map((g) => echapper(g.nom) + ' (' + g.effectif + ')').join(', ') +
                  ' les autres.',
              ),
            )
            .join('') +
            '<p class="note">Les élèves concernés sont désignés par l’export des élèves (option « ' +
            echapper(a.partages[0].valeur) +
            ' »).</p>'
        : '',
    ) +
    section(
      'Non importés',
      a.exclus.length || a.nonRattaches
        ? liste(
            a.exclus
              .map((n) => echapper(n) + ' : « Suivi Inclusion », écarté(e) des binômes')
              .concat(a.nonRattaches ? [a.nonRattaches + ' ligne(s) sans enseignement retenu (devoirs faits, options ignorées…)'] : []),
          )
        : '',
    ) +
    (etat.profs.length
      ? '<p><label class="case"><input type="checkbox" data-champ="optionImport" data-param="remplacer"' +
        (app.ui.import.remplacer ? ' checked' : '') +
        '> <span>Remplacer les ' +
        etat.profs.length +
        ' professeurs actuels (les binômes seront supprimés) ; sinon, ceux déjà présents sont mis à jour.</span></label></p>'
      : '')
  );
}

function vueEleves(a) {
  const { etat, niveau } = app;
  return (
    '<p>Export Pronote des élèves reconnu : <b>' +
    a.eleves.length +
    ' élèves</b> de la ' +
    niveau +
    (a.classes.length ? ' (' + echapper(a.classes.join(', ')) + ')' : '') +
    (a.autres ? ' ; ' + a.autres + ' élève(s) d’autres niveaux ignoré(s)' : '') +
    '.</p>' +
    (a.eleves.length ? '' : '<div class="msg bad">Ce fichier ne contient aucun élève de la ' + niveau + '.</div>') +
    (a.sansProfs
      ? '<div class="msg warn">Importez d’abord les enseignants : les LVB et options des élèves sont rapprochées des listes qu’ils remplissent.</div>'
      : '') +
    section(
      'Données personnelles',
      a.colonnesIgnorees.length
        ? '<p>Colonnes non lues, rien n’en est enregistré : ' +
            echapper(a.colonnesIgnorees.join(', ')) +
            '. Vous pouvez les retirer de l’export dans Pronote.</p>'
        : '',
    ) +
    section(
      'LVB et options retenues',
      a.comptes.length ? '<p>' + a.comptes.map((x) => echapper(x.nom) + ' : ' + x.n).join(' · ') + '</p>' : '',
    ) +
    section(
      'Valeurs inconnues',
      a.inconnues.length
        ? a.inconnues
            .map((x, i) =>
              case_(
                'ajout|' + i,
                x.ajouter,
                'Ajouter « ' +
                  echapper(x.nom) +
                  ' » aux ' +
                  (x.type === 'lvb' ? 'LVB' : 'options') +
                  ' du niveau (' +
                  x.eleves +
                  ' élève(s)) ; sinon, la valeur est ignorée.',
              ),
            )
            .join('')
        : '',
    ) +
    section(
      'Élèves ULIS et LVB',
      a.ulis.length
        ? a.ulis
            .map((x, i) =>
              case_(
                'ulis|' + i,
                x.sansUlis,
                echapper(x.classe) +
                  ' : ' +
                  echapper(x.prof) +
                  ' (' +
                  echapper(x.lvb) +
                  ') n’a pas en cours les ' +
                  x.ulis +
                  ' élève(s) ULIS. <small>Effectif Pronote : ' +
                  x.effectif +
                  ' ; ' +
                  x.eleves +
                  ' élèves de cette LVB dont ' +
                  x.ulis +
                  ' ULIS' +
                  (x.certain ? '' : ' — <b>à vérifier</b>') +
                  '.</small>',
              ),
            )
            .join('')
        : '',
    ) +
    section(
      'À vérifier',
      a.verifications.length
        ? liste(
            a.verifications.map(
              (x) =>
                echapper(
                  x.classe +
                    ' : ' +
                    x.prof +
                    ' a ' +
                    x.effectif +
                    ' élève(s) en ' +
                    x.option +
                    ' dans Pronote, ' +
                    x.eleves +
                    ' dans ce fichier',
                ) + ' (groupe commun à plusieurs classes ?).',
            ),
          )
        : '',
    ) +
    section(
      'Non retenues pour les binômes',
      a.ignorees.length ? '<p class="note">' + a.ignorees.map((x) => echapper(x.valeur) + ' (' + x.n + ')').join(', ') + '</p>' : '',
    ) +
    (etat.eleves.length
      ? '<p><label class="case"><input type="checkbox" data-champ="optionImport" data-param="remplacer"' +
        (app.ui.import.remplacer ? ' checked' : '') +
        '> <span>Remplacer les ' +
        etat.eleves.length +
        ' élèves actuels ; sinon, les élèves déjà présents (même nom, prénom et classe) sont ignorés.</span></label></p>'
      : '')
  );
}

/** Contenu du dialogue pour un export Pronote. */
export function vuePronote(imp) {
  const a = analyser(imp);
  const vide = imp.type === 'profs' ? !a.classes.length : !a.eleves.length;
  return (
    '<h2 id="dlgTitre">Importer ' +
    (imp.type === 'profs' ? 'les enseignants' : 'les élèves') +
    ' depuis Pronote</h2>' +
    '<div class="import-pronote">' +
    (imp.type === 'profs' ? vueProfs(a) : vueEleves(a)) +
    '</div><div class="row" style="margin-top:10px"><span class="sp"></span>' +
    '<button type="button" class="b" data-action="fermerImport">Annuler</button>' +
    '<button type="button" class="b p" data-action="validerImport"' +
    (vide ? ' disabled' : '') +
    '>Importer</button></div>'
  );
}
