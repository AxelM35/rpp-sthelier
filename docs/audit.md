# Audit — Application « Rencontres parents-professeurs 6ème »

19 novembre 2026 — fichier audité : `rencontres-parents-profs.html` (658 lignes, 65 Ko)

## Synthèse

L'application remplit son rôle : la génération automatique est rapide (moins de 0,2 s pour 110 élèves), les répartitions sont équilibrées et les contrôles signalent les incohérences. Les faiblesses tiennent à trois choses : le code est écrit de façon trop compacte pour être maintenu par quelqu'un d'autre, plusieurs actions détruisent du travail sans prévenir, et la sécurité suppose que tous les fichiers ouverts sont fiables.

| Domaine                  | Note   | En une phrase                                                                                    |
| ------------------------ | ------ | ------------------------------------------------------------------------------------------------ |
| Fonctionnement           | Bon    | Les fonctions du cahier des charges marchent, testées dans un navigateur.                        |
| Sécurité et données      | Moyen  | Pas de serveur ni d'envoi de données, mais trois failles exploitables par un fichier piégé.      |
| Maintenabilité           | Faible | Un seul fichier, lignes de plus de 1 000 caractères, noms d'une lettre, aucun test automatique.  |
| Ajout de fonctionnalités | Moyen  | Le découpage en onglets aide ; l'état global et le HTML en chaînes freinent.                     |
| Ergonomie et design      | Moyen  | Parcours clair et lisible ; actions destructrices sans confirmation, clavier mal pris en charge. |

Chaque constat marqué **[vérifié]** a été reproduit par un test automatisé dans un navigateur.

## Priorités

| Priorité | Constat                                                                                             | Effort |
| -------- | --------------------------------------------------------------------------------------------------- | ------ |
| 1        | « Tout effacer » et « Tout générer » détruisent le travail sans confirmation (U1, U2)               | Faible |
| 2        | Ouvrir une sauvegarde piégée exécute du code (S1) ; une sauvegarde abîmée bloque l'application (S2) | Faible |
| 3        | Bibliothèque Excel avec failles connues, chargée sans contrôle d'intégrité (S3)                     | Faible |
| 4        | Importer deux fois le même fichier double les élèves (U3)                                           | Faible |
| 5        | Export CSV : injection de formules (S4)                                                             | Faible |
| 6        | Restructurer le code et ajouter des tests sur les algorithmes (M1 à M4)                             | Élevé  |
| 7        | Accessibilité au clavier (U6)                                                                       | Moyen  |

## 1. Sécurité et protection des données

**Points forts**

- Aucune donnée ne quitte le poste : pas de serveur, pas de compte, pas de traceur.
- Le contenu saisi est échappé avant affichage : un nom d'élève contenant du code n'est pas exécuté.
- L'export Excel est produit sans bibliothèque externe et écrit des textes, pas des formules.

**S1 — Exécution de code via un fichier de sauvegarde piégé [vérifié]. Gravité : moyenne.**
Les identifiants internes lus dans un fichier `.json` sont insérés dans la page sans échappement. Un fichier modifié peut ajouter du code qui s'exécute dans l'application et accède à toutes les données des élèves. Le risque est limité, puisque l'utilisateur doit ouvrir le fichier lui-même, mais une sauvegarde peut circuler par courriel entre collègues.
_Correction_ : échapper aussi les identifiants, et à l'ouverture régénérer tous les identifiants ou refuser ceux qui ne correspondent pas au format attendu.

**S2 — Une sauvegarde incomplète bloque l'application [vérifié]. Gravité : moyenne.**
Le contrôle à l'ouverture vérifie seulement la version et la présence de la liste d'élèves. Un fichier où un professeur n'a pas de liste de classes provoque une erreur et l'écran ne se met plus à jour. Les données enregistrées ne sont pas abîmées : recharger la page les restaure.
_Correction_ : valider chaque élément (types, champs obligatoires, références entre classes, professeurs et binômes) avant de remplacer les données, et afficher un message précis en cas de refus.

**S3 — Bibliothèque de lecture Excel vulnérable et non vérifiée. Gravité : moyenne.**
L'import Excel utilise SheetJS 0.18.5, chargé depuis un CDN. Cette version a deux failles publiées lors de la lecture de fichiers piégés : pollution de prototype (CVE-2023-30533) et blocage du navigateur par expression régulière (CVE-2024-22363). Le script est chargé sans attribut `integrity` : si le CDN était compromis, le code servi s'exécuterait avec accès aux données.
_Correction_ : passer à une version corrigée (0.20.2 ou plus, diffusée par le CDN de SheetJS) et l'intégrer au fichier, ce qui supprime aussi la dépendance au réseau. À défaut, ajouter l'attribut `integrity`.

**S4 — Injection de formules dans l'export CSV [vérifié]. Gravité : faible.**
Un nom commençant par `=`, `+`, `-` ou `@` est exporté tel quel. Ouvert dans Excel, `=HYPERLINK(...)` devient un lien actif. L'export `.xlsx` n'est pas concerné.
_Correction_ : préfixer d'une apostrophe les valeurs qui commencent par ces caractères.

**S5 — Données personnelles de mineurs en clair dans le navigateur. Gravité : à arbitrer (RGPD).**
Les noms, classes et contraintes horaires des élèves restent dans le stockage du navigateur jusqu'à « Tout effacer ». Sur un poste partagé en salle des professeurs, l'utilisateur suivant peut les consulter en ouvrant le fichier.
_Recommandations_ :

- afficher clairement où sont stockées les données ;
- proposer d'effacer les données après la soirée ;
- documenter le traitement auprès du délégué à la protection des données de l'établissement.

## 2. Maintenabilité du code

**Points forts**

- Aucune étape de compilation : un seul fichier à ouvrir.
- Séparation lisible entre calcul (créneaux, quotas, binômes, horaires), contrôles et affichage.
- Annulation sur 40 niveaux, enregistrement automatique.

**M1 — Code trop compact. Gravité : élevée pour la reprise par un tiers.**
59 lignes dépassent 200 caractères, la plus longue en compte 1 306. Les noms sont réduits à une ou deux lettres (`st`, `ui`, `A`, `C`, `el`, `pr`, `bi`, `cl`). Un enseignant ou un développeur qui reprend l'outil aura du mal à le modifier sans erreur.
_Correction_ : reformater (Prettier), renommer les fonctions et variables clés, commenter les algorithmes.

**M2 — Aucun test automatisé. Gravité : élevée.**
Les algorithmes de proposition, de répartition et de planification sont la valeur de l'outil et les plus fragiles. Les seuls tests sont ceux que j'ai lancés pendant le développement, et ils ne sont pas conservés avec l'application.
_Correction_ : extraire les algorithmes dans un module de fonctions pures (données en entrée, résultat en sortie) et écrire des tests sur des cas types : effectifs inégaux, professeur partiel, capacité insuffisante, fratries.

**M3 — Les algorithmes lisent l'état global.**
`proposerBinomes`, `repartir` et `planifier` lisent et modifient directement la variable globale. On ne peut ni les tester isolément ni comparer deux propositions côte à côte.

**M4 — Pas de migration du format de sauvegarde.**
Le format porte une version (`v:1`), mais rien n'est prévu pour passer à une version suivante. La fusion avec les valeurs par défaut est superficielle : un nouveau paramètre de soirée ajouté plus tard manquera dans les anciennes sauvegardes.
_Correction_ : une fonction `migrer(donnees)` appliquée à chaque chargement, version par version.

**M5 — Résidus de code.**

- Le paramètre `notes` de `docBinomes` ne sert plus depuis la suppression des feuilles de route.
- Dans `telecharger`, les deux branches de la condition `txt instanceof Blob ? … : …` sont identiques.
- Le filtre de classe est partagé entre les onglets Données et Répartition : choisir une classe dans l'un la sélectionne dans l'autre.

## 3. Capacité à intégrer de nouvelles fonctionnalités

| Évolution envisageable                                    | Difficulté actuelle | Pourquoi                                                                           |
| --------------------------------------------------------- | ------------------- | ---------------------------------------------------------------------------------- |
| Nouveau document imprimable                               | Facile              | Ajouter une entrée au tableau `DOCS`.                                              |
| Nouveau contrôle (avertissement)                          | Facile              | Ajouter une règle dans `diag()`.                                                   |
| Nouveau champ élève ou professeur                         | Moyenne             | Toucher à l'import, au tableau, à la sauvegarde et à la migration (absente).       |
| Plusieurs soirées ou plusieurs niveaux                    | Difficile           | « Une soirée » est supposé partout ; il faut un niveau de données supplémentaire.  |
| Binômes de trois professeurs, glissants sur trois classes | Difficile           | La limite de deux est codée en plusieurs endroits.                                 |
| Partage en ligne entre collègues                          | Très difficile      | Pas de séparation entre données et affichage ; impose un serveur et un cadre RGPD. |
| Tests et outillage modernes                               | Moyenne             | Nécessite d'abord le découpage en modules (M2, M3).                                |

**Préalables recommandés avant toute évolution importante**

1. Découper le fichier en modules : modèle et validation, algorithmes, affichage, import et export. Un outil d'assemblage (par exemple Vite) peut regénérer un fichier HTML unique pour la diffusion.
2. Remplacer la construction du HTML par concaténation de chaînes par des gabarits, ou par une petite bibliothèque d'affichage (Preact, lit-html). Cela supprime aussi le risque d'oubli d'échappement de la faille S1.
3. Isoler les constantes métier : deux professeurs par binôme, deux classes au plus, écart d'équilibrage de 2.

## 4. Ergonomie et design

**Points forts**

- Parcours en six onglets numérotés, dans l'ordre logique de préparation.
- Pastilles d'avertissement sur les onglets et liste des contrôles dans chaque vue.
- Calcul de capacité en direct dans l'onglet Soirée, qui répond à la question « combien de binômes faut-il ? ».
- Grille de planning lisible, créneaux indisponibles hachurés, cadenas pour protéger un rendez-vous.
- Thème clair et sombre, documents imprimés en noir sur blanc, pas de défilement horizontal sur téléphone.

**U1 — « Tout effacer » sans confirmation [vérifié]. Gravité : élevée.**
Un clic efface tout : 110 élèves sont passés à 0. Le bouton est placé juste à côté de « Sauvegarder ». « Annuler » permet de revenir en arrière, mais seulement tant que la page n'est pas rechargée.
_Correction_ : demander confirmation, éloigner le bouton ou le déplacer dans un menu.

**U2 — La génération écrase le travail manuel [vérifié]. Gravité : élevée.**
« Proposer les binômes » et « Tout générer » suppriment tous les rendez-vous, y compris ceux protégés par le cadenas : un rendez-vous verrouillé avant la génération ne l'est plus après. Le cadenas ne protège que contre « Générer les horaires ».
_Correction_ : demander confirmation dès qu'il existe des rendez-vous, et conserver les binômes et rendez-vous verrouillés.

**U3 — Import en double [vérifié]. Gravité : moyenne.**
Importer deux fois le même fichier ajoute les élèves en double, sans avertissement.
_Correction_ : détecter les doublons (même nom, prénom et classe) et proposer de les ignorer.

**U4 — Proposition sans alternative.**
Une seule proposition de binômes est affichée. Il n'est pas possible d'en voir plusieurs ou d'imposer un binôme précis avant de compléter automatiquement. En pratique, les équipes ont souvent des affinités ou des impératifs à respecter.
_Correction_ : permettre de verrouiller un binôme créé à la main et de laisser l'algorithme compléter le reste.

**U5 — Sauvegarde peu visible.**
Les données ne vivent que dans ce navigateur. Rien ne rappelle d'exporter une sauvegarde, et l'historique d'annulation est perdu au rechargement.
_Correction_ : indiquer la date de la dernière sauvegarde exportée, et proposer de sauvegarder après une génération.

**U6 — Accessibilité au clavier et aux lecteurs d'écran.**

- Les vignettes d'élèves ne peuvent pas recevoir le focus clavier (`tabIndex` absent) : on ne peut déplacer un élève qu'à la souris ou au toucher.
- La barre d'onglets n'a pas les rôles ARIA `tablist` et `tab`.
- Des informations utiles ne sont données que par des infobulles (`title`), invisibles au clavier et sur tablette.
- Le cadenas est un émoji : le lecteur d'écran l'annonce de façon variable.
  _Correction_ : rendre les vignettes focusables (`<button>`), ajouter les rôles ARIA et remplacer les infobulles par des textes visibles.

**U7 — Détails**

- Dans l'onglet Répartition, quand un élève est sélectionné, cliquer sur un autre élève le sélectionne au lieu de déposer le premier dans cette colonne.
- La convocation n'affiche pas de date si la date de la soirée n'est pas saisie, sans avertissement.
- Les noms des colonnes de binômes sont longs dans la grille ; un code court (B1, B2…) avec une légende gagnerait de la place.
- Aucune aide intégrée : un court guide « premiers pas » dans l'onglet Soirée aiderait un nouvel organisateur.

## 5. Ce qui a été testé

- Génération complète sur 110 élèves et 20 professeurs : moins de 0,2 s.
- Trois propositions successives de binômes sont identiques : le résultat est reproductible.
- Les scénarios des constats S1, S2, S4, U1, U2 et U3 ont été reproduits automatiquement.
- Le fichier `.xlsx` exporté est valide et s'ouvre dans LibreOffice.

Non testés : ouverture dans Microsoft Excel, impression réelle, lecteurs d'écran, navigateurs Safari et Firefox.

## 6. Suivi des corrections (19 novembre 2026)

Les six points prioritaires sont corrigés et vérifiés par des tests automatisés dans un navigateur.

| Constat                              | Correction                                                                                                                                                                                                                             | Vérification                                                                                                         |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| U1 — Tout effacer                    | Confirmation indiquant ce qui sera effacé ; bouton écarté et en rouge.                                                                                                                                                                 | Annuler la confirmation conserve les données.                                                                        |
| U2 — Génération destructrice         | Confirmation avant « Proposer les binômes », « Tout générer » et « Répartir automatiquement » dès qu'il existe des élèves affectés. Les rendez-vous verrouillés sont conservés avec leur binôme.                                       | Deux rendez-vous verrouillés gardent binôme et horaire après régénération ; les autres élèves sont tous replacés.    |
| S1, S2 — Sauvegarde piégée ou abîmée | Chaque sauvegarde (fichier ouvert ou données du navigateur) est entièrement contrôlée et reconstruite : identifiants, types, références, horaires. Un fichier refusé laisse les données actuelles intactes, avec un message explicite. | Le fichier piégé et le fichier incomplet de l'audit sont refusés ; une sauvegarde normale se recharge à l'identique. |
| S3 — Bibliothèque Excel vulnérable   | SheetJS est supprimée. La lecture des fichiers .xlsx est intégrée à l'application et utilise la décompression du navigateur. Plus aucun script externe : l'import Excel fonctionne hors ligne.                                         | Import réussi de fichiers produits par openpyxl, LibreOffice et l'application elle-même.                             |
| U3 — Import en double                | Les élèves déjà présents (même nom, prénom et classe) sont ignorés et comptés dans le message. Pour un professeur déjà présent, ses classes sont complétées.                                                                           | Le même élève importé deux fois n'est ajouté qu'une fois.                                                            |
| S4 — Injection CSV                   | Les valeurs commençant par `=`, `+`, `-` ou `@` sont préfixées d'une apostrophe.                                                                                                                                                       | `=HYPERLINK(...)` est exporté comme simple texte.                                                                    |

Changement de comportement : les anciens formats .xls et .ods ne sont plus lus ; l'application demande de les enregistrer en .xlsx ou .csv.

### Ergonomie et accessibilité (19 novembre 2026)

| Constat                           | Correction                                                                                                                                                                                                                                                                                                                                                                                |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| U4 — Proposition sans alternative | Bouton « Conserver » sur chaque binôme. Un binôme composé à la main est conservé automatiquement. La proposition garde ces binômes et complète le reste. Chaque binôme a un code court (B1, B2…) repris partout.                                                                                                                                                                          |
| U5 — Sauvegarde peu visible       | L'en-tête indique en permanence « Pas encore sauvegardé », « Sauvegardé le … » ou « Modifié depuis la sauvegarde du … ». Rappel de sauvegarde après une génération réussie.                                                                                                                                                                                                               |
| U6 — Clavier et lecteurs d'écran  | Chaque élève est un bouton : Entrée pour le sélectionner, puis « Placer ici » dans la destination, Échap pour annuler. Onglets conformes au modèle ARIA (flèches, Début, Fin). Annonces vocales des messages et déplacements. Tous les champs et boutons ont un nom accessible. Cadenas en icône avec état annoncé. Lien « Aller au contenu ». Le focus est conservé après chaque action. |
| U6 — Informations en infobulle    | Remplacées par des textes visibles : légende des classes communes, explication de la fratrie et des contraintes horaires, mode d'emploi du déplacement.                                                                                                                                                                                                                                   |
| U7 — Clic sur un autre élève      | En Répartition, un élève sélectionné rejoint la colonne de l'élève cliqué ; dans le Planning, les deux rendez-vous sont échangés.                                                                                                                                                                                                                                                         |
| U7 — Date absente                 | Avertissement dans l'onglet Soirée et dans Documents. L'alerte des Documents nomme désormais les onglets concernés.                                                                                                                                                                                                                                                                       |
| U7 — Colonnes larges              | Option « Colonnes compactes » dans le Planning : codes de binômes avec légende.                                                                                                                                                                                                                                                                                                           |
| U7 — Aide                         | Encadré « Premiers pas » dans l'onglet Soirée, ouvert tant qu'aucun élève n'est saisi.                                                                                                                                                                                                                                                                                                    |
| Divers                            | Confirmation avant de supprimer une classe qui a des élèves et avant « Supprimer tous les binômes ».                                                                                                                                                                                                                                                                                      |

Vérification : l'outil axe-core ne relève aucune violation WCAG 2.1 niveau A et AA sur les six onglets, en thème clair comme sombre. Les parcours au clavier (onglets, sélection et déplacement d'un élève, échange de deux rendez-vous, cadenas) ont été testés automatiquement. Aucun débordement horizontal sur un écran de 390 px. Non testé : lecteurs d'écran réels (NVDA, VoiceOver).

### Structure du code et tests (19 novembre 2026)

| Constat                               | Correction                                                                                                                                                                                                                                                                                    |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1 — Code trop compact                | Code découpé en 36 modules dans le projet `rencontres-parents-profs/`, noms explicites, commentaires sur les algorithmes. Mise en forme imposée par Prettier ; aucune ligne au-delà de 180 caractères (contre 1 306 auparavant).                                                              |
| M2 — Aucun test                       | 61 tests unitaires (algorithmes, données, imports, exports) et 15 tests de bout en bout dans Chromium (parcours complet, sécurité, clavier, accessibilité WCAG, affichage sur téléphone). Un défaut introduit volontairement dans l'équilibrage ou les contraintes horaires est bien détecté. |
| M3 — Algorithmes liés à l'état global | Les algorithmes reçoivent l'état en paramètre et renvoient un nouvel état, sans modifier celui reçu. Ils fonctionnent sans navigateur. La proposition de binômes utilise un hasard à graine fixe : résultat reproductible.                                                                    |
| M4 — Pas de migration                 | Mécanisme de migration par version dans `modele/etat.js` ; une sauvegarde d'une version plus récente est refusée avec un message clair.                                                                                                                                                       |
| M5 — Résidus                          | Paramètre inutilisé et condition redondante supprimés. Les filtres de classe des onglets Données, Répartition et Planning sont désormais indépendants.                                                                                                                                        |

Le fichier unique livré est produit par `npm run build`. Il est identique au pixel près à la version précédente sur les écrans vérifiés, et reprend les données déjà enregistrées dans le navigateur.

### Données personnelles (RGPD)

| Constat                                  | Correction                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S5 — Données en clair dans le navigateur | Encadré « Données personnelles » dans l'onglet Soirée : lieu de stockage, données concernées, fichiers, durée de conservation. Rappel sur tous les onglets dès le lendemain de la soirée, renforcé après 30 jours (durée réglable). Bouton « Effacer définitivement » qui supprime aussi l'historique d'annulation et la copie de secours interne, qui pouvait auparavant rester indéfiniment. Message à chaque téléchargement sur le caractère personnel des fichiers. Projet de fiche de traitement pour le DPO : `docs/rgpd.md`. |

Les données restent stockées en clair dans le navigateur : le chiffrement imposerait un mot de passe à chaque ouverture, pour un gain limité sur un poste dont la session est déjà personnelle. Ce choix est à valider avec le DPO, comme la base légale et la durée de conservation (voir `docs/rgpd.md`).

Tous les points de l'audit sont traités.
