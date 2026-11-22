/* Banc d'essai de l'extraction (mission 2), étape 1 : les passages exactement tels que le navigateur les envoie au serveur.
   Chaque PDF du corpus métier est lu par OrgDocs.readPages puis découpé par OrgDocs.batches (code de production).
   Sortie : docs/benchmark/passages.json. Lancer depuis la racine :  node tests/bench/passages.js
   Avec --check : ne réécrit rien, vérifie que le fichier enregistré est à jour (utilisé par tests/benchmark.js). */
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..', '..');
const DIR = path.join(ROOT, 'docs', 'corpus-metier');
const OUT = path.join(ROOT, 'docs', 'benchmark', 'passages.json');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png' };

async function build() {
  const corpus = JSON.parse(fs.readFileSync(path.join(DIR, 'corpus.json'), 'utf8'));
  // contrôle hors corpus (mission 2c) : mêmes passages du navigateur, fichiers sous hors-corpus/
  const hors = JSON.parse(fs.readFileSync(path.join(DIR, 'hors-corpus', 'corpus.json'), 'utf8'));
  corpus.documents = [...corpus.documents, ...hors.documents.map((d) => ({ ...d, fichier: `hors-corpus/${d.fichier}` }))];
  const server = http.createServer((req, res) => {
    const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(res);
  });
  await new Promise((r) => server.listen(0, r));
  const browser = await chromium.launch();
  try {
    const page = await (await browser.newContext({ serviceWorkers: 'block' })).newPage();
    await page.goto(`http://localhost:${server.address().port}/index.html`);
    await page.waitForFunction(() => window.OrgDocs && window.pdfjsLib, null, { timeout: 30000 });
    const docs = [];
    for (const d of corpus.documents) {
      const b64 = fs.readFileSync(path.join(DIR, d.fichier)).toString('base64');
      const batches = await page.evaluate(async ({ b64, name }) => {
        const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        const read = await OrgDocs.readPages(new File([bin], name, { type: 'application/pdf' }));
        return OrgDocs.batches(read.pages);
      }, { b64, name: d.fichier });
      docs.push({ id: d.id, fichier: d.fichier, titre: d.titre, batches });
    }
    return { genere_par: 'tests/bench/passages.js', documents: docs };
  } finally { await browser.close(); server.close(); }
}

if (require.main === module) {
  build().then((data) => {
    const text = JSON.stringify(data, null, 2) + '\n';
    if (process.argv.includes('--check')) {
      const same = fs.existsSync(OUT) && fs.readFileSync(OUT, 'utf8') === text;
      console.log(same ? 'passages.json à jour' : 'passages.json PAS à jour : relancer node tests/bench/passages.js');
      process.exit(same ? 0 : 1);
    }
    fs.writeFileSync(OUT, text);
    console.log('écrit docs/benchmark/passages.json :', data.documents.map((d) => `${d.id} ${d.batches.length} lot(s)`).join(', '));
  }).catch((e) => { console.error(e); process.exit(1); });
}
module.exports = { build };
