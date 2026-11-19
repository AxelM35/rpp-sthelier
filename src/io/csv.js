// Lecture et écriture de texte tabulé (CSV, copier-coller depuis un tableur).

/**
 * Découpe un texte CSV en lignes de cellules. Le séparateur (tabulation, point-virgule ou virgule)
 * est deviné sur la première ligne. Gère les guillemets, le BOM et les fins de ligne Windows.
 * Les lignes entièrement vides sont ignorées.
 */
export function lireCSV(texte) {
  const t = texte.replace(/^﻿/, '');
  const premiere = t.split(/\r?\n/)[0] || '';
  const sep = ['\t', ';', ','].map((c) => [c, premiere.split(c).length]).sort((a, b) => b[1] - a[1])[0][0];
  const lignes = [];
  let ligne = [];
  let cellule = '';
  let entreGuillemets = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (entreGuillemets) {
      if (c === '"') {
        if (t[i + 1] === '"') {
          cellule += '"';
          i++;
        } else entreGuillemets = false;
      } else cellule += c;
    } else if (c === '"') entreGuillemets = true;
    else if (c === sep) {
      ligne.push(cellule);
      cellule = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++;
      ligne.push(cellule);
      lignes.push(ligne);
      ligne = [];
      cellule = '';
    } else cellule += c;
  }
  ligne.push(cellule);
  lignes.push(ligne);
  return lignes.map((l) => l.map((x) => String(x).trim())).filter((l) => l.some((x) => x));
}

/**
 * Cellule CSV entre guillemets. Une valeur commençant par = + - @ est préfixée d'une apostrophe
 * pour qu'un tableur ne l'interprète pas comme une formule (injection de formules).
 */
export function celluleCSV(valeur) {
  let t = String(valeur == null ? '' : valeur);
  if (/^[=+\-@\t\r]/.test(t)) t = "'" + t;
  return '"' + t.replace(/"/g, '""') + '"';
}

/** Tableau de lignes → texte CSV (point-virgule, BOM UTF-8 pour Excel). */
export function ecrireCSV(lignes) {
  return '﻿' + lignes.map((l) => l.map(celluleCSV).join(';')).join('\r\n');
}
