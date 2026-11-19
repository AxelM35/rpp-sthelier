// Dialogue d'import des élèves et des professeurs (fichier CSV/Excel ou texte collé).

import { lireCSV } from '../io/csv.js';
import { CHAMPS, detecterColonnes } from '../io/import.js';
import { lireClasseur } from '../io/xlsx.js';
import { echapper } from '../utils/texte.js';
import { app } from './app.js';
import { $, toast } from './dom.js';

/** Ouvre le dialogue pour importer des « eleves » ou des « profs ». */
export function ouvrirDialogue(type) {
  app.ui.import = { type, lignes: null, colonnes: {}, entete: false, remplacer: false };
  afficherDialogue();
}

export function fermerDialogue() {
  app.ui.import = null;
  afficherDialogue();
}

/** Lignes lues : on devine les colonnes, puis on affiche l'aperçu. */
export function chargerLignes(lignes) {
  const imp = app.ui.import;
  const { entete, colonnes } = detecterColonnes(imp.type, lignes);
  Object.assign(imp, { lignes, entete, colonnes });
  afficherDialogue();
}

/** Lit un fichier choisi dans le dialogue. */
export function lireFichierImport(fichier) {
  if (/\.(xls|ods)$/i.test(fichier.name)) {
    toast('Format non pris en charge : enregistrez le fichier au format .xlsx ou .csv.');
    return;
  }
  const lecteur = new FileReader();
  lecteur.onload = () => {
    if (/\.xlsx$/i.test(fichier.name)) {
      lireClasseur(lecteur.result)
        .then((lignes) => {
          if (!lignes.length) throw new Error('vide');
          chargerLignes(lignes);
        })
        .catch(() => toast("Fichier Excel illisible ou vide. Essayez de l'enregistrer en .csv."));
      return;
    }
    let texte;
    try {
      texte = new TextDecoder('utf-8', { fatal: true }).decode(lecteur.result);
    } catch {
      texte = new TextDecoder('windows-1252').decode(lecteur.result); // anciens CSV Excel
    }
    chargerLignes(lireCSV(texte));
  };
  lecteur.readAsArrayBuffer(fichier);
}

export function afficherDialogue() {
  const imp = app.ui.import;
  const dialogue = $('#dlg');
  if (!imp) {
    if (dialogue.open) dialogue.close();
    return;
  }
  let h = '<h2 id="dlgTitre">Importer des ' + (imp.type === 'eleves' ? 'élèves' : 'professeurs') + '</h2>';
  if (!imp.lignes) {
    h +=
      '<p>Choisissez un fichier CSV ou Excel (.xlsx), ou collez un tableau copié depuis un tableur. Vous choisirez ensuite la colonne correspondant à chaque information.</p>' +
      (imp.type === 'profs'
        ? '<p class="muted">Les classes d\'un professeur peuvent figurer dans une seule cellule (6A, 6B) ou sur plusieurs lignes (une ligne par classe).</p>'
        : '') +
      '<p><input type="file" accept=".csv,.txt,.tsv,.xlsx" data-champ="fichierImport" aria-label="Fichier à importer"></p>' +
      '<textarea id="impTxt" placeholder="Nom;Prénom;Classe" aria-label="Données à coller"></textarea>' +
      '<div class="row" style="margin-top:10px"><span class="sp"></span><button type="button" class="b" data-action="fermerImport">Annuler</button>' +
      '<button type="button" class="b p" data-action="analyserTexteColle">Analyser le texte collé</button></div>';
  } else {
    const tete = imp.lignes[0];
    const donnees = imp.entete ? imp.lignes.slice(1) : imp.lignes;
    const options = (j) =>
      '<option value="-1">— ignorer —</option>' +
      tete
        .map(
          (x, i) =>
            '<option value="' +
            i +
            '"' +
            (i === j ? ' selected' : '') +
            '>' +
            (imp.entete ? echapper(x || 'Colonne ' + (i + 1)) : 'Colonne ' + (i + 1)) +
            '</option>',
        )
        .join('');
    const apercu = imp.lignes
      .slice(0, 6)
      .map((l, i) => {
        const balise = i === 0 && imp.entete ? 'th' : 'td';
        return '<tr>' + tete.map((_, j) => '<' + balise + '>' + echapper(l[j] || '') + '</' + balise + '>').join('') + '</tr>';
      })
      .join('');
    h +=
      '<div class="row">' +
      CHAMPS[imp.type]
        .map(
          ([cle, libelle]) =>
            '<label class="f">' +
            libelle +
            '<select data-champ="colonneImport" data-param="' +
            cle +
            '">' +
            options(imp.colonnes[cle]) +
            '</select></label>',
        )
        .join('') +
      '</div>' +
      '<p style="margin-top:10px"><label><input type="checkbox" data-champ="optionImport" data-param="entete"' +
      (imp.entete ? ' checked' : '') +
      '> La première ligne contient les titres de colonnes</label><br>' +
      '<label><input type="checkbox" data-champ="optionImport" data-param="remplacer"' +
      (imp.remplacer ? ' checked' : '') +
      '> Remplacer la liste actuelle</label></p>' +
      '<div class="scroll"><table class="t">' +
      apercu +
      '</table></div>' +
      '<div class="row" style="margin-top:10px"><span class="muted">' +
      donnees.length +
      ' ligne(s)</span><span class="sp"></span>' +
      '<button type="button" class="b" data-action="fermerImport">Annuler</button><button type="button" class="b p" data-action="validerImport">Importer</button></div>';
  }
  dialogue.innerHTML = h;
  if (!dialogue.open) dialogue.showModal();
}
