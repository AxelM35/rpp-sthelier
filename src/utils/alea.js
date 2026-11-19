// Générateur pseudo-aléatoire à graine (mulberry32) : rend la proposition automatique reproductible.

/** Renvoie une fonction qui produit des nombres dans [0, 1[ à partir d'une graine entière. */
export function creerAlea(graine) {
  let a = graine >>> 0;
  return function alea() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
