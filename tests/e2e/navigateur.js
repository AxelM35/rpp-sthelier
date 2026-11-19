// Outils communs aux tests de bout en bout : ouvre l'application construite (dist/) dans Chromium.
//
// Prérequis : Playwright et Chromium (`npm install --no-save playwright && npx playwright install chromium`).

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

export const URL_APP = 'file://' + fileURLToPath(new URL('../../dist/rencontres-parents-profs.html', import.meta.url));
/** Clé du stockage du niveau 6e, et clé de la version 1. */
export const CLE = 'rpp-v2-6e';
export const CLE_V1 = 'rpp6-v1';
export const cleNiveau = (niveau) => 'rpp-v2-' + niveau;

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
 * Ouvre l'application sur la préparation d'un niveau (6e par défaut), ou sur l'accueil si niveau vaut null.
 * etat : données écrites dans le stockage du niveau etat.niveau, puis page rechargée.
 * stockage : clés et textes écrits tels quels avant le rechargement (données de la v1, données abîmées…).
 * Les boîtes de confirmation sont acceptées, sauf si page.refuserConfirmations vaut vrai ;
 * leurs textes sont mémorisés dans page.confirmations.
 */
export async function ouvrir({ etat = null, stockage = null, niveau = '6e', largeur = 1400, hauteur = 900, theme = 'light' } = {}) {
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
  await page.goto(URL_APP + (niveau ? '#' + niveau : ''));
  const ecrire = { ...stockage };
  if (etat) ecrire[cleNiveau(etat.niveau)] = JSON.stringify(etat);
  if (Object.keys(ecrire).length) {
    // Données écrites une seule fois, puis page rechargée : les rechargements suivants ne les réinjectent pas.
    await page.evaluate((cles) => Object.entries(cles).forEach(([cle, texte]) => localStorage.setItem(cle, texte)), ecrire);
    await page.reload();
  }
  return page;
}

/** Données enregistrées par l'application pour un niveau. */
export const lireEtat = (page, niveau = '6e') => page.evaluate((cle) => JSON.parse(localStorage.getItem(cle)), cleNiveau(niveau));

/** Clés présentes dans le stockage local, triées. */
export const cles = (page) => page.evaluate(() => Object.keys(localStorage).sort());

/** Clique sur un onglet. */
export const onglet = (page, id) => page.click('#tab-' + id);

/** Texte du message affiché en haut de l'onglet. */
export const message = (page) => page.textContent('#main > .msg');
