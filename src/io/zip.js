// Archives ZIP minimales : écriture sans compression, lecture avec décompression native.
// Suffisant pour les classeurs Excel (.xlsx), qui sont des archives ZIP de fichiers XML.

let tableCRC = null;
function crc32(octets) {
  if (!tableCRC) {
    tableCRC = Array.from({ length: 256 }, (_, n) => {
      for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
      return n >>> 0;
    });
  }
  let c = ~0;
  for (let i = 0; i < octets.length; i++) c = tableCRC[(c ^ octets[i]) & 255] ^ (c >>> 8);
  return ~c >>> 0;
}

const u16 = (n) => [n & 255, (n >>> 8) & 255];
const u32 = (n) => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255];

/** fichiers : [[chemin, texte]] → archive ZIP (Uint8Array), sans compression. */
export function creerZip(fichiers) {
  const enc = new TextEncoder();
  const morceaux = [];
  const central = [];
  let decalage = 0;
  for (const [nom, texte] of fichiers) {
    const n = enc.encode(nom);
    const d = enc.encode(texte);
    // version, drapeaux (UTF-8), méthode 0, heure, date, CRC, tailles, longueur du nom, extra
    const commun = [
      ...u16(20),
      ...u16(0x800),
      ...u16(0),
      ...u16(0),
      ...u16(0x21),
      ...u32(crc32(d)),
      ...u32(d.length),
      ...u32(d.length),
      ...u16(n.length),
      ...u16(0),
    ];
    const local = new Uint8Array([0x50, 0x4b, 3, 4, ...commun]);
    morceaux.push(local, n, d);
    central.push(
      new Uint8Array([0x50, 0x4b, 1, 2, ...u16(20), ...commun, ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(decalage)]),
      n,
    );
    decalage += local.length + n.length + d.length;
  }
  const tailleCentral = central.reduce((a, x) => a + x.length, 0);
  const fin = new Uint8Array([
    0x50,
    0x4b,
    5,
    6,
    ...u16(0),
    ...u16(0),
    ...u16(fichiers.length),
    ...u16(fichiers.length),
    ...u32(tailleCentral),
    ...u32(decalage),
    ...u16(0),
  ]);
  const parties = [...morceaux, ...central, fin];
  const sortie = new Uint8Array(parties.reduce((a, x) => a + x.length, 0));
  let p = 0;
  for (const x of parties) {
    sortie.set(x, p);
    p += x.length;
  }
  return sortie;
}

/**
 * Ouvre une archive ZIP (ArrayBuffer ou Uint8Array).
 * Renvoie { noms, lire(nom) → Promise<string|null> } ; lève une erreur si l'archive est invalide.
 */
export function ouvrirZip(donnees) {
  const u = donnees instanceof Uint8Array ? donnees : new Uint8Array(donnees);
  const dv = new DataView(u.buffer, u.byteOffset, u.byteLength);
  const dec = new TextDecoder();
  const invalide = () => {
    throw new Error('archive ZIP invalide');
  };
  let fin = -1;
  for (let i = u.length - 22; i >= Math.max(0, u.length - 65558); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) {
      fin = i;
      break;
    }
  }
  if (fin < 0) invalide();
  const nb = dv.getUint16(fin + 10, true);
  const entrees = {};
  let p = dv.getUint32(fin + 16, true);
  for (let k = 0; k < nb; k++) {
    if (p + 46 > u.length || dv.getUint32(p, true) !== 0x02014b50) invalide();
    const longueurNom = dv.getUint16(p + 28, true);
    entrees[dec.decode(u.subarray(p + 46, p + 46 + longueurNom))] = {
      methode: dv.getUint16(p + 10, true),
      taille: dv.getUint32(p + 20, true),
      decalage: dv.getUint32(p + 42, true),
    };
    p += 46 + longueurNom + dv.getUint16(p + 30, true) + dv.getUint16(p + 32, true);
  }
  async function lire(nom) {
    const f = entrees[nom];
    if (!f) return null;
    const debut = f.decalage + 30 + dv.getUint16(f.decalage + 26, true) + dv.getUint16(f.decalage + 28, true);
    const octets = u.subarray(debut, debut + f.taille);
    if (f.methode === 0) return dec.decode(octets);
    if (f.methode !== 8) invalide();
    const flux = new Blob([octets]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Response(flux).text();
  }
  return { noms: Object.keys(entrees), lire };
}
