// Outils communs aux tests de bout en bout : ouvre l'application construite (dist/) dans Chromium.
//
// Prérequis : Playwright et Chromium (`npm install --no-save playwright && npx playwright install chromium`).

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

export const URL_APP = 'file://' + fileURLToPath(new URL('../../dist/rencontres-parents-profs.html', import.meta.url));
export const CLE = 'rpp6-v1';

let navigateur = null;
export async function lancer() {
  navigateur = navigateur || (await chromium.launch());
  return navigateur;
}
export async function fermer() {
  if (navigateur) await navigateur.close();
  navigateur = null;
}

/**
 * Ouvre l'application. etat : données écrites dans le stockage, puis page rechargée.
 * Les boîtes de confirmation sont acceptées, sauf si page.refuserConfirmations vaut vrai ;
 * leurs textes sont mémorisés dans page.confirmations.
 */
export async function ouvrir({ etat = null, largeur = 1400, hauteur = 900, theme = 'light' } = {}) {
  const contexte = await (
    await lancer()
  ).newContext({ viewport: { width: largeur, height: hauteur }, colorScheme: theme, acceptDownloads: true });
  const page = await contexte.newPage();
  page.erreurs = [];
  page.confirmations = [];
  page.refuserConfirmations = false;
  page.on('pageerror', (e) => page.erreurs.push(e.message));
  page.on('dialog', (d) => {
    page.confirmations.push(d.message());
    return page.refuserConfirmations ? d.dismiss() : d.accept();
  });
  await page.goto(URL_APP);
  if (etat) {
    // Données écrites une seule fois, puis page rechargée : les rechargements suivants ne les réinjectent pas.
    await page.evaluate(([cle, json]) => localStorage.setItem(cle, json), [CLE, JSON.stringify(etat)]);
    await page.reload();
  }
  return page;
}

/** Données enregistrées par l'application. */
export const lireEtat = (page) => page.evaluate((cle) => JSON.parse(localStorage.getItem(cle)), CLE);

/** Clique sur un onglet. */
export const onglet = (page, id) => page.click('#tab-' + id);

/** Texte du message affiché en haut de l'onglet. */
export const message = (page) => page.textContent('#main > .msg');
