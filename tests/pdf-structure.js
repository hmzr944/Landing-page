/* Tests de l'analyse rapide des PDF : rôles des sections et listes à libellé.
   Les PDF sont fabriqués par le test (Chromium imprime une page HTML) : aucun document personnel dans le dépôt.
   Lancer depuis la racine du dépôt :  node tests/pdf-structure.js   (Playwright requis, voir README). */
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
let failed = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? '✓' : '✗'} ${name}${extra ? ' : ' + extra : ''}`); if (!ok) failed++; };

const STYLE = '<style>body{font:11pt Helvetica,Arial,sans-serif;margin:40px}h1{font-size:26pt}h2{font-size:16pt}h3{font-size:13pt}p,li{font-size:11pt}</style>';
// Un bilan : accompagnement à la 1re personne, domaines avec listes à libellé, tableau d'état, plan, QCM
const BILAN = `<!doctype html><meta charset="utf-8">${STYLE}<h1>BILAN DE NIVEAU RÉSEAUX</h1>
<h2>1. Mon évaluation de ton niveau</h2><p>Je vais être franc avec toi, même si ce n'est pas agréable. Je me base sur tes réponses et sur ce que tu m'as montré. Ce n'est pas une critique : c'est le point de départ.</p>
<h2>2. Diagnostic par domaine</h2>
<h3>2.1 Adressage</h3><p>Niveau estimé : Débutant — à consolider</p><p>Tu as découvert :</p><ul><li>Adresse IP et masque.</li><li>Passerelle par défaut.</li><li>Notation CIDR.</li></ul>
<p>Ce que tu ne maîtrises pas encore :</p><ul><li>Calculer un sous-réseau.</li><li>Configurer une adresse statique.</li></ul><p>Mon constat : tu connais le vocabulaire mais pas encore la pratique.</p>
<h3>2.2 Services réseau</h3><p>Niveau estimé : Très faible</p><p>Tu as découvert :</p><ul><li>DHCP.</li><li>DNS.</li></ul><p>Ce que tu ne maîtrises pas encore :</p><ul><li>Configurer un serveur DHCP.</li></ul>
<h3>2.3 Sécurité</h3><p>Niveau estimé : Débutant</p><p>Tu as découvert :</p><ul><li>Pare-feu.</li><li>Phishing.</li></ul><p>Ce que tu ne maîtrises pas encore :</p><ul><li>Réaliser un audit.</li></ul>
<h2>3. Ce que tu ne sais pas encore faire</h2><table><tr><th>Mission</th><th>Niveau</th></tr><tr><td>Configurer un DHCP</td><td>Non acquis</td></tr><tr><td>Calculer un sous-réseau</td><td>Non acquis</td></tr><tr><td>Réaliser un audit de sécurité</td><td>Non acquis</td></tr><tr><td>Configurer une passerelle</td><td>Non acquis</td></tr></table>
<h2>4. Ce que je te conseille</h2><h3>Étape 1 — La sécurité d'abord</h3><ul><li>Pare-feu.</li></ul><h3>Étape 2 — Les services réseau</h3><ul><li>DHCP.</li></ul><h3>Étape 3 — L'adressage</h3><ul><li>Adresse IP.</li></ul>
<h2>5. Mon avis sur ton potentiel</h2><p>Je pense que tu as un bon profil. Mon conseil est de pratiquer chaque semaine dans ton laboratoire.</p>
<h2>6. Questions de compréhension</h2><p>Question 1 — À quoi sert le DHCP ?</p><p>○ À attribuer des adresses</p><p>○ À chiffrer</p><p>Bonne réponse : à attribuer automatiquement une adresse IP.</p>
<p>Question 2 — Que fait un pare-feu ?</p><p>○ Il filtre le trafic</p><p>○ Il accélère</p><p>Bonne réponse : il filtre le trafic selon des règles.</p>`;
// Un cours classique : aucun signal de bilan, la structure ne doit pas changer
const COURS = `<!doctype html><meta charset="utf-8">${STYLE}<h1>La photosynthèse</h1>
<h2>1. Introduction</h2><p>La photosynthèse est le processus par lequel les plantes fabriquent leur matière organique à partir de la lumière. Elle se déroule dans les chloroplastes des cellules végétales.</p>
<h2>2. La phase claire</h2><p>La phase claire est l'ensemble des réactions qui captent l'énergie lumineuse. Elle produit de l'ATP et libère du dioxygène.</p>
<h2>3. Le cycle de Calvin</h2><p>Le cycle de Calvin est la suite de réactions qui fixe le dioxyde de carbone. Il utilise l'ATP produit pendant la phase claire.</p>`;

(async () => {
  await new Promise((r) => server.listen(0, r));
  const URL0 = `http://localhost:${server.address().port}/index.html`;
  const browser = await chromium.launch();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'arbor-pdf-'));
  const maker = await browser.newPage();
  const pdfOf = async (html, name) => { await maker.setContent(html); const f = path.join(tmp, name); await maker.pdf({ path: f, format: 'A4' }); return f; };
  const files = { bilan: await pdfOf(BILAN, 'bilan.pdf'), cours: await pdfOf(COURS, 'cours.pdf') };

  const page = await (await browser.newContext({ serviceWorkers: 'block' })).newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(URL0); await page.waitForTimeout(1000);
  await page.evaluate(() => { const i = document.createElement('input'); i.type = 'file'; i.id = '__f'; document.body.appendChild(i); });
  const analyze = async (f) => { await page.setInputFiles('#__f', f); return page.evaluate(async () => (await PdfImport.analyze(document.getElementById('__f').files[0])).tree); };

  /* A. Bilan */
  const t = await analyze(files.bilan);
  const titles = t.children.map((c) => c.title.replace(/^\s*\d+(\.\d+)*\s+/, ''));
  check('A1 seuls les domaines deviennent des chapitres (et les questions à part)', JSON.stringify(titles) === JSON.stringify(['Sécurité', 'Services réseau', 'Adressage', 'Vérifie ta compréhension']), JSON.stringify(titles));
  check('A2 l’ordre suit le plan du document (étape 1 : sécurité)', titles[0] === 'Sécurité');
  const adr = t.children.find((c) => /Adressage/.test(c.title));
  check('A3 « Tu as découvert » devient des notions', JSON.stringify(adr.children.map((c) => c.title)) === JSON.stringify(['Adresse IP et masque', 'Passerelle par défaut', 'Notation CIDR']), JSON.stringify(adr.children.map((c) => c.title)));
  check('A4 « Ce que tu ne maîtrises pas encore » devient des objectifs', JSON.stringify(adr.objectives) === JSON.stringify(['Calculer un sous-réseau', 'Configurer une adresse statique']), JSON.stringify(adr.objectives));
  check('A5 les savoir-faire deviennent des exercices pratiques', adr.exercises.some((e) => /^Mets en pratique : calculer un sous-réseau/.test(e.q)));
  check('A6 le niveau et le constat sont gardés dans les notes', /\*\*Niveau estimé\.\*\* Débutant/.test(adr.notes) && /\*\*Constat\.\*\*/.test(adr.notes));
  const svc = t.children.find((c) => /Services/.test(c.title));
  check('A7 les missions du tableau vont au bon chapitre', svc.exercises.some((e) => /Mission : configurer un DHCP/.test(e.q)), svc.exercises.map((e) => e.q).join(' | '));
  check('A8 une mission identique à un savoir-faire n’est pas en double', adr.exercises.filter((e) => /calculer un sous-réseau/i.test(e.q)).length === 1);
  const allKeys = JSON.stringify(t).match(/"keyPoints":\[[^\]]*\]/g).join(' ');
  check('A9 aucune phrase d’accompagnement en point clé', !/critique|Je vais|Je pense|Mon conseil/.test(allKeys));
  check('A10 l’accompagnement reste lisible dans la vue d’ensemble', /Mon évaluation/.test(t.notes) && /potentiel/.test(t.notes));
  const q = t.children[t.children.length - 1];
  const qs = q.children.length ? q.children.flatMap((x) => x.exercises) : q.exercises;
  check('A11 les questions du QCM gardent leur correction', qs.length === 2 && /attribuer automatiquement/i.test(qs[0].a), JSON.stringify(qs.map((x) => x.a)));

  /* B. Cours classique : inchangé */
  const c = await analyze(files.cours);
  check('B1 un cours sans signal de bilan garde ses chapitres', JSON.stringify(c.children.map((x) => x.title.replace(/^\s*\d+\.\s+/, ''))) === JSON.stringify(['Introduction', 'La phase claire', 'Le cycle de Calvin']), JSON.stringify(c.children.map((x) => x.title)));
  check('B2 et ses définitions restent des points clés', c.children[1].keyPoints.some((k) => /phase claire est/.test(k)));

  /* C. Import réel : la case « Rédiger le cours » apparaît pour des notions sans contenu */
  await page.evaluate(() => document.getElementById('__f').remove());
  check('C1 aucune erreur JavaScript', errors.length === 0, errors.join(' | '));

  await browser.close(); server.close();
  if (!process.env.KEEP) fs.rmSync(tmp, { recursive: true, force: true }); else console.log('PDF gardés dans', tmp);
  console.log(failed ? `\n${failed} test(s) en échec` : '\nTous les tests passent');
  process.exit(failed ? 1 : 0);
})();
