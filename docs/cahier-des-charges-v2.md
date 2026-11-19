# Cahier des charges — Version 2 : rencontres parents-professeurs de la 6e à la 3e

Version de travail du 19 novembre 2026, à valider avant développement.

Ce document complète le [cahier des charges de la version 1](cahier-des-charges.md). Tout ce qui n'est pas modifié ici reste valable : binômes glissants, équilibrage des charges, fratries, verrous, comparaison de propositions, documents, exports, accessibilité, protection des données.

## 1. Objectifs de la version 2

1. Étendre l'outil aux niveaux 5e, 4e et 3e, en plus de la 6e.
2. Tenir compte des enseignements qui ne concernent qu'une partie d'une classe : langue vivante B (espagnol, allemand) et options.
3. Prendre en compte les spécificités de chaque niveau : durée des rendez-vous, présence du professeur principal, options proposées.
4. Ajouter un écran d'accueil pour choisir le niveau.
5. Refondre le design graphique selon Material 3.

## 2. Décisions de cadrage (19 novembre 2026)

| Sujet                            | Décision                                                                                                                                                                                              |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Règle pour la LVB et les options | **Équipe propre à l'élève** : les deux enseignants qui reçoivent une famille doivent avoir l'élève en cours, groupes de LVB et d'options compris. C'est la règle de la 6e, appliquée élève par élève. |
| Organisation des niveaux         | **Préparations indépendantes** : chaque niveau a ses propres données (soirée, classes, élèves, enseignants, binômes, planning). Aucun lien n'est fait entre niveaux.                                  |
| Spécificités de niveau           | Durée de rendez-vous propre à chaque niveau ; professeur principal obligatoire, activable par niveau ; liste d'options propre à chaque niveau ; règles de la 6e conservées pour tous les niveaux.     |
| Design                           | Style Material 3 recréé en CSS, sans dépendance externe : le fichier unique reste léger et fonctionne hors ligne.                                                                                     |

## 3. Écran d'accueil

- **V2-A1.** À l'ouverture, une page d'accueil présente une carte par niveau : 6e, 5e, 4e, 3e.
- **V2-A2.** Chaque carte résume l'avancement du niveau :
  - date de la soirée ;
  - nombre d'élèves et d'enseignants ;
  - binômes formés, élèves planifiés ;
  - points à corriger ;
  - état de la sauvegarde.
- **V2-A3.** Un clic ouvre la préparation du niveau. Le niveau courant reste affiché en permanence dans la barre supérieure, avec un retour à l'accueil.
- **V2-A4.** Depuis l'accueil, pour chaque niveau :
  - ouvrir une sauvegarde ;
  - sauvegarder ;
  - effacer définitivement ses données.
- **V2-A5 (proposition).** « Reprendre les enseignants d'un autre niveau » : copier les noms et disciplines des enseignants saisis dans un autre niveau, sans leurs classes, pour éviter de les ressaisir. Les données restent ensuite indépendantes.

## 4. Données

### 4.1 Paramètres propres à chaque niveau

| Paramètre                        | Contenu                                                                                                                          |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Soirée                           | Date, début, fin, pauses, **durée d'un rendez-vous** (par défaut : 15 min).                                                      |
| Langues vivantes B               | Liste des LVB du niveau (par défaut : espagnol, allemand ; vide en 6e).                                                          |
| Options                          | Liste des options du niveau, modifiable (exemples : latin, section européenne, bilangue, chorale).                               |
| Professeur principal obligatoire | Oui ou non (par défaut : non). Si oui, chaque famille est reçue par un binôme qui comprend le professeur principal de la classe. |

### 4.2 Élève

Ajouts à la v1 :

- **LVB** : l'une des LVB du niveau, ou aucune.
- **Options** : zéro, une ou plusieurs options du niveau.

### 4.3 Enseignant et enseignements

Un enseignant n'a plus seulement une liste de classes : il a des **enseignements**. Chacun associe une classe à un type :

| Type d'enseignement | Élèves concernés dans la classe | Exemple                                    |
| ------------------- | ------------------------------- | ------------------------------------------ |
| Classe entière      | Tous                            | Mathématiques en 5A                        |
| LVB                 | Ceux qui suivent cette LVB      | Espagnol en 5A et 5B (groupe interclasses) |
| Option              | Ceux qui suivent cette option   | Latin en 5A, 5C et 5D                      |

S'y ajoute le **professeur principal**, désigné pour chaque classe.

### 4.4 Équipe d'un élève

L'équipe d'un élève regroupe trois ensembles d'enseignants :

- ceux qui enseignent à toute sa classe ;
- celui de sa LVB, dans sa classe ;
- ceux de ses options, dans sa classe.

Toutes les règles de constitution des binômes s'appuient sur cette équipe.

## 5. Règles de gestion

Les règles R1 à R9 de la v1 restent valables, sauf R2 qui est remplacée par V2-R2.

| N°     | Règle                                                                                                                                                                                        |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| V2-R2  | Les deux enseignants d'un binôme appartiennent à l'équipe de chaque élève qu'ils reçoivent.                                                                                                  |
| V2-R10 | Conséquence de V2-R2 : un binôme qui comprend un enseignant de LVB ou d'option ne reçoit que des élèves de cette LVB ou de cette option. Il peut être glissant entre deux classes du groupe. |
| V2-R11 | Si le professeur principal est obligatoire dans le niveau, chaque élève est reçu par un binôme qui comprend le professeur principal de sa classe (voir le point à trancher 9.1).             |
| V2-R12 | La durée des rendez-vous est celle du niveau.                                                                                                                                                |
| V2-R13 | Un élève ne peut suivre que des LVB et des options définies pour son niveau.                                                                                                                 |

## 6. Exigences fonctionnelles

### 6.1 Saisie

- **V2-F1.** Paramètres du niveau (section 4.1), dans l'onglet Soirée.
- **V2-F2.** Liste des élèves : colonnes LVB et options, avec un choix limité aux valeurs du niveau.
- **V2-F3.** Import des élèves : colonnes LVB et options en plus. Plusieurs options peuvent figurer dans une même cellule (« Latin, Euro »). Une valeur inconnue est signalée avant l'import, avec la proposition de l'ajouter à la liste du niveau.
- **V2-F4.** Enseignants : pour chaque classe cochée, le type d'enseignement (classe entière, une LVB ou une option). Désignation du professeur principal de chaque classe.
- **V2-F5.** Import des enseignants : colonne « enseignement » facultative. Par défaut, classe entière ; si la discipline correspond à une LVB ou à une option du niveau, ce type est proposé.

### 6.2 Binômes, répartition, planning

- **V2-F6.** Proposition automatique, répartition et comparaison de propositions respectent V2-R2, V2-R10 et V2-R11.
- **V2-F7.** Le tableau de couverture de l'onglet Binômes détaille, par classe, les groupes de LVB et d'options : élèves, binômes possibles, élèves sans place.
- **V2-F8.** Le glisser-déposer signale, sans l'interdire, un élève placé chez un binôme qui n'est pas dans son équipe (comme en v1).

### 6.3 Nouveaux contrôles

- Élève dont l'équipe compte moins de deux enseignants : aucun binôme possible.
- LVB ou option suivie par des élèves d'une classe, mais sans enseignant déclaré pour cette classe.
- Classe sans professeur principal, si le niveau l'exige.
- Capacité insuffisante pour qu'un professeur principal reçoive toutes les familles de sa classe (voir 9.1).

### 6.4 Documents

- **V2-F9.** Tous les documents indiquent le niveau.
- **V2-F10.** Le planning par classe peut afficher la LVB et les options de chaque élève.

### 6.5 Reprise des données de la v1

- **V2-F11.** Les données de la v1, enregistrées dans le navigateur ou dans un fichier, sont reprises automatiquement comme préparation du niveau 6e : tous les enseignements deviennent « classe entière », sans LVB ni option. Aucune ressaisie n'est nécessaire.

## 7. Design Material 3

Le style est recréé en CSS à partir des principes Material 3, sans bibliothèque externe.

| Élément     | Mise en œuvre                                                                                                                                                      |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Couleurs    | Rôles de couleur M3 (primary, secondary, tertiary, surface et ses niveaux, error, outline…), générés à partir d'une couleur source, en thèmes clair et sombre.     |
| Typographie | Échelle M3 : display, headline, title, body, label. Police système, pour rester hors ligne et léger.                                                               |
| Formes      | Échelle de coins arrondis M3 : petit 8 px, moyen 12 px, grand 16 px, extra-large 28 px.                                                                            |
| Élévation   | Niveaux 0 à 3 par teinte de surface et ombre légère.                                                                                                               |
| États       | Couches d'état au survol, au focus et à l'appui ; focus clavier toujours visible.                                                                                  |
| Composants  | Barre d'application supérieure, onglets principaux, cartes, boutons (rempli, tonal, contour, texte), puces filtres, boutons segmentés, dialogues, snackbar, menus. |
| Accueil     | Grille de cartes de niveau.                                                                                                                                        |
| Documents   | Les documents imprimés restent en noir et blanc, sans style M3.                                                                                                    |

Exigences maintenues :

- WCAG 2.1 AA, vérifié automatiquement en thème clair et sombre ;
- utilisation complète au clavier ;
- affichage sur téléphone sans défilement horizontal.

## 8. Lots de livraison proposés

Chaque lot est testé (unitaires et bout en bout) et livré sur `main` avant le suivant.

| Lot | Contenu                                                                             |
| --- | ----------------------------------------------------------------------------------- |
| 1   | Design Material 3 sur l'existant, sans changement fonctionnel                       |
| 2   | Données par niveau, écran d'accueil, reprise automatique des données de la v1       |
| 3   | LVB, options, enseignements et équipe de l'élève ; algorithmes et contrôles adaptés |
| 4   | Professeur principal obligatoire, durée par niveau, documents ; étiquette `v2.0.0`  |

Commencer par le design permet de valider l'aspect visuel tôt, avant de construire les nouveaux écrans.

## 9. Points à trancher

### 9.1 Professeur principal obligatoire et capacité (bloquant pour le lot 4)

En v1, un enseignant appartient à un seul binôme pour toute la soirée (H1). Avec cette règle, un professeur principal ne peut recevoir qu'autant de familles qu'il y a de créneaux.

Exemple : une soirée de 17 h à 20 h avec des rendez-vous de 20 minutes compte 9 créneaux, alors que la classe a 28 élèves. La règle V2-R11 est alors impossible à respecter.

| Option                                                            | Effet                                                                                                                                                                                                                 |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. Le professeur principal change de partenaire pendant la soirée | Il reste dans sa salle et reçoit successivement avec plusieurs collègues de l'équipe, ce qui assortit mieux les binômes aux élèves. Mais il ne reçoit toujours qu'une famille par créneau : 9 au plus dans l'exemple. |
| B. Professeur principal obligatoire pour une partie des familles  | Familles prioritaires désignées (orientation, demande de la famille, alerte de l'équipe) ; les autres sont reçues selon les règles habituelles.                                                                       |
| C. Contrôle seulement                                             | L'application vérifie que la capacité suffit et refuse sinon : à l'organisateur d'adapter les horaires ou de prévoir plusieurs soirées.                                                                               |

**Recommandation : A combinée à B.** Recevoir toutes les familles d'une classe de 28 avec le professeur principal demanderait 28 créneaux, soit 7 heures en rendez-vous de 15 minutes. Ce n'est réaliste qu'en limitant l'obligation aux familles prioritaires.

Dans tous les cas, l'application affiche le nombre de créneaux nécessaires par professeur principal avant toute génération.

### 9.2 Autres questions

1. **LVB en 6e** : y a-t-il une classe bilangue (deux langues dès la 6e) ? Si oui, elle se gère comme une option de 6e.
2. **Options par niveau** : quelle liste exacte pour 5e, 4e et 3e dans votre collège ?
3. **Couleur source du thème Material 3** : couleur de l'établissement, ou bleu par défaut ?
4. **Groupes de LVB interclasses** : confirmer qu'un même groupe d'espagnol peut réunir des élèves de plusieurs classes. Le binôme de l'enseignant est alors glissant, dans la limite de deux classes (H2).
5. **Reprise des enseignants d'un niveau à l'autre** (V2-A5) : à garder ?

## 10. Critères de réussite

- Préparer un niveau de 4 classes avec LVB et options en moins de 30 minutes à partir des fichiers d'import.
- Aucun élève reçu par un enseignant qui ne l'a pas en cours, sauf placement manuel signalé.
- Les données de la v1 s'ouvrent dans la v2 sans perte.
- Aucune violation WCAG 2.1 AA ; tous les tests de la v1 restent verts.
