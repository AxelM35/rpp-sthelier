# Rencontres parents-professeurs (6e à 3e)

Application pour préparer les soirées de rencontres parents-professeurs d'un collège, niveau par niveau (6e, 5e, 4e, 3e) : binômes de professeurs, répartition des élèves, planning des rendez-vous, convocations.

L'application livrée est **un seul fichier HTML** qui s'ouvre dans un navigateur, sans serveur ni connexion internet. Les données restent dans le navigateur du poste.

## Utiliser l'application

Ouvrir `dist/rencontres-parents-profs.html` (produit par `npm run build`) dans Chrome, Edge, Firefox ou Safari récents. L'écran d'accueil propose une carte par niveau ; chaque niveau est une préparation indépendante. Les données de la version 1, enregistrées dans le même navigateur, sont reprises automatiquement comme niveau 6e.

Pour que cette reprise fonctionne, ouvrir la version 2 dans le même navigateur que la version 1, en remplaçant le fichier de la version 1 au même emplacement : certains navigateurs (Firefox) séparent le stockage selon l'emplacement du fichier. À défaut, ouvrir depuis l'accueil la sauvegarde `.json` faite avec la version 1 : elle devient le niveau 6e.

## Développer

Prérequis : Node.js 20 ou plus récent.

```bash
npm install
```

| Commande            | Rôle                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------ |
| `npm run build`     | Construit `dist/rencontres-parents-profs.html`                                       |
| `npm test`          | Tests unitaires (algorithmes, données, imports, exports) — environ 2 s               |
| `npm run test:e2e`  | Construit puis teste l'application dans Chromium — environ 20 s                      |
| `npm run verifier`  | Mise en forme (Prettier), imports inutilisés, lignes trop longues                    |
| `npm run formater`  | Applique la mise en forme                                                            |
| `npm run theme`     | Régénère `src/theme.css` après un changement de couleur source (`scripts/theme.mjs`) |
| `npm run test:tout` | Les trois précédentes, à lancer avant de livrer une version                          |

Les tests de bout en bout utilisent Playwright, qui n'est pas installé par `npm install` :

```bash
npm install --no-save playwright
```

```bash
npx playwright install chromium
```

## Documentation

- [Cahier des charges de la version 1](docs/cahier-des-charges.md)
- [Cahier des charges de la version 2 (6e à 3e, en préparation)](docs/cahier-des-charges-v2.md)
- [Audit du code et suivi des corrections](docs/audit.md)
- [Fiche de traitement des données personnelles (RGPD)](docs/rgpd.md)

## Organisation du code

```
src/
  config.js            Constantes métier (niveaux, 2 classes max par binôme, écart visé, graine…)
  utils/               Texte, heures, générateur pseudo-aléatoire
  modele/
    etat.js            Format des données, validation des fichiers, migrations
    acces.js           Lecture de l'état : recherches, libellés
    normaliser.js      Remise en cohérence après une modification
    niveaux.js         Résumé d'un niveau pour l'accueil, noms de fichiers
  algos/               Cœur métier, sans navigateur : fonctions testables
    creneaux.js        Créneaux de la soirée, disponibilités
    quotas.js          Nombre d'élèves de chaque classe par binôme
    binomes.js         Proposition automatique des binômes
    repartition.js     Affectation des élèves
    horaires.js        Attribution des créneaux
    deplacement.js     Déplacements manuels
    controles.js       Points à corriger affichés dans l'interface
    generation.js      Enchaînement complet
  io/                  Imports et exports, sans navigateur
    csv.js, zip.js, xlsx.js, import.js, exports.js
    stockage.js        Clés du stockage par niveau, reprise des données de la v1 (stockage passé en paramètre)
  ui/                  Interface
    app.js             État courant partagé (niveau ouvert, données, affichage)
    navigation.js      Accueil ou niveau ouvert, niveau inscrit dans l'adresse (#5e)
    stockage.js        Stockage local du niveau ouvert, annulation par niveau, suivi des sauvegardes
    rendu.js           Affichage de l'onglet courant, gestion du focus
    actions.js         Réactions aux clics et aux saisies
    evenements.js      Branchement des événements (clic, clavier, glisser-déposer)
    vues/              Un module par onglet, et l'écran d'accueil (accueil.js)
    composants.js      Fragments HTML communs
    documents.js       Documents imprimables
    dialogueImport.js  Dialogue d'import
  main.js              Point d'entrée
  index.html           Gabarit de la page
  styles.css           Feuille de style Material 3 (typographie, formes, composants)
  theme.css            Jetons de couleur Material 3 générés (npm run theme), thèmes clair et sombre
scripts/build.mjs      Assemblage en un fichier unique (esbuild)
scripts/verifier.mjs   Imports inutilisés, lignes trop longues
scripts/theme.mjs      Génération des jetons de couleur à partir de la couleur source
docs/                  Cahier des charges, audit, fiche RGPD
tests/
  unit/                Tests des modules algos, modele, io, utils
  e2e/                 Tests de l'application construite dans un navigateur
  fixtures/            Collège fictif (108 élèves, 20 professeurs), fichiers Excel
```

### Principes

- **Les algorithmes ne modifient pas l'état reçu.** Ils renvoient `{ etat, rapport }`, où `etat` est un nouvel état et `rapport` vaut `{ ok, txt }`. L'interface remplace l'état courant par le résultat.
- **Les modules `algos/`, `modele/` et `io/` n'utilisent pas le navigateur.** Ils sont testés directement avec Node.
- **La proposition de binômes est reproductible.** Le hasard vient d'un générateur à graine fixe (`GRAINE_PROPOSITION`) : la même situation donne toujours la même proposition.
- **Chaque niveau est enregistré à part.** Une clé du stockage local par niveau (`rpp-v2-6e`, `rpp-v2-5e`…), avec `-meta` (dates) et `-secours` (données illisibles mises de côté). `app.niveau` vaut `null` sur l'accueil.
- **Toute donnée externe passe par `valider()`.** C'est le cas des fichiers ouverts comme du stockage local. Les identifiants sont strictement contrôlés car ils sont insérés dans le HTML.
- **L'interface est reconstruite à chaque changement.** Les attributs `data-action`, `data-champ`, `data-id`, `data-param` et `data-cible` relient le HTML aux fonctions de `ui/actions.js` (voir l'en-tête de `ui/composants.js`).

### Ajouter une fonctionnalité

| Besoin                                             | Où intervenir                                                                            |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Nouveau contrôle (avertissement)                   | `algos/controles.js`, puis un test dans `tests/unit/deplacement-controles.test.js`       |
| Nouveau document imprimable                        | Une fonction dans `ui/documents.js`, ajoutée à `DOCUMENTS`                               |
| Nouveau bouton                                     | Une entrée dans `actions` (`ui/actions.js`) et `data-action="…"` dans la vue             |
| Nouveau champ d'un élève ou d'un professeur        | `modele/etat.js` (`valider`), la vue `ui/vues/donnees.js`, éventuellement `io/import.js` |
| Changer une règle (classes par binôme, écart visé) | `config.js`                                                                              |

### Faire évoluer le format des données

1. Incrémenter `VERSION_DONNEES` dans `config.js`.
2. Ajouter dans `MIGRATIONS` (`modele/etat.js`) la fonction qui convertit l'ancienne version.
3. Mettre à jour `valider()` et ajouter un test de migration.

Les anciennes sauvegardes restent ainsi lisibles.
