/* Partager un parcours par lien (js/partage.js) : création du lien, ce qui voyage et ce qui ne voyage jamais,
   ouverture sur un autre navigateur (aucune donnée commune), ajout, lien abîmé, aucune requête réseau du parcours.
   Lancer :  node tests/partage.js   (Playwright requis) */
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'tests/learning-flow.js'), 'utf8');
const D = 86400000, now = Date.now(); // eslint-disable-line no-unused-vars
eval(src.slice(src.indexOf('const leaf ='), src.indexOf('(async () =>'))); // définit sample()
const FICHE = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/fixtures/fiches/essai-levier.json'), 'utf8'));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const seen = [];
const server = http.createServer((req, res) => {
  seen.push(req.url);
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
let failed = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? '✓' : '✗'} ${name}${extra ? ' : ' + extra : ''}`); if (!ok) failed++; };

(async () => {
  await new Promise((r) => server.listen(0, r));
  const URL0 = `http://localhost:${server.address().port}/index.html`;
  const browser = await chromium.launch();
  const data = sample();
  const dns = data.subjects[0].root.children[0].children.find((n) => n.id === 'nseen000001');
  dns.fiche = FICHE; dns.notes = 'Le DNS traduit un nom de domaine en adresse IP.';

  // --- Auteur : crée le lien ---
  const a = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block', reducedMotion: 'reduce', permissions: ['clipboard-read', 'clipboard-write'] });
  await a.addInitScript((d) => { if (!sessionStorage.getItem('s')) { sessionStorage.setItem('s', 1); localStorage.clear(); localStorage.setItem('arbor:v1', d); localStorage.setItem('arbor:onboarded', '1'); } }, JSON.stringify(data));
  const pa = await a.newPage();
  const errors = []; pa.on('pageerror', (e) => errors.push(e.message));
  await pa.goto(`${URL0}#/s/subjaaaaa01/rootaaaaa01`); await pa.waitForTimeout(900);
  check('P01 le sujet propose « Partager »', await pa.isVisible('[data-act="share-subject"]'));
  await pa.click('[data-act="share-subject"]'); await pa.waitForTimeout(500);
  const url = await pa.inputValue('#shUrl');
  check('P02 un lien #/partage/v1.… est créé', /#\/partage\/v1\.[A-Za-z0-9_-]+$/.test(url), url.slice(0, 80));
  check('P03 la fenêtre prévient : progression non partagée, lien lisible par qui l’a', /progression et tes révisions ne sont pas partagées/.test(await pa.textContent('#modalBody')) && /Toute personne qui a le lien/.test(await pa.textContent('#modalBody')));
  await pa.click('#shCopy'); await pa.waitForTimeout(300);
  check('P04 « Copier le lien » copie exactement le lien', (await pa.evaluate(() => navigator.clipboard.readText())) === url);
  const payload = await pa.evaluate(async (u) => Partage.decode(u.split('#/partage/')[1]), url);
  const flat = JSON.stringify(payload);
  const keys = new Set(); const walkK = (x) => { Object.keys(x).forEach((k) => keys.add(k)); (x.children || []).forEach(walkK); }; walkK(payload.root);
  check('P05 le lien contient la structure, les notes et la fiche', payload.title === 'TSSR' && /Adressage IP/.test(flat) && /traduit un nom de domaine/.test(flat) && /"fiche"/.test(flat));
  check('P06 rien de personnel ne voyage : ni révisions, ni preuves, ni statut, ni identifiants', !['srs', 'ev', 'status', 'lessonDone', 'id', 'collapsed'].some((k) => keys.has(k)) && !/"learned"|nmastered01|subjaaaaa01|rootaaaaa01/.test(flat), [...keys].join(','));
  check('P07 aucune erreur JavaScript chez l’auteur', !errors.length, errors.join(' | '));

  // --- Destinataire : autre navigateur, rien en commun ---
  const b = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', reducedMotion: 'reduce' });
  // tout premier passage sur Arbor (aucune donnée) : l'accueil de bienvenue ne doit pas recouvrir le parcours partagé
  await b.addInitScript(() => { if (!sessionStorage.getItem('s')) { sessionStorage.setItem('s', 1); localStorage.clear(); } });
  const pb = await b.newPage();
  const errB = []; pb.on('pageerror', (e) => errB.push(e.message));
  const before = seen.length;
  await pb.goto(url.replace(/^http:\/\/localhost:\d+\/index\.html/, URL0)); await pb.waitForTimeout(1200);
  const req = seen.slice(before);
  check('P08 le parcours n’est envoyé à aucun serveur (le fragment ne part pas)', !req.some((u) => /\/partage\/|v1\./.test(u)), req.filter((u) => /\/partage\//.test(u)).join(','));
  const tb = (await pb.textContent('#app')).replace(/\s+/g, ' ');
  check('P09a nouveau visiteur : pas d’écran de bienvenue par-dessus le parcours partagé', !(await pb.isVisible('.wel.show')));
  check('P09 aperçu : titre, nombre de parties, fiche, avertissement de contrôle', /Parcours partagé/.test(tb) && /TSSR/.test(tb) && /Réseaux/.test(tb) && /1 fiche pédagogique/.test(tb) && /contrôlée par Arbor/.test(tb), tb.slice(0, 200));
  await pb.click('#shAdd'); await pb.waitForTimeout(900);
  const st = await pb.evaluate(() => JSON.parse(localStorage.getItem('arbor:v1')));
  const s = st.subjects.find((x) => x.title === 'TSSR');
  let n = 0, srs = 0, withFiche = 0; const walk = (x) => { n++; if (x.srs) srs++; if (x.fiche) withFiche++; (x.children || []).forEach(walk); };
  if (s) walk(s.root);
  check('P10 ajouté : même arbre (12 nœuds), fiche conservée, aucune révision importée', !!s && n === 12 && withFiche === 1 && srs === 0, `${n} nœuds, ${withFiche} fiche, ${srs} srs`);
  check('P11 nouveaux identifiants (pas ceux de l’auteur)', !!s && s.id !== 'subjaaaaa01' && s.root.id !== 'rootaaaaa01');
  check('P12 on arrive sur le sujet ajouté', new RegExp(`#/s/${s && s.id}/`).test(pb.url()), pb.url());

  // --- Lien abîmé ---
  await pb.goto(`${URL0}#/partage/v1.AAAAbbbbCCCC`); await pb.waitForTimeout(800);
  check('P13 lien abîmé : message clair, aucun ajout', /Impossible d’ouvrir ce lien/.test(await pb.textContent('#app')) && (await pb.evaluate(() => JSON.parse(localStorage.getItem('arbor:v1')).subjects.length)) === st.subjects.length);
  await pb.goto(`${URL0}#/partage/v1.${Buffer.from('{"a":"autre"}').toString('base64url')}`); await pb.waitForTimeout(800);
  check('P14 contenu qui n’est pas un parcours Arbor : refusé', /Impossible d’ouvrir ce lien/.test(await pb.textContent('#app')));
  check('P15 aucune erreur JavaScript chez le destinataire', !errB.length, errB.join(' | '));

  // --- Réglages du Web : accès à l'application et à la documentation ---
  await pa.goto(`${URL0}#/`); await pa.waitForTimeout(1200);
  const hasDl = await pa.evaluate(() => { const b = document.querySelector('#settingsBtn'); if (b) b.click(); return !!b; });
  await pa.waitForTimeout(800);
  check('P16 réglages du Web : « Télécharger Arbor Desktop » et la documentation', hasDl && await pa.isVisible('a[href="site/telecharger.html"]') && await pa.isVisible('a[href="site/docs/index.html"]'));

  await browser.close(); server.close();
  console.log(failed ? `\n${failed} échec(s)` : '\nTous les tests passent');
  process.exit(failed ? 1 : 0);
})();
