# Fiche de traitement — Rencontres parents-professeurs (6e à 3e)

Projet de fiche pour le registre des activités de traitement de l'établissement. **À relire et compléter avec le délégué à la protection des données (DPO)**. Les champs entre crochets sont propres à l'établissement.

## Identification

| Rubrique                  | Contenu                                                                                                                                                                                                         |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Responsable du traitement | [Chef d'établissement, nom du collège]                                                                                                                                                                          |
| Délégué à la protection   | [DPO académique : coordonnées]                                                                                                                                                                                  |
| Utilisateur de l'outil    | [Organisateur de la soirée, par exemple le CPE ou un professeur principal]                                                                                                                                      |
| Finalité                  | Organiser la soirée de rencontres parents-professeurs de chaque niveau du collège (6e à 3e) : constituer les binômes d'enseignants, attribuer un rendez-vous de 15 minutes à chaque famille, produire les plannings et les convocations. |
| Base légale proposée      | Mission d'intérêt public (article 6.1.e du RGPD) : suivi de la scolarité et relations avec les familles. À confirmer par le DPO.                                                                                |

## Données traitées

| Personnes concernées | Données                                                                                              |
| -------------------- | ---------------------------------------------------------------------------------------------------- |
| Élèves (6e à 3e)     | Nom, prénom (ou prénom d'usage), classe ; LVB et options suivies ; scolarisation en ULIS (oui ou non) ; code de fratrie (facultatif) ; contraintes horaires de la famille (facultatif) |
| Enseignants          | Civilité et nom, discipline, enseignements (classes, LVB, options) avec leur effectif ; professeur principal ; heures d'arrivée tardive ou de départ anticipé (facultatif) |

**Indication ULIS : donnée sensible.** Savoir qu'un élève est scolarisé en ULIS révèle une situation de handicap, donnée concernant la santé au sens de l'article 9 du RGPD. Elle est nécessaire au traitement : certains enseignements (une LVB) ne sont pas suivis par les élèves ULIS, et l'élève ne doit être reçu que par des enseignants qui l'ont en cours. Mesures propres à cette donnée :

- une simple case oui / non, sans précision (ni type de dispositif, ni motif) ;
- elle n'apparaît dans aucun document imprimé ni dans aucun export Excel ou CSV : seulement à l'écran (liste des élèves) et dans le fichier de sauvegarde ;
- elle est effacée avec les autres données (effacement d'un niveau ou de tous les niveaux).

Aucune autre donnée sensible, aucune appréciation scolaire et aucune coordonnée des familles ne sont traitées. L'application invite à ne rien saisir d'autre.

**Exports Pronote.** L'export des élèves contient des colonnes sensibles (date de naissance, sexe, projet d'accompagnement avec des informations médicales, allergies). L'application ne les lit pas et n'en enregistre rien ; elle les nomme à l'import et invite à les retirer de l'export dans Pronote. Seules sont lues les colonnes Nom, Prénom, Prénom d'usage, Classe, Formation (pour l'ULIS) et Toutes les options.

## Destinataires

- L'organisateur de la soirée, seul utilisateur de l'outil.
- Les enseignants : planning de leur binôme (document imprimé ou fichier).
- Chaque famille : sa propre convocation (date, heure, salle, noms des enseignants).

Aucun transfert hors de l'Union européenne, aucun sous-traitant : l'application ne communique avec aucun serveur.

## Durée de conservation

- **Dans le navigateur** : jusqu'à la soirée, puis effacement au plus tard **30 jours après** (valeur à valider ; réglable dans `src/config.js`, `CONSERVATION_JOURS`). Ce délai laisse le temps de reprogrammer un rendez-vous manqué.
- **Fichiers exportés et documents imprimés** : même durée. Leur suppression relève de l'utilisateur ; l'application le rappelle à chaque téléchargement.

## Mesures de sécurité

| Mesure                       | Mise en œuvre                                                                                                                                                                                                                              |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Aucune transmission          | Application en un fichier HTML autonome, sans serveur, sans bibliothèque chargée depuis internet, sans traceur.                                                                                                                            |
| Minimisation                 | Seules les données nécessaires à l'organisation sont demandées (voir ci-dessus).                                                                                                                                                           |
| Information de l'utilisateur | Encadré « Données personnelles » dans l'onglet Soirée : lieu de stockage, données, fichiers, durée.                                                                                                                                        |
| Effacement                   | Rappel sur tous les onglets dès le lendemain de la soirée, renforcé après 30 jours. Chaque niveau est enregistré séparément. « Effacer définitivement » supprime les données d'un niveau (onglet Soirée ou carte de l'accueil), ou de tous les niveaux (accueil), avec l'historique d'annulation et les copies internes, sans retour possible. |
| Intégrité                    | Toute sauvegarde ouverte est entièrement contrôlée ; un fichier piégé est refusé.                                                                                                                                                          |
| Fichiers                     | Message à chaque téléchargement : le fichier contient des données personnelles et doit être rangé dans un espace protégé.                                                                                                                  |

**Limites à connaître.** Les données sont stockées en clair dans le navigateur. Toute personne qui utilise le même poste avec la même session peut les consulter. Il faut donc :

- utiliser un poste et une session professionnels personnels ;
- ou effacer les données après chaque séance de travail, en gardant une sauvegarde dans un espace protégé.

## Droits des personnes

Les familles sont informées du traitement selon les modalités habituelles de l'établissement [mention dans le courrier d'invitation ou le règlement intérieur]. Les droits d'accès et de rectification s'exercent auprès du chef d'établissement. La rectification d'un nom ou d'un horaire se fait directement dans l'application (onglet Données ou Planning).

## Points à trancher avec le DPO

1. Base légale et mention d'information des familles.
2. Durée de conservation (30 jours proposés).
3. Inscription au registre de l'établissement.
4. Nécessité ou non d'une analyse d'impact : traitement limité, sans profilage, mais concernant des mineurs et comprenant une donnée sensible (indication ULIS).
6. Indication ULIS : confirmer qu'elle peut être traitée dans cet outil (mission d'intérêt public, article 9.2.g du RGPD à vérifier), avec les mesures ci-dessus.
7. Exports Pronote : rappeler aux utilisateurs de retirer les colonnes sensibles de l'export et de supprimer le fichier exporté après l'import.
5. Postes autorisés à utiliser l'outil (poste partagé de salle des professeurs ou poste personnel professionnel).
