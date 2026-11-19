// Point d'entrée de l'application.

import { app } from './ui/app.js';
import { brancherEvenements } from './ui/evenements.js';
import { allerAuNiveau, niveauDeLAdresse } from './ui/navigation.js';
import { rendre } from './ui/rendu.js';
import { reprendreDonneesV1 } from './ui/stockage.js';

// Messages affichés sur l'accueil après la reprise des données de la version 1 (voir io/stockage.js).
const REPRISE_V1 = {
  reprise: { ok: true, txt: 'Vos données de la version 1 ont été reprises dans le niveau 6e.' },
  illisible: {
    ok: false,
    txt: 'Les données de la version 1 enregistrées dans ce navigateur étaient illisibles : elles ont été mises de côté et le niveau 6e est vide.',
  },
  conflit: {
    ok: false,
    txt:
      'Des données de la version 1 ont été trouvées, mais le niveau 6e en contenait déjà : celles du 6e ont été gardées. ' +
      'Les anciennes ont été mises de côté ; « Effacer définitivement la 6e » les supprime.',
  },
};

const reprise = reprendreDonneesV1();
const niveau = niveauDeLAdresse();
if (niveau) allerAuNiveau(niveau);
if (reprise) app.ui.message = REPRISE_V1[reprise];
brancherEvenements();
rendre();
