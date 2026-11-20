# Lot 3 — Questions de conception (tranchées le 20 novembre 2026)

Questions posées le 19 novembre 2026, avant de commencer le lot 3 (LVB, options, enseignements et équipe de l'élève). Le détail des règles est dans le [cahier des charges v2](cahier-des-charges-v2.md).

Pour répondre, compléter les lignes « Réponse » (ou répondre dans la conversation).

## Ce que le lot 3 change au fond

Aujourd'hui, tout le calcul raisonne **par classe** : on compte les élèves à placer dans chaque classe, et un binôme peut recevoir une classe si ses deux professeurs y enseignent.

Avec l'équipe propre à chaque élève, le calcul raisonnera **par groupe d'élèves de même profil** (même classe, même LVB, mêmes options). Un binôme pourra recevoir un groupe si ses deux enseignants appartiennent à l'équipe de ce groupe. Ce changement s'intègre bien au calcul existant.

Déjà décidé, sans question :

- les données passent en version 3 : chaque classe cochée d'un enseignant devient « classe entière » ;
- les listes de LVB et d'options sont propres à chaque niveau, avec les valeurs par défaut du cahier des charges ;
- les contrôles de la section 6.3 du cahier des charges sont ajoutés ;
- le tableau de couverture détaille les groupes de LVB et d'options (V2-F7) ;
- la désignation du professeur principal reste pour le lot 4, avec les élèves prioritaires.

## 1. Fichiers d'import — traitée en premier

L'import doit reconnaître la LVB et les options des élèves, ainsi que le type d'enseignement des professeurs (V2-F3, V2-F5). Il faut connaître les en-têtes de colonnes et 2 ou 3 lignes **anonymisées** des fichiers réels : export Pronote des élèves (LVB, options), liste des enseignants avec leurs classes. Le but est de savoir comment s'écrivent les valeurs (« ESPAGNOL LV2 », « LV2 Espagnol », « Esp »…) et si la LVB et les options sont dans des colonnes séparées.

À défaut : reconnaissance sans tenir compte des majuscules ni des accents, avec le mot contenu (« ESPAGNOL LV2 » → Espagnol) ; une valeur inconnue est signalée avant l'import.

Réponse : traitée à part, voir [Import des exports Pronote](import-pronote.md).

## 2. Plusieurs enseignants de la même LVB dans une classe

Peut-il y avoir deux professeurs d'espagnol en 5A, chacun avec une partie des élèves ?

*Éclairage des exports Pronote (20 novembre) : aucun cas pour les LVB ; un seul enseignant par LVB et par classe. Le partage existe en histoire-géographie (cours en breton) et sera traité exactement (voir [import-pronote.md](import-pronote.md), P3).*

- **A — recommandée si le cas est rare ou inexistant** : un seul enseignant par LVB et par classe. S'il y en a deux, les deux sont comptés dans l'équipe de tous les hispanisants de 5A, et un avertissement le signale.
- **B** : groupes explicites, chaque élève est rattaché à son groupe (« Espagnol 1 », « Espagnol 2 »). Règle exacte, mais saisie et import plus lourds.

Réponse (20 novembre) : d'accord — pas de groupes explicites ; si deux enseignants d'une même LVB interviennent dans une classe, les deux comptent pour tous ses élèves, avec un avertissement.

## 3. Un enseignant peut-il avoir des types différents selon les classes ?

Exemple : un professeur de lettres classiques enseigne le français en 5A (classe entière) et le latin en 5B et 5C (option).

*Éclairage des exports Pronote (20 novembre) : le cas existe bien. Mme AYO a FRANCAIS et LCA LATIN en 3 I, seulement LCA LATIN en 3 J, 4 C et 4 M ; Mme KF a BRETON en 3 E, 4 B, 5 P et 6 G, et FRANCAIS en 4 G. L'import déduira le type classe par classe.*

- **Oui — recommandé, le cas est courant** : chaque classe cochée porte son type. À l'écran, un réglage « Enseigne en tant que » par professeur (classe entière, Espagnol, Latin…) s'applique à toutes ses classes ; un détail par classe permet de régler les exceptions.
- **Non** : un seul type par enseignant, saisie plus simple.

Réponse (20 novembre) : d'accord — type par classe, déduit à l'import ; à la main, puce de la classe indiquant le type (« 3 J · Latin »), un clic ouvre le choix.

## 4. Les enseignants de LVB et d'options dans les binômes

Exemple : le binôme « allemand + mathématiques de 5A » ne peut recevoir que les germanistes de 5A, peut-être 7 élèves pour 12 créneaux.

- **4a.** L'écart visé (2 élèves au plus entre binômes) ne pourra pas être tenu pour un tel binôme. Faut-il l'exclure du calcul de l'écart, comme un binôme dont un professeur part plus tôt, avec la mention « limité aux germanistes » ? **Recommandé : oui.**
- **4b.** Faut-il former de tels binômes ? **Recommandé :**
  - en mode « mobiliser tous les professeurs » : oui, ils soulagent les autres binômes ;
  - en mode « le moins de binômes possible » : seulement s'ils sont nécessaires pour placer tous les élèves.
- **4c.** Un binôme de deux enseignants de LVB ou d'options (espagnol + latin) ne recevrait que les élèves qui suivent les deux. **Recommandé : jamais formé par la proposition automatique** ; possible à la main, avec un avertissement.

Réponse 4a (20 novembre) : oui.

Réponse 4b (20 novembre) : d'accord.

Réponse 4c (20 novembre) : d'accord ; jamais deux options différentes, permis pour une même option.

## 5. Où saisir les listes de LVB et d'options du niveau ?

Le cahier des charges (V2-F1) les place dans l'onglet Soirée. **Recommandé : l'onglet Données**, dans une carte « Langues et options » au-dessus des classes, là où elles servent. La durée des rendez-vous reste dans l'onglet Soirée.

Réponse (20 novembre) : d'accord — onglet Données, carte « Langues et options ».

## 6. Élève de 5e à 3e sans LVB

Faut-il le signaler ?

- **Recommandé : une simple information**, qui ne compte pas parmi les points à corriger (certains élèves peuvent légitimement ne pas en avoir).
- Alternative : un avertissement.

Réponse (20 novembre) : d'accord — rien pour un élève ULIS ; simple information pour les autres.
