// Petites fonctions de texte et d'heures, sans dépendance.

const ENTITES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Échappe un texte pour l'insérer dans du HTML (contenu ou attribut). */
export function echapper(valeur) {
  return String(valeur == null ? '' : valeur).replace(/[&<>"']/g, (c) => ENTITES[c]);
}

/** Comparaison alphabétique française, insensible à la casse et aux accents, « 6B » < « 6C » < « 6D ». */
export function comparer(a, b) {
  return String(a).localeCompare(String(b), 'fr', { sensitivity: 'base', numeric: true });
}

/** « 17:45 » → 1065 minutes ; null si le format est invalide. */
export function versMinutes(heure) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(heure || '');
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/** 1065 → « 17h45 ». */
export function formaterHeure(minutes) {
  return Math.floor(minutes / 60) + 'h' + String(minutes % 60).padStart(2, '0');
}

/** Identifiant court aléatoire, compatible avec la validation des sauvegardes. */
export function nouvelId() {
  return Math.random().toString(36).slice(2, 10).padEnd(8, '0');
}
