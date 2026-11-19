// Point d'entrée de l'application.

import { normaliser } from './modele/normaliser.js';
import { app } from './ui/app.js';
import { brancherEvenements } from './ui/evenements.js';
import { rendre } from './ui/rendu.js';
import { chargerEtat } from './ui/stockage.js';

chargerEtat();
normaliser(app.etat);
brancherEvenements();
rendre();
