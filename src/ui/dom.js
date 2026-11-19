// Accès au navigateur : éléments de la page, notifications, téléchargements, confirmations.

export const $ = (selecteur, racine = document) => racine.querySelector(selecteur);

let minuterieToast = null;
/** Message bref en bas de l'écran (également lu par les lecteurs d'écran). */
export function toast(texte) {
  const e = $('#toast');
  e.textContent = texte;
  e.classList.add('on');
  clearTimeout(minuterieToast);
  minuterieToast = setTimeout(() => e.classList.remove('on'), 2600);
}

/** Annonce destinée aux lecteurs d'écran uniquement. */
export function annoncer(texte) {
  const zone = $('#annonce');
  zone.textContent = '';
  setTimeout(() => (zone.textContent = texte), 30);
}

/** Propose le téléchargement d'un fichier (texte ou octets). */
export function telecharger(nom, contenu, type) {
  const lien = document.createElement('a');
  lien.href = URL.createObjectURL(new Blob([contenu], { type }));
  lien.download = nom;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  setTimeout(() => URL.revokeObjectURL(lien.href), 2000);
}

/** Demande de confirmation avant une action destructrice. */
export const confirmer = (texte) => window.confirm(texte);
