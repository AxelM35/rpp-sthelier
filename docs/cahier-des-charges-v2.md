# Cahier des charges — Version 2 : rencontres parents-professeurs de la 6e à la 3e

Version de travail du 19 novembre 2026, mise à jour avec les décisions du même jour (section 9).

Ce document complète le [cahier des charges de la version 1](cahier-des-charges.md). Tout ce qui n'est pas modifié ici reste valable : binômes glissants, équilibrage des charges, fratries, verrous, comparaison de propositions, documents, exports, accessibilité, protection des données.

## 1. Objectifs de la version 2

1. Étendre l'outil aux niveaux 5e, 4e et 3e, en plus de la 6e.
2. Tenir compte des enseignements qui ne concernent qu'une partie d'une classe : langue vivante B (espagnol, allemand) et options.
3. Prendre en compte les spécificités de chaque niveau : durée des rendez-vous, élèves prioritaires reçus par le professeur principal, options proposées.
4. Ajouter un écran d'accueil pour choisir le niveau.
5. Refondre le design graphique selon Material 3.

## 2. Décisions de cadrage (19 novembre 2026)

| Sujet                            | Décision                                                                                                                                                                                                   |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Règle pour la LVB et les options | **Équipe propre à l'élève** : les deux enseignants qui reçoivent une famille doivent avoir l'élève en cours, groupes de LVB et d'options compris. C'est la règle de la 6e, appliquée élève par élève.      |
| Organisation des niveaux         | **Préparations indépendantes** : chaque niveau a ses propres données (soirée, classes, élèves, enseignants, binômes, planning). Aucun lien n'est fait entre niveaux.                                       |
| Spécificités de niveau           | Durée de rendez-vous propre à chaque niveau ; jusqu'à 5 élèves prioritaires reçus par le professeur principal ; liste d'options propre à chaque niveau ; règles de la 6e conservées pour tous les niveaux. |
| Design                           | Style Material 3 recréé en CSS, sans dépendance externe : le fichier unique reste léger et fonctionne hors ligne. Couleur source : bleu.                                                                   |

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

## 4. Données

### 4.1 Paramètres propres à chaque niveau

| Paramètre          | Contenu                                                                                                                                |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Soirée             | Date, début, fin, pauses, **durée d'un rendez-vous** (par défaut : 15 min).                                                            |
| Langues vivantes B | Liste des LVB du niveau. Par défaut : espagnol et allemand en 5e, 4e et 3e ; aucune en 6e.                                             |
| Options            | Liste des options du niveau, modifiable. Par défaut : « Bilangue breton » en 6e ; aucune en 5e, 4e et 3e (listes à définir plus tard). |

### 4.2 Élève

Ajouts à la v1 :

- **LVB** : l'une des LVB du niveau, ou aucune.
- **Options** : zéro, une ou plusieurs options du niveau.
- **Prioritaire** : oui ou non. Un élève prioritaire est reçu par le professeur principal de sa classe (voir V2-R11).

### 4.3 Enseignant et enseignements

Un enseignant n'a plus seulement une liste de classes : il a des **enseignements**. Chacun associe une classe à un type :

| Type d'enseignement | Élèves concernés dans la classe | Exemple                                    |
| ------------------- | ------------------------------- | ------------------------------------------ |
| Classe entière      | Tous                            | Mathématiques en 5A                        |
| LVB                 | Ceux qui suivent cette LVB      | Espagnol en 5A et 5B (groupe interclasses) |
| Option              | Ceux qui suivent cette option   | Breton en 6A et 6B (bilangue)              |

S'y ajoute le **professeur principal**, désigné pour chaque classe.

### 4.4 Équipe d'un élève

L'équipe d'un élève regroupe trois ensembles d'enseignants :

- ceux qui enseignent à toute sa classe ;
- celui de sa LVB, dans sa classe ;
- ceux de ses options, dans sa classe.

S'y ajoutent deux précisions (décisions du 20 novembre 2026) :

- le **professeur principal** de la classe appartient à l'équipe de tous ses élèves, quelle que soit sa discipline ;
- un **élève ULIS** n'a pas l'enseignant de LVB dans son équipe, même si une LVB lui est attribuée : il ne suit pas la LVB avec sa classe.

Toutes les règles de constitution des binômes s'appuient sur cette équipe.

## 5. Règles de gestion

Les règles R1 à R9 de la v1 restent valables, sauf R2 qui est remplacée par V2-R2.

| N°     | Règle                                                                                                                                                                                                                                                                                                                                                                              |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| V2-R2  | Les deux enseignants d'un binôme appartiennent à l'équipe de chaque élève qu'ils reçoivent.                                                                                                                                                                                                                                                                                        |
| V2-R10 | Conséquence de V2-R2 : un binôme qui comprend un enseignant de LVB ou d'option ne reçoit que des élèves de cette LVB ou de cette option. Un groupe de LVB ou d'option peut réunir plusieurs classes ; le binôme de son enseignant est alors glissant, dans la limite de deux classes (H2). Les élèves des autres classes du groupe sont reçus par d'autres binômes de leur équipe. |
| V2-R11 | Chaque professeur principal reçoit au plus **5 élèves prioritaires**, désignés par l'organisateur parmi les élèves de sa classe. Un élève prioritaire est reçu par le binôme qui comprend le professeur principal de sa classe. Le professeur principal garde un seul binôme toute la soirée (H1) ; ce binôme reçoit aussi d'autres élèves de la classe.                           |
| V2-R12 | La durée des rendez-vous est celle du niveau.                                                                                                                                                                                                                                                                                                                                      |
| V2-R13 | Un élève ne peut suivre que des LVB et des options définies pour son niveau.                                                                                                                                                                                                                                                                                                       |

## 6. Exigences fonctionnelles

### 6.1 Saisie

- **V2-F1.** Paramètres du niveau (section 4.1), dans l'onglet Soirée.
- **V2-F2.** Liste des élèves : colonnes LVB et options, avec un choix limité aux valeurs du niveau.
- **V2-F3.** Import des élèves : colonnes LVB et options en plus. Plusieurs options peuvent figurer dans une même cellule (« Latin, Euro »). Une valeur inconnue est signalée avant l'import, avec la proposition de l'ajouter à la liste du niveau.
- **V2-F4.** Enseignants : pour chaque classe cochée, le type d'enseignement (classe entière, une LVB ou une option). Désignation du professeur principal de chaque classe.
- **V2-F4 bis.** Élèves prioritaires : case à cocher dans la liste des élèves. Au-delà de 5 élèves prioritaires pour un même professeur principal, la case est refusée avec un message.
- **V2-F5.** Import des enseignants : colonne « enseignement » facultative. Par défaut, classe entière ; si la discipline correspond à une LVB ou à une option du niveau, ce type est proposé.

### 6.2 Binômes, répartition, planning

- **V2-F6.** Proposition automatique, répartition et comparaison de propositions respectent V2-R2, V2-R10 et V2-R11. Les élèves prioritaires sont affectés en premier au binôme de leur professeur principal.
- **V2-F6 bis.** Les élèves prioritaires sont signalés dans la répartition, le planning et le planning par binôme.
- **V2-F7.** Le tableau de couverture de l'onglet Binômes détaille, par classe, les groupes de LVB et d'options : élèves, binômes possibles, élèves sans place.
- **V2-F8.** Le glisser-déposer signale, sans l'interdire, un élève placé chez un binôme qui n'est pas dans son équipe (comme en v1).

### 6.3 Nouveaux contrôles

- Élève dont l'équipe compte moins de deux enseignants : aucun binôme possible.
- LVB ou option suivie par des élèves d'une classe, mais sans enseignant déclaré pour cette classe.
- Élève prioritaire dans une classe sans professeur principal.
- Professeur principal sans binôme, ou absent sur une partie de la soirée au point de ne pas pouvoir recevoir ses élèves prioritaires.
- Élève prioritaire reçu par un binôme sans son professeur principal.

### 6.4 Documents

- **V2-F9.** Tous les documents indiquent le niveau.
- **V2-F10.** Le planning par classe peut afficher la LVB et les options de chaque élève.

### 6.5 Reprise des données de la v1

- **V2-F11.** Les données de la v1, enregistrées dans le navigateur ou dans un fichier, sont reprises automatiquement comme préparation du niveau 6e : tous les enseignements deviennent « classe entière », sans LVB ni option. Aucune ressaisie n'est nécessaire.

## 7. Design Material 3

Le style est recréé en CSS à partir des principes Material 3, sans bibliothèque externe.

| Élément     | Mise en œuvre                                                                                                                                                        |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Couleurs    | Rôles de couleur M3 (primary, secondary, tertiary, surface et ses niveaux, error, outline…), générés à partir d'une couleur source bleue, en thèmes clair et sombre. |
| Typographie | Échelle M3 : display, headline, title, body, label. Police système, pour rester hors ligne et léger.                                                                 |
| Formes      | Échelle de coins arrondis M3 : petit 8 px, moyen 12 px, grand 16 px, extra-large 28 px.                                                                              |
| Élévation   | Niveaux 0 à 3 par teinte de surface et ombre légère.                                                                                                                 |
| États       | Couches d'état au survol, au focus et à l'appui ; focus clavier toujours visible.                                                                                    |
| Composants  | Barre d'application supérieure, onglets principaux, cartes, boutons (rempli, tonal, contour, texte), puces filtres, boutons segmentés, dialogues, snackbar, menus.   |
| Accueil     | Grille de cartes de niveau.                                                                                                                                          |
| Documents   | Les documents imprimés restent en noir et blanc, sans style M3.                                                                                                      |

Exigences maintenues :

- WCAG 2.1 AA, vérifié automatiquement en thème clair et sombre ;
- utilisation complète au clavier ;
- affichage sur téléphone sans défilement horizontal.

## 8. Lots de livraison proposés

Chaque lot est testé (unitaires et bout en bout) et livré sur `main` avant le suivant.

| Lot | Contenu                                                                                       |
| --- | --------------------------------------------------------------------------------------------- |
| 1   | Design Material 3 sur l'existant, sans changement fonctionnel                                 |
| 2   | Données par niveau, écran d'accueil, reprise automatique des données de la v1                 |
| 3   | LVB, options, enseignements et équipe de l'élève ; algorithmes et contrôles adaptés           |
| 4   | Élèves prioritaires du professeur principal, durée par niveau, documents ; étiquette `v2.0.0` |

Commencer par le design permet de valider l'aspect visuel tôt, avant de construire les nouveaux écrans.

### Avancement

- **Lot 1 — livré sur `v2-dev`.** Jetons de couleur générés à partir du bleu de la v1 (variante « Vibrant », primaire `#0053db`) avec la bibliothèque de Google, utilisée seulement au développement (`npm run theme`). Couleurs de statut (succès, avertissement) harmonisées. Barre supérieure, onglets, boutons (rempli, contour, tonal, compact), boutons segmentés pour les vues du planning et les documents, puces filtres, champs, cartes, dialogue et snackbar selon Material 3. Aucun changement de fonctionnement ; tous les tests de la v1 restent verts, dont le contrôle WCAG 2.1 AA en thème clair et sombre.
- **Lot 2 — livré sur `v2-dev`.**
  - **Stockage par niveau** : une clé du navigateur par niveau (`rpp-v2-6e`…), avec ses dates de sauvegarde et sa copie de secours. L'historique « Annuler » est propre à chaque niveau et survit au passage par l'accueil.
  - **Accueil** (V2-A1 à V2-A4) : une carte par niveau (date, élèves, enseignants, binômes, élèves planifiés, points à corriger, état de la sauvegarde, rappel d'effacement) ; « Ouvrir », « Sauvegarder », « Effacer définitivement » ; effacement de tous les niveaux. L'accueil s'affiche à chaque lancement.
  - **Niveau courant** : affiché dans la barre supérieure, avec un bouton « Accueil ». Il est inscrit dans l'adresse (`#5e`) : un rechargement garde le niveau, le bouton « Précédent » du navigateur ramène à l'accueil.
  - **Sauvegardes** : le niveau est enregistré dans le fichier et figure dans son nom (`rencontres-parents-profs-5e.json`, `planning-rencontres-5e.xlsx`). Depuis l'accueil, « Ouvrir une sauvegarde » range le fichier dans son niveau (confirmation si ce niveau contient déjà des données). Dans un niveau, une sauvegarde d'un autre niveau est refusée. Un fichier de la v1 est une sauvegarde de 6e.
  - **Reprise de la v1** (V2-F11) : format de données version 2 (champ `niveau`). Au premier lancement, les données de la v1 enregistrées dans le navigateur deviennent le niveau 6e, avec leurs dates de sauvegarde, et les anciennes clés sont supprimées. Des données illisibles sont mises de côté ; un 6e déjà rempli n'est jamais écrasé.
  - **Documents** : l'en-tête des plannings indique le niveau (début de V2-F9). Une nouvelle classe est nommée selon le niveau (5A, 5B…).

## 9. Décisions du 19 novembre 2026

| Question                                      | Décision                                                                                                                                                                                                                                   |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Professeur principal                          | Jusqu'à **5 élèves prioritaires** par professeur principal (V2-R11). Le professeur principal garde un seul binôme toute la soirée : la capacité suffit (5 élèves prioritaires pour 9 à 12 créneaux) et la règle H1 de la v1 reste valable. |
| LVB en 6e                                     | Une classe bilangue **breton** existe : elle se gère comme l'option « Bilangue breton » de la 6e.                                                                                                                                          |
| Options de 5e, 4e et 3e                       | À définir plus tard ; les listes sont modifiables dans l'application.                                                                                                                                                                      |
| Couleur du thème                              | Bleu.                                                                                                                                                                                                                                      |
| Groupes de LVB interclasses                   | Oui : un même groupe peut réunir plusieurs classes (V2-R10).                                                                                                                                                                               |
| Reprise des enseignants d'un niveau à l'autre | Non retenue : chaque niveau est saisi indépendamment.                                                                                                                                                                                      |
| Équipe : professeur principal (20 novembre)   | Il appartient à l'équipe de tous les élèves de sa classe, quelle que soit sa discipline (section 4.4).                                                                                                                                     |
| Équipe : élèves ULIS (20 novembre)            | L'enseignant de LVB n'entre pas dans leur équipe (section 4.4). Les élèves ULIS sont repérés à l'import par la formation.                                                                                                                  |
| Import Pronote (20 novembre)                  | Les exports bruts des enseignants et des élèves sont lus directement ; règles détaillées dans [import-pronote.md](import-pronote.md).                                                                                                      |

### Point restant

Liste des options de 5e, 4e et 3e : nécessaire seulement pour les données par défaut, pas pour le développement.

## 10. Critères de réussite

- Préparer un niveau de 4 classes avec LVB et options en moins de 30 minutes à partir des fichiers d'import.
- Aucun élève reçu par un enseignant qui ne l'a pas en cours, sauf placement manuel signalé.
- Les données de la v1 s'ouvrent dans la v2 sans perte.
- Aucune violation WCAG 2.1 AA ; tous les tests de la v1 restent verts.
