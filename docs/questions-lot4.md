# Lot 4 — Questions de conception

Questions posées le 20 novembre 2026, avant de commencer le lot 4 (élèves prioritaires du professeur principal, durée des rendez-vous par niveau, documents). Le détail des exigences est dans le [cahier des charges v2](cahier-des-charges-v2.md) : V2-R11, V2-R12, V2-F4 bis, V2-F6, V2-F6 bis, V2-F9, V2-F10 et section 6.3.

Pour répondre, compléter les lignes « Réponse » (ou répondre dans la conversation). Une réponse « d'accord » retient la proposition recommandée.

## Découpage proposé

| Étape | Contenu                                                                                                                                                                                          |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 4a    | Durée des rendez-vous par niveau (V2-R12) : valeur par défaut d'une soirée neuve, aide au réglage dans la carte « Capacité » de l'onglet Soirée.                                                  |
| 4b    | Élèves prioritaires, données et saisie : format de données version 4, case à cocher dans la liste des élèves, limite de 5 (V2-F4 bis), conservation lors d'un nouvel import, fiche RGPD.          |
| 4c    | Élèves prioritaires, calcul et contrôles : proposition des binômes, répartition (V2-F6), horaires, comparaison de propositions, contrôles de la section 6.3 ; comparaison avant / après sur la 6e. |
| 4d    | Signalement et documents : élèves prioritaires signalés (V2-F6 bis), niveau sur tous les documents et exports (V2-F9), LVB et options dans le planning par classe (V2-F10).                      |
| 4e    | Fin de la version 2 : relecture du code, documentation (cahier des charges, README, RGPD, audit), fichier HTML construit.                                                                        |

## Déjà décidé, sans question

- **Donnée** : un élève prioritaire porte une simple indication oui / non (`prioritaire`). Les données passent en version 4 ; une sauvegarde plus ancienne s'ouvre avec aucun élève prioritaire.
- **Calcul** : les élèves prioritaires d'une classe forment des groupes à part, que seul un binôme comprenant le professeur principal de la classe peut recevoir. La répartition traite d'abord les groupes servis par le moins de binômes : les prioritaires sont donc placés en premier (V2-F6), même quand la capacité est insuffisante (cas de la 6e).
- **Proposition des binômes** : un professeur principal qui a au moins un élève prioritaire est toujours placé dans un binôme, en mode « tous » comme en mode « le moins de binômes possible », avec un partenaire de l'équipe de ses élèves prioritaires. Il garde un seul binôme (H1), qui reçoit aussi d'autres élèves.
- **Sans élève prioritaire**, binômes, répartition et horaires restent identiques à ceux d'aujourd'hui (vérifié sur plusieurs situations de la 6e).
- **Glisser-déposer** : un élève prioritaire déposé chez un binôme sans son professeur principal est signalé, sans être interdit (comme V2-F8).
- **Contrôles de la section 6.3** liés au professeur principal : élève prioritaire dans une classe sans professeur principal ; professeur principal sans binôme ; professeur principal présent sur trop peu de créneaux pour ses élèves prioritaires ; élève prioritaire reçu par un binôme sans son professeur principal.

## 1. Désignation des élèves prioritaires

Les exports Pronote n'indiquent pas les élèves prioritaires.

- **A — recommandée** : saisie seule, par la case à cocher de la liste des élèves, avec un compteur par classe (« 3 / 5 prioritaires »). Un nouvel import des élèves conserve l'indication des élèves déjà présents (même nom, prénom et classe).
- **B** : comme A, et l'import générique (CSV ou Excel) lit aussi une colonne facultative « Prioritaire » (« oui », « x » ou « 1 »).

Réponse :

## 2. Limite de 5 élèves

- **2a.** La limite porte sur le professeur principal (cahier des charges, V2-R11). S'il est professeur principal de deux classes du niveau, faut-il compter 5 élèves en tout, ou 5 par classe ? **Recommandé : 5 par classe**, car chaque classe a ses propres familles à recevoir ; son binôme unique serait alors glissant sur ses deux classes.
- **2b.** Classe sans professeur principal désigné : **recommandé : la case reste permise** (limite de 5 dans la classe) et un contrôle signale l'absence de professeur principal. Ainsi, l'ordre de saisie importe peu.
- **2c.** Le refus au sixième élève (V2-F4 bis) vaut pour la case à cocher. Si une autre modification fait dépasser la limite (élève changé de classe), **recommandé : pas de refus, mais un point à corriger**.

Réponse 2a :

Réponse 2b :

Réponse 2c :

## 3. Binôme du professeur principal sans assez de place

Cas possibles : professeur principal présent sur une partie de la soirée seulement, binôme du professeur principal conservé à la main et déjà plein, aucun partenaire possible pour le professeur principal.

- **A — recommandée** : les élèves prioritaires restent chez le professeur principal dans la limite des places ; les autres sont reçus par un autre binôme de leur équipe, et un point à corriger le signale (« élève prioritaire reçu sans son professeur principal »). Aucune famille n'est privée de rendez-vous.
- **B** : les élèves prioritaires en surnombre restent sans rendez-vous, avec un point à corriger.

Réponse :

## 4. Signalement des élèves prioritaires

À l'écran (V2-F6 bis), une étiquette « Prioritaire » accompagnée d'une étoile signale l'élève dans la répartition, le planning et le planning par binôme. Reste la question des documents imprimés et des exports. Être désigné prioritaire n'est pas une donnée de santé, mais peut laisser deviner des difficultés : le moins de diffusion possible est préférable.

- **A — recommandée** : à l'écran, et sur le **planning par binôme imprimé**, destiné aux deux enseignants qui reçoivent la famille et utile pour préparer l'entretien. Jamais sur le planning général, le planning par classe, les convocations, ni dans les exports Excel et CSV.
- **B** : à l'écran seulement.
- **C** : à l'écran, sur les plannings imprimés et dans les exports, jamais sur les convocations.

Réponse :

## 5. Convocation d'un élève prioritaire

- **A — recommandée** : même texte que pour les autres familles. Le professeur principal prévient lui-même la famille s'il le juge utile.
- **B** : une phrase en plus, par exemple « Ce rendez-vous est demandé par le professeur principal de votre enfant. »

Réponse :

## 6. Durée des rendez-vous par niveau

Chaque niveau a déjà sa propre soirée, donc sa propre durée (onglet Soirée, 15 minutes par défaut). Sur vos données de 6e (139 élèves, 21 enseignants, de 17 h à 20 h), 10 binômes de 12 créneaux reçoivent au plus 120 familles : il manque au moins 19 créneaux.

- **6a. Valeur par défaut d'une soirée neuve.** **Recommandé : 15 minutes à tous les niveaux**, la durée étant ajustée avec l'aide ci-dessous. Si vous connaissez déjà la durée habituelle d'un niveau (par exemple 10 minutes en 6e), indiquez-la : elle deviendra sa valeur par défaut.
- **6b. Aide au réglage.** **Recommandé** : quand la capacité est insuffisante, la carte « Capacité » propose des réglages chiffrés, chacun avec un bouton « Appliquer » :
  - la durée la plus longue qui suffit (en 6e : 10 minutes, soit 18 créneaux) ;
  - l'heure de fin nécessaire avec la durée actuelle (en 6e : 20 h 30, soit 14 créneaux, très juste).

  Ce calcul suppose que tous les enseignants forment des binômes pleins : c'est un minimum. Les équipes pédagogiques, les binômes limités à une LVB ou une option et les présences partielles peuvent demander davantage ; « Tout générer » donne le résultat exact.
- **6c. Durées possibles.** Aujourd'hui, la durée se règle par pas de 5 minutes (5, 10, 15…). Faut-il permettre toute durée en minutes, par exemple 12 minutes (15 créneaux en 6e) ? **Recommandé : oui**, de 5 à 60 minutes ; les propositions de l'aide restent des multiples de 5 quand c'est possible.

Réponse 6a :

Réponse 6b :

Réponse 6c :

## 7. Niveau sur les documents et les exports (V2-F9)

Les plannings imprimés indiquent déjà le niveau dans leur en-tête, et les noms de fichiers le contiennent (`planning-rencontres-5e.xlsx`). Restent les convocations et le contenu des exports.

- **Convocations** : « Rencontre parents-professeurs de 5e du mardi 1 décembre 2026 ». **Recommandé.**
- **Excel** : **recommandé** : une ligne de titre en haut de chaque feuille (établissement, niveau, date), au-dessus des en-têtes de colonnes.
- **CSV** : **recommandé** : une colonne « Niveau » en première position, pour garder une ligne par élève, facile à trier et à réimporter. Une ligne de titre gênerait les tableurs.

Réponse :

## 8. LVB et options dans le planning par classe (V2-F10)

- **A — recommandée** : une case « Afficher la LVB et les options », non cochée par défaut, au-dessus du planning par classe (onglet Documents et vue « Par classe » de l'onglet Planning), mémorisée pour le niveau. Une colonne « LVB et options » s'ajoute alors (« Espagnol · Latin »). Les feuilles « Par classe » et « Par binôme » de l'export Excel et le CSV reçoivent deux colonnes « LVB » et « Options ». Jamais l'indication ULIS.
- **B** : la colonne toujours affichée sur le planning par classe, sans case à cocher ; exports inchangés.

Réponse :
