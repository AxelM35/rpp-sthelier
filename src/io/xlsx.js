// Classeurs Excel (.xlsx) : création de classeurs simples et lecture de la première feuille.

import { echapper } from '../utils/texte.js';
import { creerZip, ouvrirZip } from './zip.js';

const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const NS = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"';
const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const TYPE_PAQUET = 'http://schemas.openxmlformats.org/package/2006/relationships';
const TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml';

/** Type MIME d'un classeur .xlsx. */
export const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

// Styles : 0 normal, 1 en-tête (gras, fond gris, bordure), 2 cellule bordée.
const STYLES =
  '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
  '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' +
  '<fill><patternFill patternType="solid"><fgColor rgb="FFE3E7EE"/><bgColor indexed="64"/></patternFill></fill></fills>' +
  '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>' +
  '<border><left style="thin"><color auto="1"/></left><right style="thin"><color auto="1"/></right>' +
  '<top style="thin"><color auto="1"/></top><bottom style="thin"><color auto="1"/></bottom><diagonal/></border></borders>' +
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
  '<cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
  '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">' +
  '<alignment horizontal="center" vertical="center" wrapText="1"/></xf>' +
  '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf></cellXfs>' +
  '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>';

/** Texte sûr pour XML : échappé, sans caractères de contrôle interdits. */
const texteXml = (v) => echapper(v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

/** 0 → A, 25 → Z, 26 → AA. */
export function lettreColonne(i) {
  let s = '';
  for (i++; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s;
  return s;
}

/**
 * feuilles : [{ nom, lignes: [[valeur…]], largeurs: [nombre…] }] ; la première ligne est un en-tête figé.
 * Toutes les valeurs sont écrites comme du texte (jamais comme des formules). Renvoie un Uint8Array.
 */
export function creerClasseur(feuilles) {
  const fichiers = [
    [
      '[Content_Types].xml',
      XML +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="' +
        TYPE +
        '.sheet.main+xml"/>' +
        '<Override PartName="/xl/styles.xml" ContentType="' +
        TYPE +
        '.styles+xml"/>' +
        feuilles
          .map((_, i) => '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="' + TYPE + '.worksheet+xml"/>')
          .join('') +
        '</Types>',
    ],
    [
      '_rels/.rels',
      XML +
        '<Relationships xmlns="' +
        TYPE_PAQUET +
        '"><Relationship Id="rId1" Type="' +
        REL +
        '/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    ],
    [
      'xl/workbook.xml',
      XML +
        '<workbook ' +
        NS +
        ' xmlns:r="' +
        REL +
        '"><sheets>' +
        feuilles.map((f, i) => '<sheet name="' + texteXml(f.nom) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>').join('') +
        '</sheets></workbook>',
    ],
    [
      'xl/_rels/workbook.xml.rels',
      XML +
        '<Relationships xmlns="' +
        TYPE_PAQUET +
        '">' +
        feuilles
          .map(
            (_, i) => '<Relationship Id="rId' + (i + 1) + '" Type="' + REL + '/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>',
          )
          .join('') +
        '<Relationship Id="rId' +
        (feuilles.length + 1) +
        '" Type="' +
        REL +
        '/styles" Target="styles.xml"/></Relationships>',
    ],
    ['xl/styles.xml', XML + '<styleSheet ' + NS + '>' + STYLES + '</styleSheet>'],
  ];
  feuilles.forEach((f, i) => {
    const colonnes = f.largeurs
      .map((w, j) => '<col min="' + (j + 1) + '" max="' + (j + 1) + '" width="' + w + '" customWidth="1"/>')
      .join('');
    const lignes = f.lignes
      .map(
        (l, k) =>
          '<row r="' +
          (k + 1) +
          '">' +
          l
            .map(
              (v, j) =>
                '<c r="' +
                lettreColonne(j) +
                (k + 1) +
                '" t="inlineStr" s="' +
                (k ? 2 : 1) +
                '"><is><t xml:space="preserve">' +
                texteXml(v) +
                '</t></is></c>',
            )
            .join('') +
          '</row>',
      )
      .join('');
    fichiers.push([
      'xl/worksheets/sheet' + (i + 1) + '.xml',
      XML +
        '<worksheet ' +
        NS +
        '><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
        '<cols>' +
        colonnes +
        '</cols><sheetData>' +
        lignes +
        '</sheetData></worksheet>',
    ]);
  });
  return creerZip(fichiers);
}

/**
 * Lit la première feuille d'un classeur .xlsx et renvoie ses lignes non vides (tableaux de textes).
 * DOMParser est celui du navigateur ; il peut être fourni pour les tests.
 */
export async function lireClasseur(donnees, { DOMParser: Parseur = globalThis.DOMParser } = {}) {
  const zip = ouvrirZip(donnees);
  const xml = (t) => {
    const d = new Parseur().parseFromString(t, 'application/xml');
    if (d.getElementsByTagName('parsererror').length) throw new Error('XML invalide');
    return d;
  };
  const balises = (d, nom) => Array.from(d.getElementsByTagNameNS('*', nom));

  let chemin = 'xl/worksheets/sheet1.xml';
  const classeur = await zip.lire('xl/workbook.xml');
  const relations = await zip.lire('xl/_rels/workbook.xml.rels');
  if (classeur && relations) {
    const feuille = balises(xml(classeur), 'sheet')[0];
    const attr = feuille && Array.from(feuille.attributes).find((a) => a.localName === 'id');
    const rel = attr && balises(xml(relations), 'Relationship').find((r) => r.getAttribute('Id') === attr.value);
    if (rel) {
      const cible = rel.getAttribute('Target');
      chemin = cible.startsWith('/') ? cible.slice(1) : 'xl/' + cible.replace(/^\.\//, '');
    }
  }

  const partages = await zip.lire('xl/sharedStrings.xml');
  const textes = partages
    ? balises(xml(partages), 'si').map((si) =>
        balises(si, 't')
          .filter((t) => t.parentNode.localName !== 'rPh')
          .map((t) => t.textContent)
          .join(''),
      )
    : [];

  const contenu = await zip.lire(chemin);
  if (!contenu) throw new Error('feuille introuvable');
  const lignes = [];
  balises(xml(contenu), 'row').forEach((row) => {
    const l = [];
    balises(row, 'c').forEach((c, i) => {
      const ref = (c.getAttribute('r') || '').replace(/\d+/g, '');
      const col = ref ? ref.split('').reduce((a, ch) => a * 26 + ch.charCodeAt(0) - 64, 0) - 1 : i;
      if (col < 0 || col > 200) return;
      const type = c.getAttribute('t');
      const v = balises(c, 'v')[0];
      let valeur;
      if (type === 's') valeur = textes[Number(v && v.textContent)] || '';
      else if (type === 'inlineStr')
        valeur = balises(c, 't')
          .map((x) => x.textContent)
          .join('');
      else valeur = v ? v.textContent : '';
      l[col] = String(valeur).trim();
    });
    lignes.push(Array.from(l, (x) => x || ''));
  });
  return lignes.filter((l) => l.some((v) => v));
}
