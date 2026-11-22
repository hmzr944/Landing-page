/* Corpus métier n° 1 (docs/corpus-metier) : cohérence du manifeste et lecture réelle des PDF.
   A. Manifeste : 5 à 8 documents, les deux secteurs et les six sujets demandés, deux procédures au moins en v1 et v2,
      nature « synthetique » partout, source pour chaque règle réglementaire, changements v1 → v2 cohérents avec le texte.
   B. Lecture : chaque PDF est lu par la vraie fonction de l'espace Business (OrgDocs.readPages, pdf.js) ; toutes les
      règles attendues doivent se retrouver mot pour mot dans le texte gardé (rien de mis de côté ni de perdu), y compris
      dans la série ligatures/ (« fi », « ff », « fl » liés), qui cassait la lecture avant le 2026-11-18.
   Lancer depuis la racine du dépôt :  node tests/corpus-metier.js   (Playwright requis, voir README). */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const DIR = path.join(ROOT, 'docs', 'corpus-metier');
const corpus = JSON.parse(fs.readFileSync(path.join(DIR, 'corpus.json'), 'utf8'));
const { DOCS } = require(path.join(DIR, 'contenu.js'));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
let failed = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? '✓' : '✗'} ${name}${extra ? ' : ' + extra : ''}`); if (!ok) failed++; };
const norm = (s) => String(s).normalize('NFC').replace(/[‘’]/g, '\'').replace(/\s+/g, ' ').trim();
const srcText = (d) => norm(d.sections.flatMap((s) => [s.h, ...(s.ol || s.ul || s.p).map((x) => (typeof x === 'string' ? x : x.t))]).join(' '));

(async () => {
  /* ---------- A. Manifeste ---------- */
  const docs = corpus.documents;
  check('A1 entre 5 et 8 documents', docs.length >= 5 && docs.length <= 8, String(docs.length));
  check('A2 manifeste à jour avec contenu.js (mêmes documents)', JSON.stringify(docs.map((d) => d.id)) === JSON.stringify(DOCS.map((d) => d.id)));
  check('A3 chaque document est déclaré fabriqué (synthetique) et son PDF existe', docs.every((d) => d.nature === 'synthetique' && fs.existsSync(path.join(DIR, d.fichier))));
  const sujets = { retail: [/ouverture et fermeture/i, /retour/i, /caisse/i], hcr: [/réception des livraisons/i, /réclamation/i, /chaîne du froid/i] };
  for (const [sect, res] of Object.entries(sujets)) {
    const titres = docs.filter((d) => d.secteur === sect).map((d) => d.titre);
    check(`A4 secteur ${sect} : les trois sujets demandés sont couverts`, res.every((r) => titres.some((t) => r.test(t))), titres.join(' ; '));
  }
  const versionnees = [...new Set(docs.filter((d) => d.version === 2 && docs.some((o) => o.id === d.remplace)).map((d) => d.procedure))];
  check('A5 au moins deux procédures existent en v1 et en v2', versionnees.length >= 2, versionnees.join(', '));
  const regles = docs.flatMap((d) => d.regles_attendues.map((r) => ({ ...r, doc: d.id })));
  check('A6 chaque règle réglementaire cite une source vérifiée (titre, adresse, date)', regles.filter((r) => r.base === 'reglementaire').every((r) => r.source && /^https:\/\//.test(r.source.url) && r.source.titre && r.source.verifie));
  check('A7 chaque règle est « reglementaire » ou « interne »', regles.every((r) => ['reglementaire', 'interne'].includes(r.base)));
  console.log(`   ${regles.length} règles attendues, dont ${regles.filter((r) => r.base === 'reglementaire').length} réglementaires et ${regles.filter((r) => r.sensible).length} sensibles`);

  const byId = Object.fromEntries(DOCS.map((d) => [d.id, d]));
  for (const v2 of docs.filter((d) => d.changements)) {
    const a = srcText(byId[v2.remplace]), b = srcText(byId[v2.id]);
    const ids1 = new Set(byId[v2.remplace] && docs.find((d) => d.id === v2.remplace).regles_attendues.map((r) => r.id));
    const ids2 = new Set(v2.regles_attendues.map((r) => r.id));
    for (const c of v2.changements) {
      const avant = c.avant ? norm(c.avant) : null, apres = c.apres ? norm(c.apres) : null;
      const okText = (c.type !== 'ajoute' ? a.includes(avant) && !b.includes(avant) : true) && (c.type !== 'supprime' ? b.includes(apres) && !a.includes(apres) : true);
      const okRule = c.type === 'ajoute' ? ids2.has(c.regle) && !ids1.has(c.regle) : c.type === 'supprime' ? ids1.has(c.regle) && !ids2.has(c.regle) : ids1.has(c.regle) && ids2.has(c.regle);
      check(`A8 ${c.id} (${c.type}) : le texte et la règle concernée changent bien entre ${v2.remplace} et ${v2.id}`, okText && okRule);
    }
    for (const n of v2.non_changements) {
      const ok = n.type === 'reformulation' ? a.includes(norm(n.avant)) && b.includes(norm(n.apres)) && !b.includes(norm(n.avant)) : a.includes(norm(n.texte)) && b.includes(norm(n.texte));
      check(`A9 ${v2.id} non-changement (${n.type}) présent comme décrit`, ok);
    }
    const r1 = Object.fromEntries(docs.find((d) => d.id === v2.remplace).regles_attendues.map((r) => [r.id, r.texte]));
    const touchees = new Set(v2.changements.map((c) => c.regle));
    const stables = v2.regles_attendues.filter((r) => !touchees.has(r.id));
    check(`A10 ${v2.id} : les règles non touchées par un changement ont un texte identique à la v1 (${stables.length})`, stables.every((r) => r1[r.id] === r.texte));
  }

  /* ---------- B. Lecture réelle des PDF ---------- */
  await new Promise((r) => server.listen(0, r));
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ serviceWorkers: 'block' })).newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`http://localhost:${server.address().port}/index.html`);
  const ready = await page.waitForFunction(() => window.OrgDocs && window.pdfjsLib, null, { timeout: 30000 }).then(() => true, () => false);
  if (!ready) {
    console.log('– B lecture des PDF : NON VÉRIFIÉ (pdf.js n’a pas pu être chargé, connexion au CDN ?)');
  } else {
    const read = (file) => page.evaluate(async ({ b64, name }) => {
      const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      // Lecture naïve (morceaux joints par un espace, comme avant le 2026-11-18) : sert à prouver que la série « ligatures » en contient
      const pdf = await pdfjsLib.getDocument({ data: bin.slice() }).promise;
      const naive = [];
      for (let i = 1; i <= pdf.numPages; i++) naive.push((await (await pdf.getPage(i)).getTextContent()).items.map((x) => x.str).join(' '));
      try { const x = await OrgDocs.readPages(new File([bin], name, { type: 'application/pdf' })); return { text: x.pages.map((p) => p.text).join(' '), naive: naive.join(' '), count: x.count, aside: x.aside, unreadable: x.unreadable }; } catch (e) { return { error: e.message }; }
    }, { b64: fs.readFileSync(file).toString('base64'), name: path.basename(file) });
    for (const [serie, dir] of [['sans ligatures', DIR], ['avec ligatures', path.join(DIR, 'ligatures')]]) {
      let naiveMissing = 0;
      for (const d of docs) {
        const r = await read(path.join(dir, d.fichier));
        if (r.error) { check(`B ${serie} ${d.id} lu par l’espace Business`, false, r.error); continue; }
        const t = norm(r.text), nv = norm(r.naive);
        const missing = d.regles_attendues.filter((x) => !t.includes(norm(x.texte)));
        naiveMissing += d.regles_attendues.filter((x) => !nv.includes(norm(x.texte))).length;
        check(`B ${serie} ${d.id} lu (${r.count} p., ${t.length} car.) : ${d.regles_attendues.length - missing.length}/${d.regles_attendues.length} règles retrouvées mot pour mot`, !r.unreadable.length && !missing.length, missing.map((x) => x.id).join(', '));
        if (r.aside) console.log(`   ${d.id} : ${r.aside} passage(s) mis de côté par le classifieur`);
      }
      if (serie === 'avec ligatures') check('B condition préalable : la série « avec ligatures » casse bien la lecture naïve (sinon ce test ne prouverait rien)', naiveMissing > 0, `${naiveMissing} règle(s) perdue(s) par la lecture naïve`);
    }
  }
  check('B aucune erreur JavaScript', !errors.length, errors.join(' | '));
  await browser.close(); server.close();
  console.log(failed ? `\n${failed} échec(s)` : '\nTous les tests passent');
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
