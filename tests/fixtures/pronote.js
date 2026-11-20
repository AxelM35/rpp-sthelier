// Exports Pronote fictifs (aucune donnée réelle), de même structure que les exports bruts d'un collège :
//   - enseignants : Ressources → Classes → Équipe pédagogique, « Cumuler par classe » (un bloc par classe) ;
//   - élèves de 4e : Ressources → Élèves → Liste (une ligne par élève, colonnes sensibles comprises).
// Ils reproduisent les cas relevés dans les vrais exports (docs/import-pronote.md) :
//   histoire-géographie partagée en 4 A (M. HAMEL a les 2 bilingues), enseignante écartée (« Suivi Inclusion »),
//   « service de notation actif » sans effectif, ligne « DEVOIRS FAITS » seule, matière inconnue (ROBOTIQUE),
//   options ignorées (O2, LLC ANGLAIS), LVB, breton, latin, athlétisme, élèves ULIS (4 A : l'enseignant d'espagnol
//   ne les a pas), professeure principale qui n'enseigne que l'espagnol (4 C), une classe d'un autre niveau.

const NOTATION = 'Cet enseignant a un service de notation actif avec la classe ou la partie';

/** Lignes d'un bloc de classe : [civilité, nom, matières, PP, effectif]. */
const CLASSES = {
  '4 A': [
    ['Mme', 'FOURNIER Anne', 'FRANCAIS, VIE DE CLASSE', 'X', 26],
    ['M.', 'MORIN Paul', 'MATHEMATIQUES', '', 26],
    ['Mme', 'HERVE Lise', 'HISTOIRE-GEOGRAPHIE, ENS. MORAL & CIVIQUE', '', 24],
    ['M.', 'HAMEL Yann', 'HISTOIRE-GEOGRAPHIE, ENS. MORAL & CIVIQUE', '', 2],
    ['Mme', 'SIMON Rose', 'SCIENCES VIE & TERRE, O2', '', 26],
    ['M.', 'PERRIN Luc', 'PHYSIQUE-CHIMIE', '', 26],
    ['Mme', 'TEXIER Eve', 'TECHNOLOGIE', '', 26],
    ['M.', 'ARNAUD Jean', 'ARTS PLASTIQUES', '', 26],
    ['Mme', 'MULLER Iris', 'EDUCATION MUSICALE', '', null],
    ['M.', 'ETIENNE Marc', 'ED.PHYSIQUE & SPORT.', '', 26],
    ['Mme', 'NICOLAS Lea', 'ANGLAIS LV1, LLC ANGLAIS', '', 26],
    ['M.', 'ESTEVE Hugo', 'ESPAGNOL LV2', '', 21],
    ['Mme', 'ALBRECHT Eva', 'ALLEMAND LV2', '', 3],
    ['Mme', 'BREHAT Mael', 'BRETON', '', 2],
    ['Mme', 'GUERIN Ada', 'FRANCAIS, MATHEMATIQUES, Suivi Inclusion', '', 2],
    ['Mme', 'LEROUX Zoe', 'DEVOIRS FAITS', '', 8],
    ['M.', 'COSTE Noe', 'ROBOTIQUE', '', 10],
  ],
  '4 B': [
    ['Mme', 'FOURNIER Anne', 'FRANCAIS', '', 24],
    ['Mme', 'MEUNIER Clara', 'MATHEMATIQUES, VIE DE CLASSE', 'X', 24],
    ['Mme', 'HERVE Lise', 'HISTOIRE-GEOGRAPHIE, ENS. MORAL & CIVIQUE', '', 24],
    ['Mme', 'SIMON Rose', 'SCIENCES VIE & TERRE', '', 24],
    ['M.', 'PERRIN Luc', 'PHYSIQUE-CHIMIE', '', 24],
    ['Mme', 'TEXIER Eve', 'TECHNOLOGIE', '', 24],
    ['M.', 'ARNAUD Jean', 'ARTS PLASTIQUES', '', 24],
    ['Mme', 'MULLER Iris', 'EDUCATION MUSICALE', '', null],
    ['M.', 'ETIENNE Marc', 'ED.PHYSIQUE & SPORT., ATHLETISME', '', 24],
    ['Mme', 'NICOLAS Lea', 'ANGLAIS LV1', '', 24],
    ['M.', 'ESTEVE Hugo', 'ESPAGNOL LV2', '', 24],
    ['M.', 'ATHANE Tom', 'ATHLETISME', '', 8],
    ['M.', 'LACAZE Felix', 'LCA LATIN', '', 5],
    ['Mme', 'GUERIN Ada', 'FRANCAIS', '', 1],
    ['M.', 'COSTE Noe', 'ROBOTIQUE', '', 24],
  ],
  '4 C': [
    ['M.', 'FERRY Remi', 'FRANCAIS', '', 25],
    ['Mme', 'MEUNIER Clara', 'MATHEMATIQUES', '', 25],
    ['M.', 'HUET Paul', 'HISTOIRE-GEOGRAPHIE, ENS. MORAL & CIVIQUE', '', 25],
    ['M.', 'SABATIER Jules', 'SCIENCES VIE & TERRE', '', 25],
    ['M.', 'PERRIN Luc', 'PHYSIQUE-CHIMIE', '', 25],
    ['Mme', 'TEXIER Eve', 'TECHNOLOGIE', '', 25],
    ['M.', 'ARNAUD Jean', 'ARTS PLASTIQUES', '', 25],
    ['Mme', 'MULLER Iris', 'EDUCATION MUSICALE', '', null],
    ['Mme', 'ESNAULT Lou', 'ED.PHYSIQUE & SPORT.', '', 25],
    ['M.', 'NOBLET Axel', 'ANGLAIS LV1', '', 25],
    ['Mme', 'ESPINASSE Ines', 'ESPAGNOL LV2, VIE DE CLASSE', 'X', 25],
    ['M.', 'LACAZE Felix', 'LCA LATIN', '', 6],
  ],
  '5 A': [
    ['Mme', 'VALLEE Nora', 'MATHEMATIQUES, VIE DE CLASSE', 'X', 28],
    ['M.', 'ESTEVE Hugo', 'ESPAGNOL LV2', '', 22],
  ],
};

/** Export Pronote des équipes pédagogiques (toutes les classes du collège). */
export function exportEnseignants() {
  const lignes = [['Civilité', 'Nom', 'Matière/Fonction', 'Professeur principal', 'Heures enseignées', 'Effectif']];
  for (const [classe, profs] of Object.entries(CLASSES)) {
    lignes.push(Array(6).fill(classe));
    lignes.push(Array(6).fill(profs.length + 1 + ' professeurs'));
    profs.forEach(([civilite, nom, matieres, pp, effectif]) =>
      lignes.push([civilite, nom, matieres, pp, effectif == null ? NOTATION : '1h00', effectif == null ? '' : String(effectif)]),
    );
  }
  return lignes;
}

const NOMS = ['ADAM', 'BODIN', 'CARON', 'DENIS', 'FABRE', 'GAUTHIER', 'HUBERT', 'JACOB', 'KLEIN', 'LAMBERT', 'MARCHAND', 'NOEL', 'OGER'];
const PRENOMS = ['Alix', 'Basile', 'Celeste', 'Dorian', 'Elsa', 'Felix', 'Gaia', 'Hugo', 'Ines', 'Jules', 'Lina', 'Malo', 'Nina'];

/** Profil d'un élève : [formation, options, groupes]. */
function profil(classe, j) {
  const options = ['ANGLAIS LV1'];
  let formation = '4EME';
  let lvb = 'ESPAGNOL LV2';
  const groupes = [classe.replace(' ', '') + '-G' + (1 + (j % 2))];
  if (classe === '4 A') {
    if (j <= 2) lvb = 'ALLEMAND LV2';
    if (j === 3 || j === 4) {
      formation = '4EME BILINGUE';
      options.push('BRETON REG.', 'HISTOIRE-GEOGRAPHIE', 'ENS. MORAL & CIVIQUE');
      groupes.push('4A-HGBZH');
    }
    if (j === 5 || j === 6) formation = '4 EME ULIS';
    if (j % 4 === 0) options.push('LLC ANGLAIS');
  }
  if (classe === '4 B') {
    if (j % 3 === 0) {
      formation = '4EME SECTION SPORTIVE';
      options.push('ATHLETISME');
    }
    if (j % 5 === 0) options.push('LCA LATIN');
    if (j === 1) groupes.push('4ABC-O2');
  }
  if (classe === '4 C') {
    if (j === 0) {
      formation = '4EME ULIS';
      lvb = null;
    }
    if (j === 2) lvb = 'CHINOIS LV2';
    if (j % 4 === 1) options.push('LCA LATIN');
  }
  if (lvb) options.push(lvb);
  return [formation, options.sort().join(', '), groupes.join(', ')];
}

/** Export Pronote des élèves de 4e (plus un élève de 5e, à ignorer), avec les colonnes sensibles d'un export brut. */
export function exportEleves4e() {
  const lignes = [
    [
      'Nom',
      'Prénom',
      'Né(e) le',
      'Sexe',
      "Prénom d'usage",
      'Classe',
      "Projet d'accompagnement",
      'Allergies',
      'Majeur',
      'Formation',
      'Groupes',
      'Toutes les options',
    ],
  ];
  let i = 0;
  for (const [classe, effectif] of [
    ['4 A', 26],
    ['4 B', 24],
    ['4 C', 25],
  ]) {
    for (let j = 0; j < effectif; j++, i++) {
      const [formation, options, groupes] = profil(classe, j);
      lignes.push([
        NOMS[i % NOMS.length] + ' ' + i,
        PRENOMS[(i * 3) % PRENOMS.length],
        '01/01/2012',
        i % 2 ? 'Masculin' : 'Féminin',
        i === 7 ? 'Prénom-usage' : '',
        classe,
        i % 9 === 0 ? 'PAP' : '',
        '',
        '',
        formation,
        groupes,
        options,
      ]);
    }
  }
  lignes.push(['ZED 99', 'Autre', '01/01/2013', 'Féminin', '', '5 A', '', '', '', '5EME', '', 'ANGLAIS LV1, ESPAGNOL LV2']);
  return lignes;
}
