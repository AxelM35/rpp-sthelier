// Onglet 6 : documents imprimables et exports.

import { aCorriger } from '../../algos/controles.js';
import { app } from '../app.js';
import { DOCUMENTS } from '../documents.js';

const NOMS_ONGLETS = { soiree: 'Soirée', donnees: 'Données', binomes: 'Binômes', repartition: 'Répartition', planning: 'Planning' };

export function vueDocuments(points) {
  const { etat, ui } = app;
  const problemes = aCorriger(points);
  const onglets = [...new Set(problemes.map((p) => NOMS_ONGLETS[p.onglet]).filter(Boolean))];
  const alerte = problemes.length
    ? '<div class="msg warn">' +
      problemes.length +
      ' point(s) restent à corriger avant diffusion (voir ' +
      (onglets.length > 1 ? 'les onglets ' : "l'onglet ") +
      onglets.join(', ') +
      ').</div>'
    : '';
  return (
    alerte +
    '<div class="card"><div class="row">' +
    Object.entries(DOCUMENTS)
      .map(
        ([cle, d]) =>
          '<button type="button" class="b' +
          (ui.document === cle ? ' p' : '') +
          '" data-action="choisirDocument" data-id="' +
          cle +
          '" aria-pressed="' +
          (ui.document === cle) +
          '">' +
          d.titre +
          '</button>',
      )
      .join('') +
    '<span class="sp"></span><button type="button" class="b" data-action="exporterCSV">Exporter en CSV</button>' +
    '<button type="button" class="b p" data-action="imprimer">Imprimer / PDF</button></div>' +
    '<p class="muted" style="margin-top:8px">Pour obtenir un PDF, choisissez « Enregistrer au format PDF » dans la fenêtre d\'impression.</p></div>' +
    '<div class="papier doc">' +
    DOCUMENTS[ui.document].generer(etat) +
    '</div>'
  );
}
