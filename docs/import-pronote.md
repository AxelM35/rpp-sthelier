# Import des exports Pronote — compréhension à valider

Analyse du 20 novembre 2026, à partir d'exports anonymisés (noms remplacés par des initiales). Réponses du 20 novembre reportées sous chaque question. Objectif : importer l'export **brut** de Pronote, avec le moins de retouches possible. Les lignes « Réponse » sont à compléter.

## Synthèse des règles d'import retenues (20 novembre)

Toutes les questions sont tranchées, sauf E8 (menus de Pronote, pour l'aide).

**Import des enseignants** (export du collège entier, importé dans un niveau) :

1. Seules les classes du niveau ouvert sont gardées (« 5 A »… en 5e).
2. Un enseignant est reconnu d'une classe à l'autre par sa civilité et son nom (« NOM Prénom »).
3. Un enseignant qui a « Suivi Inclusion » dans au moins une classe du fichier n'est pas importé (ULIS, écarté des binômes).
4. Dans chaque classe, son type d'enseignement se déduit de sa liste Matière/Fonction :
   - une discipline de classe entière : classe entière ;
   - sinon ESPAGNOL LV2 ou ALLEMAND LV2 : LVB ;
   - sinon BRETON, LCA LATIN, LLC ANGLAIS ou ATHLETISME : option ;
   - seulement O2, ANGLAIS +, MATHS +, VIE DE CLASSE, DEVOIRS FAITS, ACCOMP. AUX DEVOIRS, PARCOURS AVENIR, CDI : pas rattaché à la classe.
5. Une matière ou fonction inconnue est présentée avant l'import pour être classée.
6. « X » dans Professeur principal : professeur principal de la classe (lot 4).
7. Les heures sont ignorées ; « service de notation actif » vaut enseignement en classe entière.

**Import des élèves** (un export par niveau) :

1. Colonnes lues : Nom, Prénom d'usage (sinon Prénom), Classe, Formation, Toutes les options. Toutes les autres sont ignorées et listées dans le compte rendu.
2. LVB : la valeur de « Toutes les options » qui est une LVB du niveau. C'est la référence, même si l'export des enseignants diffère ; un contrôle signale une LVB sans enseignant dans la classe.
3. Options : les valeurs qui correspondent à une option de l'export des enseignants, rapprochées si l'un des noms commence par l'autre (« BRETON REG. » = « BRETON »), avec confirmation.
4. Ignorés : O2, ANGLAIS +, MATHS +, ANGLAIS LV1, la colonne Groupes.
5. ULIS : Formation se terminant par « ULIS ».
6. Élèves homonymes : deux lignes d'un même fichier sont toujours deux élèves, même avec les mêmes nom, prénom et classe. Le dédoublonnage (fichier importé deux fois) ne compare le fichier qu'aux élèves déjà saisis, ligne à ligne.

**Discipline partagée (histoire-géographie en breton)** : quand des élèves portent une discipline de classe entière dans « Toutes les options » (« HISTOIRE-GEOGRAPHIE »), l'enseignant de cette discipline dont l'effectif correspond reçoit ces élèves, et l'autre devient « classe entière sauf ces élèves ». L'application présente ce partage pour confirmation à l'import.

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
| Option                       | BRETON, LCA LATIN, LLC ANGLAIS, ATHLETISME                                                                                                                  | Les élèves de cette option, dans la classe           |
| Option ignorée (décision du 20 novembre) | O2, ANGLAIS +, MATHS +                                                                                                                                     | Aucun : ces options ne font pas entrer dans l'équipe |
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

Réponse (20 novembre) : O2, ANGLAIS + et MATHS + sont des options, mais elles sont **ignorées** : elles ne font pas entrer l'enseignant dans l'équipe. ATHLETISME est une option ; BRETON est l'option Breton, à tous les niveaux. CDI et PARCOURS AVENIR : rangés hors équipe, comme proposé.

**E2. Histoire-géographie en breton.** M. JC enseigne-t-il l'histoire-géographie en breton aux élèves bilingues ? Si oui, je propose de le traiter comme un enseignement de l'option Breton dans la classe : il entre dans l'équipe des seuls élèves bilingues. Et en 6 G, seuls 2 des 7 bilingues l'ont-ils en cours ?

Réponse : confirmé par l'export des élèves (groupes 3E-HGBZH et 3E-HGNONBZH) ; traitement exact retenu (P3, solution A). En 6 G, M. JC n'a que 2 des 7 bilingues : en 3e, les élèves concernés portent « HISTOIRE-GEOGRAPHIE » dans « Toutes les options ». C'est ce signal, et non l'effectif de breton, qui désigne les élèves de M. JC Vérifié avec l'export des élèves de 6e : en 6 G, 2 élèves ont « HISTOIRE-GEOGRAPHIE » en option, soit l'effectif de M. JC (partie 3).

**E3. « Service de notation actif ».** M. CG (éducation musicale, dans toutes les classes) et Mme RL (histoire-géographie et EMC, dans 6 classes où un autre professeur assure déjà ces matières) n'ont pas d'heures. Enseignent-ils réellement à ces classes ? Je propose :

- M. CG : classe entière, il enseigne dans toutes les classes ;
- Mme RL : à préciser (remplaçante, stagiaire, co-intervention ?).

Réponse (20 novembre) : oui, tous deux enseignent à ces classes : classe entière. Une ligne sans effectif n'entre pas dans la détection d'un partage (P3).

**E4. Dispositif ULIS (Mme GR).** Faut-il l'écarter des binômes, ou la rattacher aux seuls élèves ULIS ? Dans le second cas, il faudrait que l'export des élèves indique qui en fait partie.

Réponse (20 novembre, via P4) : les élèves ULIS sont repérés par la colonne Formation. Mme GR est **écartée des binômes**. Règle : un enseignant qui a « Suivi Inclusion » dans au moins une classe du fichier n'est pas importé ; le compte rendu d'import le signale. (Mme GR n'a pas « Suivi Inclusion » en 4 M : la règle porte donc sur tout le fichier, pas classe par classe.)

**E5. Lignes manquantes.** Avez-vous retiré des lignes en anonymisant, ou l'export brut compte-t-il aussi d'autres personnes (vie scolaire, assistants…) ? Si des lignes existent dans l'export brut, j'ai besoin d'en voir un exemple.

Réponse (20 novembre) : oui, des lignes ont été retirées à l'anonymisation. L'export brut en contient donc d'autres : toute matière ou fonction inconnue sera présentée à l'import pour être classée.

**E6. Noms dans l'export brut.** La colonne Nom contient-elle « NOM Prénom » ? Deux enseignants peuvent-ils avoir le même nom ?

Réponse (20 novembre) : la colonne contient « NOM Prénom » ; pas d'homonymes. Civilité et Nom suffisent à reconnaître un enseignant d'une classe à l'autre.

**E7. Import unique pour tout le collège.** Le fichier couvre les 4 niveaux. Je propose de pouvoir l'importer **une seule fois depuis l'accueil** : chaque niveau reçoit ses classes et ses enseignants. Les préparations restent indépendantes ensuite. L'import par niveau resterait possible. Cela vous convient-il ?

Réponse (20 novembre) : non, import par niveau. Le fichier du collège entier est importé dans un niveau, qui n'en garde que ses classes.

**E8. Obtention du fichier.** Quel menu de Pronote produit cet export, et ses colonnes sont-elles toujours les mêmes ? Je l'indiquerai dans l'aide de l'application.

Réponse (20 novembre) : en attente.

## 2. Export des élèves

Analyse d'un export anonymisé du niveau 3e (128 élèves, classes 3 A, 3 E, 3 I, 3 J, 3 O).

### Données personnelles : colonnes à ne jamais importer

L'export contient des **données de santé** (« Projet d'accompagnement » : PAI médicaux, PPS… ; « Allergies »), ainsi que la date de naissance et le sexe. L'application n'en a pas besoin.

- L'application ne lira que **Nom, Prénom, Prénom d'usage, Classe, Formation, Groupes, Toutes les options**. Les autres colonnes sont ignorées, jamais enregistrées, et leur nom est affiché à l'import (« colonnes ignorées »).
- Il est préférable de **retirer ces colonnes de l'export dans Pronote**, pour que ces données ne circulent pas dans un fichier (question P9).
- Les fichiers reçus pour l'analyse restent hors du dépôt. Les tests utiliseront un jeu fictif de même structure.

### Structure du fichier

- **Une seule feuille, une ligne par élève**, avec une ligne d'en-tête. 128 élèves, puis 408 lignes vides en fin de feuille, que le lecteur de l'application écarte déjà.
- **Classe** : même écriture que l'export des enseignants (« 3 E »). Le rapprochement est direct.
- **Formation** : « 3EME » (106), « 3EME SECTION SPORTIVE » (15), « 3EME BILINGUE » (4), « 3EME ULIS » (3).
- **Toutes les options** : liste séparée par des virgules. Elle donne la LV1, la LV2 et les options : ANGLAIS LV1 (128), ESPAGNOL LV2 (121), ALLEMAND LV2 (7), LLC ANGLAIS (39), LCA LATIN (22), ATHLETISME (15), BRETON REG. (4), et HISTOIRE-GEOGRAPHIE (4) et ENS. MORAL & CIVIQUE (4) pour les bilingues.
- **Groupes** : liste de codes « classes-groupe ». Le préfixe énumère les classes réunies : « 3AEIJO-O2 » couvre les 5 classes de 3e ; « 3AE4M-ALL » réunit 3 A, 3 E et 4 M.

  | Groupe(s)                    | Élèves                   | Sens                                            |
  | ---------------------------- | ------------------------ | ----------------------------------------------- |
  | 3A-ESP, 3E-ESP               | 20, 25                   | Espagnol LV2                                    |
  | 3AE4M-ALL                    | 6                        | Allemand LV2 (avec la 4 M)                      |
  | 3E-BZH                       | 4                        | Breton                                          |
  | 3E-HGBZH, 3E-HGNONBZH        | 4, 22                    | Histoire-géographie en breton / en français     |
  | 3IJ-LCALA                    | 22                       | Latin                                           |
  | 3AEIJO-SE-G1, 3AEIJO-SEG2    | 20, 19 (= 39 LLC)        | LLC anglais (section européenne), deux groupes  |
  | 3AJ-SA                       | 15                       | Section sportive athlétisme                     |
  | 3AEIJO-O2                    | 22                       | **O2 : n'existe que dans les groupes**          |
  | 3X-G1, 3X-G2                 | moitiés de classe        | Demi-groupes, sans enseignant propre            |
  | 3AEIJO-ASSEC                 | 30 (6 par classe)        | Inconnu (P2)                                    |
  | BAPTÊME                      | 3                        | Inconnu (P2)                                    |

### Recoupement avec l'export des enseignants

Les effectifs concordent presque partout, ce qui confirme le classement de la partie 1 :

- **LLC ANGLAIS** : 5, 9, 9, 10, 6 élèves par classe = effectif de Mme BBo et de Mme ATT dans chaque classe ;
- **O2** : 5, 7, 4, 2, 4 = effectif de Mme EC ou Mme AVG ;
- **LCA LATIN** (3 J : 12), **ATHLETISME** (3 J : 8), **ALLEMAND LV2** (3 A : 5, 3 E : 1), **BRETON** (3 E : 4) ;
- **histoire-géographie en 3 E** : M. JC a les 4 bilingues (groupe 3E-HGBZH), Mme MP les 22 autres (3E-HGNONBZH). Cela répond à E2 : M. JC enseigne bien l'histoire-géographie en breton.

Écarts relevés :

- 3 A : 21 élèves ont ESPAGNOL LV2 dans leurs options, mais 20 sont dans le groupe 3A-ESP et Mme JLR en a 20 ;
- 3 E : 25 hispanisants, M. ECG en a 23 ;
- 3 J : 1 élève a ALLEMAND LV2, mais aucun enseignant d'allemand n'intervient en 3 J (le groupe d'allemand ne couvre que 3 A, 3 E et 4 M) ; M. ECG a 25 élèves en espagnol, soit toute la classe.

### Lecture prévue

| Information de l'application | Source dans l'export                                                                                                                           |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Nom, prénom                  | Nom ; Prénom d'usage s'il est rempli, sinon Prénom (P7)                                                                                        |
| Classe                       | Classe (seules les classes du niveau sont prises)                                                                                              |
| LVB                          | Dans « Toutes les options », la valeur qui correspond à une LVB du niveau (ESPAGNOL LV2, ALLEMAND LV2)                                          |
| Options                      | Dans « Toutes les options », les valeurs qui correspondent à une matière « option » de l'export des enseignants (O2, ANGLAIS + et MATHS + ignorées) |
| ULIS (selon E4)              | Formation se terminant par « ULIS »                                                                                                            |

O2 étant ignorée, la colonne « Groupes » n'est plus nécessaire : toutes les options utiles figurent dans « Toutes les options ». Les valeurs sans enseignant correspondant (ANGLAIS LV1, demi-groupes G1/G2…) sont ignorées. Les valeurs inconnues sont présentées avant l'import, avec la proposition de les ajouter aux options du niveau ou de les ignorer.

### Questions sur l'export des élèves

**P1. Noms différents d'un export à l'autre.** « BRETON REG. » (élèves) et « BRETON » (enseignants) désignent la même option. Je propose un rapprochement automatique quand un nom commence par l'autre, présenté pour confirmation avant l'import. Cela vous convient-il ?

Réponse (20 novembre) : oui.

**P2. Groupes inconnus.** Que sont « 3AEIJO-ASSEC » (6 élèves par classe) et « BAPTÊME » (3 élèves) ? Je propose d'ignorer tout groupe qui ne correspond à aucune matière de l'export des enseignants, demi-groupes G1/G2 compris.

Réponse (20 novembre) : groupes inconnus ignorés.

**P3. Histoire-géographie en breton : faut-il être exact ?** En 3 E, les bilingues ont M. JC et pas Mme MP.

- **A — exacte, recommandée** : à l'import, l'application repère qu'une discipline de classe entière est partagée entre deux enseignants, dont l'un a exactement l'effectif d'une option (M. JC : 4 = Breton). Elle propose : « M. JC reçoit les élèves de Breton, Mme MP les autres ». Il faut alors un type d'enseignement de plus, « classe entière sauf une option ».
- **B — simple** : M. JC est rattaché à l'option Breton, Mme MP reste « classe entière ». Elle pourrait alors recevoir un bilingue qu'elle n'a pas en cours.

Réponse (20 novembre) : solution A (exacte).

**P4. Élèves ULIS.** La colonne Formation les signale (« 3EME ULIS », 3 élèves). La colonne « Projet d'accompagnement » ne sera pas lue. Cette source vous convient-elle (voir aussi E4) ?

Réponse (20 novembre) : oui, la colonne Formation.

**P5. Écarts entre les deux exports** (3 A et 3 E en espagnol, l'élève germaniste de 3 J). S'agit-il d'élèves suivis autrement (CNED, ULIS, dispense) ? Je propose de prendre « Toutes les options » comme référence pour la LVB de l'élève. Un contrôle signalerait ensuite l'élève dont la LVB n'a pas d'enseignant dans sa classe : l'élève de 3 J, avec seulement l'équipe de sa classe.

Réponse (20 novembre) : oui, « Toutes les options » fait référence, avec le contrôle proposé.

**P6. Groupe réunissant deux niveaux** (« 3AE4M-ALL »). Les niveaux restent indépendants : en 3e, Mme EM fait partie de l'équipe des germanistes de 3 A et 3 E ; en 4e, de ceux de 4 M. Rien de plus à faire, d'accord ?

Réponse (20 novembre) : d'accord.

**P7. Prénom d'usage.** Vide dans cet export. Faut-il l'utiliser à la place du prénom quand il est rempli ? Recommandé : oui (convocations).

Réponse (20 novembre) : oui, le prénom d'usage remplace le prénom quand il est rempli.

**P8. Un export par niveau, ou un seul pour le collège ?** Ce fichier ne contient que la 3e. Avec l'import unique proposé en E7, un export de tous les élèves serait réparti entre les niveaux de la même façon. Lequel ferez-vous ?

Réponse (20 novembre) : un export des élèves par niveau.

**P9. Colonnes sensibles.** Pouvez-vous retirer de l'export Pronote les colonnes Né(e) le, Sexe, Projet d'accompagnement, Allergies et Majeur ? Si ce n'est pas possible, l'application les ignorera de toute façon.

Réponse (20 novembre) : oui, les colonnes sensibles seront retirées de l'export.

## 3. Vérification avec l'export des élèves de 6e

Export anonymisé du niveau 6e : 139 élèves (6 C, 6 G, 6 M, 6 N : 28 ; 6 T : 27), mêmes colonnes que l'export de 3e. Les effectifs des classes sont ceux de l'export des enseignants.

- **Options** : en 6e, seuls 2 élèves de 6 G ont une option utile (BRETON REG.), avec HISTOIRE-GEOGRAPHIE et ENS. MORAL & CIVIQUE. ANGLAIS + (24) et MATHS + (18) n'apparaissent que dans les groupes (« 6-ANG+ », « 6-MATHS+ ») et sont ignorés.
- **Breton** : Mme KF a un effectif de 7 en 6 G parce que son groupe réunit 6 G et 5 P (« 6G-5P-BZH » : 2 + 5). L'appartenance à l'option se lit donc côté élèves, jamais dans l'effectif de l'enseignant.
- **Histoire-géographie en breton (6 G)** : 2 élèves l'ont en option, M. JC a 2 élèves, Mme MH 26 = les autres. La règle du partage s'applique sans ambiguïté.
- **Prénom d'usage** : rempli pour 7 élèves (P7).
- **Homonymes** : deux paires d'élèves de 6 G ont les mêmes nom, prénom et classe (initiales de l'anonymisation), mais sont bien des élèves différents. D'où la règle 6 de l'import des élèves.
- **Colonnes sensibles** : encore présentes dans cet export (P9).

**Résultat de la simulation des règles sur la 6e** (enseignants rattachés à chaque classe) :

| Classe | Classe entière | Option ou partage | Non rattachés |
| ------ | -------------- | ----------------- | ------------- |
| 6 C | 9 (dont M. MC, PP) | — | Mme LF (devoirs faits), M. AMo (anglais +), Mme EMN (maths +) |
| 6 G | 10 (dont Mme DRD, PP) | Mme KF : Breton ; M. JC : HG pour les 2 bilingues ; Mme MH : HG pour les 26 autres | Mme LJ (devoirs faits), Mme EMN (maths +) |
| 6 M | 9 (dont Mme BBo, PP) | — | Mme EMN (maths +) |
| 6 N | 9 (dont Mme EC, PP) | — | Mme ACJ (devoirs faits), M. AMo (anglais +), Mme EMN (maths +) |
| 6 T | 10 (dont M. AMo, PP) | — | Mme LF (devoirs faits), Mme EMN (maths +) |

Aucune matière inconnue en 6e.
