# Cahier des charges — Rencontres parents-professeurs 6ème

Version 2 — 13 novembre 2026 — validée

## 1. Contexte et objectif

Chaque famille d'élève de 6ème est reçue une fois dans la soirée, pendant 15 minutes, par un binôme de deux professeurs de l'équipe pédagogique de la classe.

L'application sert à l'organisateur pour préparer cette soirée : former les binômes, répartir les élèves, produire le planning et les documents à distribuer.

## 2. Périmètre et choix techniques

| Sujet | Décision |
|---|---|
| Utilisateur | Un seul organisateur, sur un seul poste |
| Forme | Application web sans serveur : un fichier HTML ouvert dans le navigateur, utilisable hors ligne |
| Stockage | Local au navigateur, enregistrement automatique |
| Sauvegarde | Export et import d'un fichier de projet (JSON) pour sauvegarder ou changer de poste |
| Données personnelles | Aucune donnée d'élève n'est envoyée en ligne |
| Diffusion aux professeurs et familles | Documents imprimés ou PDF, pas d'accès en ligne |

Hors périmètre : prise de rendez-vous en ligne par les familles, envoi de courriels ou SMS, connexion directe à Pronote ou à l'ENT, comptes utilisateurs.

## 3. Données et règles de gestion

### 3.1 Données

- **Classe** : nom (6A, 6B…), liste d'élèves, équipe pédagogique.
- **Élève** : nom, prénom, classe ; en option fratrie et contrainte horaire de la famille.
- **Professeur** : nom, discipline, classes dans lesquelles il enseigne ; en option indisponibilités.
- **Binôme** : deux professeurs, une salle, une ou deux classes couvertes.
- **Soirée** : date, heure de début, heure de fin, durée d'un rendez-vous, pauses éventuelles.
- **Rendez-vous** : un élève, un binôme, un créneau.

### 3.2 Règles

| N° | Règle |
|---|---|
| R1 | Un élève a exactement un rendez-vous, avec un seul binôme. |
| R2 | Les deux professeurs d'un binôme enseignent dans la classe de chaque élève qu'ils reçoivent. |
| R3 | Un binôme ne reçoit qu'une famille par créneau. |
| R4 | Un professeur n'appartient qu'à un seul binôme pendant la soirée. |
| R5 | **Binôme glissant** : un binôme peut recevoir des élèves de deux classes si ses deux professeurs enseignent dans les deux classes. |
| R6 | Le nombre de créneaux est calculé : (heure de fin − heure de début − pauses) ÷ durée du rendez-vous. |
| R7 | Un rendez-vous respecte les indisponibilités des professeurs du binôme et de la famille. |
| R8 | Les élèves d'une même fratrie sont placés sur des créneaux consécutifs ou proches, sans chevauchement. |
| R9 | Une salle n'est attribuée qu'à un seul binôme. |

Les règles R1, R3 et R9 sont bloquantes. Les autres produisent un avertissement que l'organisateur peut choisir d'ignorer (par exemple un binôme dont un professeur n'a pas la classe).

## 4. Exigences fonctionnelles

### 4.1 Paramètres de la soirée

- F1. Saisir la date, l'heure de début et l'heure de fin.
- F2. Choisir la durée d'un rendez-vous (15 minutes par défaut, modifiable).
- F3. Ajouter des pauses communes (heure et durée).
- F4. Afficher en direct le nombre de créneaux par binôme et la capacité totale, comparée au nombre d'élèves.

### 4.2 Saisie des données

- F5. Importer les élèves depuis un fichier CSV ou Excel (colonnes Nom, Prénom, Classe), avec choix de la correspondance des colonnes.
- F6. Importer les professeurs et leurs classes depuis un fichier, ou les coller en liste.
- F7. Ajouter, modifier et supprimer à la main classes, élèves et professeurs.
- F8. Déclarer les fratries et les contraintes horaires (« pas avant 18 h », « pas après 19 h »).

### 4.3 Binômes de professeurs

- F10. Proposer automatiquement les binômes en tenant compte à la fois des classes de chaque professeur, du nombre d'élèves à recevoir, du nombre de créneaux de la soirée et des indisponibilités, en recherchant les regroupements (binômes glissants compris) qui ne laissent aucun élève sans rendez-vous. Si c'est impossible, indiquer les classes concernées et le nombre de créneaux manquants. Deux objectifs au choix : mobiliser tous les professeurs ou former le moins de binômes possible.
- F11. Créer, modifier et dissoudre un binôme à la main.
- F12. Marquer un binôme comme glissant et choisir ses deux classes ; l'application propose les binômes glissants possibles.
- F13. Attribuer une salle à chaque binôme.
- F13 bis. Conserver un binôme : un binôme composé à la main, ou marqué « Conservé », est gardé lors d'une nouvelle proposition automatique, qui complète le reste.
- F14. Signaler les professeurs sans binôme et les binômes non conformes à R2.

### 4.4 Répartition des élèves

- F15. Répartir automatiquement les élèves entre les binômes de leur classe, dans la limite de la capacité, de sorte que tous les binômes du niveau reçoivent à peu près le même nombre d'élèves (écart de 1 ou 2). Un binôme dont un professeur n'est présent qu'une partie de la soirée peut en recevoir moins. Un avertissement signale tout écart supérieur à 2.
- F16. Déplacer un élève d'un binôme à un autre par glisser-déposer.
- F17. Afficher pour chaque binôme le nombre d'élèves reçus et les créneaux restants.
- F18. Lister les élèves non affectés.

### 4.5 Planning

- F19. Générer automatiquement les horaires en respectant les règles de la section 3.2.
- F20. Vue générale : grille créneaux × binômes pour tout le niveau.
- F21. Vue par classe : liste des élèves avec heure, binôme et salle.
- F22. Vue par binôme : succession des rendez-vous de la soirée.
- F23. Déplacer ou échanger deux rendez-vous à la main dans la grille.
- F24. Verrouiller un rendez-vous pour qu'un recalcul ne le modifie pas.
- F25. Afficher en permanence la liste des conflits et avertissements.

### 4.6 Documents

- F26. Imprimer ou enregistrer en PDF chacune des trois vues.
- F29. Convocations aux familles : un coupon par élève avec date, heure, salle et noms des professeurs, plusieurs coupons par page A4.
- F30. Export du planning en CSV, et en Excel (.xlsx) depuis la vue Planning : une feuille pour le planning général, une par classe, une par binôme.

## 5. Écrans

1. **Soirée** : horaires, durée, pauses, capacité.
2. **Données** : classes, élèves, professeurs, imports.
3. **Binômes** : composition, binômes glissants, salles.
4. **Répartition** : élèves par binôme, glisser-déposer.
5. **Planning** : trois vues, ajustements, conflits.
6. **Documents** : impressions et exports.

Un indicateur d'avancement signale à chaque étape ce qui reste à faire (élèves non affectés, conflits ouverts).

## 6. Proposition automatique

- **Binômes** : pour chaque classe, nombre de binômes nécessaires = élèves ÷ créneaux, arrondi au supérieur. Les professeurs sont appariés en priorité au sein de l'équipe de la classe. Quand une classe a une capacité excédentaire et une autre un manque, un binôme glissant est proposé entre les deux.
- **Élèves** : répartition équilibrée entre les binômes de la classe ; les binômes glissants reçoivent le complément de chacune de leurs deux classes.
- **Horaires** : placement d'abord des fratries et des familles contraintes, puis des autres élèves par ordre alphabétique, toutes classes confondues pour un binôme glissant.
- Tout résultat automatique reste modifiable ; un recalcul ne touche pas aux éléments verrouillés.

## 7. Hypothèses validées (13 novembre 2026)

| N° | Décision |
|---|---|
| H1 | Un professeur appartient à un seul binôme toute la soirée (R4). |
| H2 | Un binôme glissant couvre au plus deux classes. |
| H3 | Pour un binôme glissant, les élèves des deux classes alternent librement. |
| H4 | L'élève est reçu une seule fois, par un seul binôme. |
| H5 | Une seule soirée pour tout le niveau. |
| H6 | Pas de battement entre deux rendez-vous. |
| H7 | Le professeur principal n'a pas de rôle particulier dans la formation des binômes. |
| H8 | Import CSV et Excel (.xlsx, sans connexion internet) ; les colonnes ne sont pas figées : l'organisateur associe chaque colonne du fichier à une information au moment de l'import. Les formats .xls et .ods sont à réenregistrer en .xlsx. |

## 8. Critères de réussite

- Préparer une soirée complète pour 6 classes de 28 élèves en moins de 30 minutes à partir des fichiers d'import.
- Aucun élève sans rendez-vous et aucun conflit bloquant dans le planning final.
- Tous les documents sont lisibles en impression A4 noir et blanc.

## 9. Accessibilité

- Toutes les fonctions sont utilisables au clavier, y compris le déplacement des élèves (sélection, puis « Placer ici »).
- Conformité visée : WCAG 2.1 niveau AA, en thème clair et sombre.
- L'état de la sauvegarde est affiché en permanence dans l'en-tête.
