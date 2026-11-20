# Import des exports Pronote — compréhension à valider

Analyse du 20 novembre 2026, à partir d'un export anonymisé des enseignants (noms remplacés par des initiales). Objectif : importer l'export **brut** de Pronote, avec le moins de retouches possible. Les lignes « Réponse » sont à compléter.

## 1. Export des enseignants

### Structure du fichier

- **Une seule feuille, six colonnes** : Civilité, Nom, Matière/Fonction, Professeur principal, Heures enseignées, Effectif.
- **Toutes les classes du collège**, l'une sous l'autre : 20 classes, 5 par niveau.

  | Niveau | Classes             |
  | ------ | ------------------- |
  | 6e     | 6 C, 6 G, 6 M, 6 N, 6 T |
  | 5e     | 5 A, 5 M, 5 P, 5 S, 5 Z |
  | 4e     | 4 B, 4 C, 4 G, 4 M, 4 O |
  | 3e     | 3 A, 3 E, 3 I, 3 J, 3 O |

- **Un bloc par classe** :
  1. une ligne-titre : le nom de la classe, répété dans les six colonnes (sans doute une cellule fusionnée dans Pronote) ;
  2. une ligne « N professeurs » ;
  3. une ligne par enseignant intervenant dans la classe.
- **Un enseignant apparaît dans chaque classe où il intervient.** On le reconnaît d'une classe à l'autre par sa civilité et son nom : 43 enseignants distincts.

### Lecture de chaque colonne

| Colonne              | Lecture prévue                                                                                                                                                                                                                         |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Civilité, Nom        | Identité de l'enseignant (« Mme VP »).                                                                                                                                                                                                 |
| Matière/Fonction     | Liste séparée par des virgules, qui mêle des disciplines (FRANCAIS, ESPAGNOL LV2…) et des fonctions (VIE DE CLASSE, DEVOIRS FAITS…). Elle sert à classer l'enseignement (tableau ci-dessous).                                          |
| Professeur principal | « X » : professeur principal de la classe. Il y en a exactement un par classe, et il a toujours aussi « VIE DE CLASSE ». Servira au lot 4 (élèves prioritaires) : désignation automatique.                                              |
| Heures enseignées    | Non utilisée. Parfois remplacée par « Cet enseignant a un service de notation actif avec la classe ou la partie » (voir question E3).                                                                                                   |
| Effectif             | Nombre d'élèves de la classe que l'enseignant a en cours. Proche de l'effectif de la classe : classe entière ; nettement inférieur : groupe. Peut dépasser l'effectif quand un groupe réunit plusieurs classes (Mme LJ : 30 en 3 E). |

### Classement proposé des matières et fonctions

| Catégorie                    | Matières / fonctions                                                                                                                                                         | Effet sur l'équipe de l'élève                        |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Classe entière               | FRANCAIS, MATHEMATIQUES, HISTOIRE-GEOGRAPHIE, ENS. MORAL & CIVIQUE, ANGLAIS LV1, SCIENCES VIE & TERRE, PHYSIQUE-CHIMIE, TECHNOLOGIE, ARTS PLASTIQUES, EDUCATION MUSICALE, ED.PHYSIQUE & SPORT. | Tous les élèves de la classe                         |
| LVB (5e à 3e)                | ESPAGNOL LV2, ALLEMAND LV2                                                                                                                                                   | Les élèves de cette LVB, dans la classe              |
| Option (à confirmer, E1)     | BRETON, LCA LATIN, LLC ANGLAIS, O2, ATHLETISME, ANGLAIS +, MATHS +                                                                                                           | Les élèves de cette option, dans la classe           |
| Hors équipe (à confirmer, E1) | VIE DE CLASSE, DEVOIRS FAITS, ACCOMP. AUX DEVOIRS, PARCOURS AVENIR, CDI, Suivi Inclusion                                                                                     | Aucun : ces fonctions ne font pas entrer dans l'équipe |

**Type d'enseignement d'un enseignant dans une classe**, déduit de sa liste :

- au moins une discipline « classe entière » : classe entière (« FRANCAIS, LCA LATIN » → classe entière, ce qui couvre aussi les latinistes) ;
- sinon une LVB : LVB (« ESPAGNOL LV2 ») ;
- sinon une option : option (« LCA LATIN », « O2 ») ;
- seulement des fonctions hors équipe : l'enseignant n'est pas rattaché à la classe (Mme LF, « DEVOIRS FAITS » en 3 J ; Mme ACJ en 6 N).

**Import dans un niveau** : seules les classes de ce niveau sont prises (« 5 A »… pour la 5e). Le nom de classe est comparé à celui de l'export des élèves sans tenir compte des espaces (« 5 A » = « 5A »).

### Particularités relevées

- **Deux enseignants d'EPS pour une même classe**, chacun avec toute la classe (3 E : M. MC et M. ELB, 26 élèves chacun) : les deux sont « classe entière ».
- **LLC ANGLAIS co-animé** : Mme BBo et Mme ATT ont toujours le même effectif dans la même classe (3 A : 5 et 5 ; 4 G : 11 et 11). Les deux entrent dans l'équipe des élèves de LLC.
- **Histoire-géographie partagée en 3 E, 4 B, 5 P et 6 G** : M. JC a 2 à 5 élèves, l'autre professeur le reste (3 E : Mme MP 22 + M. JC 4 = 26). Ces effectifs correspondent à ceux de BRETON (3 E : 4 ; 4 B : 2 ; 5 P : 5), sauf en 6 G (BRETON : 7, M. JC : 2). Voir E2.
- **Mme GR** (« Suivi Inclusion » et de nombreuses matières, 11 à 13 élèves dans plusieurs classes de 3e, 4e et 5e) semble coordonner un dispositif ULIS. Voir E4.
- **Le nombre annoncé ne correspond pas au nombre de lignes** : dans chaque classe, « N professeurs » dépasse le nombre de lignes de 1 à 3 (3 A : 19 annoncés, 16 lignes). Voir E5.

### Questions sur l'export des enseignants

**E1. Classement des matières.** Le tableau ci-dessus est-il juste ? En particulier :

- **O2** : de quoi s'agit-il ? Mme EC (EPS) et Mme AVG (SVT), 3e et 4e, 0 h 30, souvent moins de 10 élèves.
- **ATHLETISME** : section sportive, donc option ?
- **ANGLAIS +** et **MATHS +** (5e, 6e) : groupes de soutien ou d'approfondissement. Faut-il les traiter comme une option (l'enseignant entre dans l'équipe de ces élèves) ou les ignorer ?
- **BRETON** en 5e, 4e et 3e : suite de la bilangue de 6e, donc option « Breton » à tous les niveaux ?
- **Fonctions hors équipe** : faut-il aussi y ranger CDI et PARCOURS AVENIR ?

Réponse :

**E2. Histoire-géographie en breton.** M. JC enseigne-t-il l'histoire-géographie en breton aux élèves bilingues ? Si oui, je propose de le traiter comme un enseignement de l'option Breton dans la classe : il entre dans l'équipe des seuls élèves bilingues. Et en 6 G, seuls 2 des 7 bilingues l'ont-ils en cours ?

Réponse :

**E3. « Service de notation actif ».** M. CG (éducation musicale, dans toutes les classes) et Mme RL (histoire-géographie et EMC, dans 6 classes où un autre professeur assure déjà ces matières) n'ont pas d'heures. Enseignent-ils réellement à ces classes ? Je propose :

- M. CG : classe entière, il enseigne dans toutes les classes ;
- Mme RL : à préciser (remplaçante, stagiaire, co-intervention ?).

Réponse :

**E4. Dispositif ULIS (Mme GR).** Faut-il l'écarter des binômes, ou la rattacher aux seuls élèves ULIS ? Dans le second cas, il faudrait que l'export des élèves indique qui en fait partie.

Réponse :

**E5. Lignes manquantes.** Avez-vous retiré des lignes en anonymisant, ou l'export brut compte-t-il aussi d'autres personnes (vie scolaire, assistants…) ? Si des lignes existent dans l'export brut, j'ai besoin d'en voir un exemple.

Réponse :

**E6. Noms dans l'export brut.** La colonne Nom contient-elle « NOM Prénom » ? Deux enseignants peuvent-ils avoir le même nom ?

Réponse :

**E7. Import unique pour tout le collège.** Le fichier couvre les 4 niveaux. Je propose de pouvoir l'importer **une seule fois depuis l'accueil** : chaque niveau reçoit ses classes et ses enseignants. Les préparations restent indépendantes ensuite. L'import par niveau resterait possible. Cela vous convient-il ?

Réponse :

**E8. Obtention du fichier.** Quel menu de Pronote produit cet export, et ses colonnes sont-elles toujours les mêmes ? Je l'indiquerai dans l'aide de l'application.

Réponse :

## 2. Export des élèves

À recevoir. Il doit permettre de savoir quels élèves suivent ESPAGNOL LV2, ALLEMAND LV2, BRETON, LCA LATIN, LLC ANGLAIS, O2, ATHLETISME… (et ULIS selon la réponse à E4), et comment s'écrivent les noms de classes.
