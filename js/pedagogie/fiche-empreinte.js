/* Fiche pédagogique (mission 3b-0) : empreinte et statuts.
   - Empreinte : SHA-256 du JSON canonique de la fiche (clés triées, textes aux espaces normalisés), SANS le bloc
     « validation » ni le champ « meta.statut » : passer de « en_relecture » à « reference » ne change pas le contenu
     validé, mais toute modification du contenu change l'empreinte et rend la validation caduque.
   - SHA-256 écrit ici en JavaScript pur, pour un calcul synchrone et identique dans le navigateur et dans Node.
   Module sans interface, sans réseau ; il n'est chargé par aucune page de l'application. */
(function (root) {
  // ── SHA-256 (FIPS 180-4) ──
  const K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
  function utf8(s) { return typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(s) : Uint8Array.from(Buffer.from(s, 'utf8')); }
  function sha256(text) {
    const msg = utf8(text), len = msg.length, n = ((len + 9 + 63) >> 6) << 6, b = new Uint8Array(n);
    b.set(msg); b[len] = 0x80;
    const bits = len * 8; for (let i = 0; i < 8; i++) b[n - 1 - i] = Math.floor(bits / 2 ** (8 * i)) & 0xff;
    const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19], W = new Array(64);
    const r = (x, k) => (x >>> k) | (x << (32 - k));
    for (let o = 0; o < n; o += 64) {
      for (let i = 0; i < 16; i++) W[i] = (b[o + 4 * i] << 24) | (b[o + 4 * i + 1] << 16) | (b[o + 4 * i + 2] << 8) | b[o + 4 * i + 3];
      for (let i = 16; i < 64; i++) { const s0 = r(W[i - 15], 7) ^ r(W[i - 15], 18) ^ (W[i - 15] >>> 3), s1 = r(W[i - 2], 17) ^ r(W[i - 2], 19) ^ (W[i - 2] >>> 10); W[i] = (W[i - 16] + s0 + W[i - 7] + s1) | 0; }
      let [a, bb, c, d, e, f, g, h] = H;
      for (let i = 0; i < 64; i++) {
        const t1 = (h + (r(e, 6) ^ r(e, 11) ^ r(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + W[i]) | 0;
        const t2 = ((r(a, 2) ^ r(a, 13) ^ r(a, 22)) + ((a & bb) ^ (a & c) ^ (bb & c))) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = bb; bb = a; a = (t1 + t2) | 0;
      }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + bb) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0; H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }
    return H.map((x) => (x >>> 0).toString(16).padStart(8, '0')).join('');
  }

  // ── JSON canonique ──
  function canon(v) {
    if (Array.isArray(v)) return `[${v.map(canon).join(',')}]`;
    if (v && typeof v === 'object') return `{${Object.keys(v).filter((k) => v[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${canon(v[k])}`).join(',')}}`;
    if (typeof v === 'string') return JSON.stringify(v.normalize('NFC').replace(/\s+/g, ' ').trim());
    return JSON.stringify(v === undefined ? null : v);
  }
  function contenu(fiche) {
    const { validation, ...reste } = fiche || {};
    const meta = { ...(reste.meta || {}) }; delete meta.statut;
    return { ...reste, meta };
  }
  const empreinte = (fiche) => sha256(canon(contenu(fiche)));

  // ── Statuts et transitions ──
  const STATUTS = ['brouillon', 'en_relecture', 'reference', 'a_corriger', 'rejetee', 'generee_validee'];
  const UTILISABLES = ['reference', 'generee_validee'];
  const TRANSITIONS = {
    brouillon: ['en_relecture', 'generee_validee', 'rejetee'],
    en_relecture: ['reference', 'a_corriger', 'rejetee'],
    a_corriger: ['brouillon'],
    reference: ['brouillon'], // une fiche validée que l'on modifie repart en brouillon, puis en relecture
    generee_validee: ['brouillon', 'rejetee'],
    rejetee: [],
  };
  /* Une fiche humaine ne devient « reference » que par la relecture ; une fiche générée ne devient « generee_validee »
     que par le validateur, jamais par la relecture humaine des lots de référence. */
  function peutPasser(de, vers, origine) {
    if (!(TRANSITIONS[de] || []).includes(vers)) return false;
    if (vers === 'reference' && origine !== 'humaine') return false;
    if (vers === 'generee_validee' && origine === 'humaine') return false;
    if (vers === 'en_relecture' && origine !== 'humaine') return false;
    return true;
  }

  const api = { sha256, canon, empreinte, STATUTS, UTILISABLES, TRANSITIONS, peutPasser };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FicheEmpreinte = api;
})(typeof window !== 'undefined' ? window : globalThis);
