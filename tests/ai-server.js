/* Sécurisation des appels IA : plus aucune clé dans le navigateur, la génération passe par le serveur Arbor.
   Vérifie : purge d'une ancienne clé enregistrée, réglages sans champ de clé, import PDF (analyse rapide sans compte,
   analyse avancée via le serveur simulé : texte extrait seulement, jeton de l'étudiant, points clés ajoutés),
   rédaction d'un cours (passages Wikimedia réels, reformulation par le serveur simulé).
   Lancer depuis la racine du dépôt :  node tests/ai-server.js   (Playwright requis). */
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
let failed = 0, skipped = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? '✓' : '✗'} ${name}${extra ? ' : ' + extra : ''}`); if (!ok) failed++; };
const skip = (name, why) => { console.log(`– ${name} : NON VÉRIFIÉ (${why})`); skipped++; };
const SB = 'https://nnqtgwgwalbbhqzceged.supabase.co';
const leaf = (id, title, notes = '') => ({ id, title, notes, explain: '', keyPoints: [], exercises: [], srs: null, status: 'todo', collapsed: false, children: [] });
const COURS = `<html><body style="font-family:Arial;font-size:13px">
<h1>Réseaux : adressage et services</h1>
<h2>Le protocole DHCP</h2><p>Le protocole DHCP attribue automatiquement une adresse IP, un masque de sous-réseau et une passerelle par défaut à chaque poste qui rejoint le réseau. Le client envoie une requête DHCPDISCOVER en diffusion ; le serveur répond par une offre DHCPOFFER. Le client confirme avec DHCPREQUEST et le serveur valide avec DHCPACK. Le bail a une durée limitée et doit être renouvelé.</p>
<h2>Le service DNS</h2><p>Le service DNS traduit les noms de domaine en adresses IP. Quand un poste veut joindre un site, il interroge son serveur DNS, qui répond avec l'adresse correspondante ou interroge d'autres serveurs. Les enregistrements A associent un nom à une adresse IPv4, les enregistrements AAAA à une adresse IPv6.</p>
</body></html>`;

(async () => {
  await new Promise((r) => server.listen(0, r));
  const URL0 = `http://localhost:${server.address().port}/index.html`;
  const browser = await chromium.launch();
  const errors = [];
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'arbor-ai-'));
  const maker = await browser.newPage();
  await maker.setContent(COURS); const pdfPath = path.join(tmp, 'reseaux.pdf'); await maker.pdf({ path: pdfPath, format: 'A4' }); await maker.close();

  const sent = [];
  async function fresh({ signedIn = false, legacyKey = false, extra, withModule = false } = {}) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', reducedMotion: 'reduce' });
    const state = { subjects: [{ id: 'aisubj00001', title: 'Réseaux', color: '#1E7A57', icon: 'code', createdAt: 1, updatedAt: 2,
      root: { ...leaf('airoot00001', 'Réseaux'), children: withModule ? [{ ...leaf('aidhcp00001', 'Services réseau'), children: [leaf('ainot000001', 'Dynamic Host Configuration Protocol'), leaf('ainot000002', 'Domain Name System')] }] : [leaf('aidhcp00001', 'Protocole DHCP')] } }],
      settings: { theme: 'light', mascot: false, ...(legacyKey ? { apiKey: 'sk-ant-ancienne-cle-test', model: 'claude-opus-5-5' } : {}) },
      stats: { days: {}, calib: {} }, trophies: {}, xp: 0, profile: { done: true, goals: [] } };
    const auth = signedIn ? { access_token: 'jwt-test', refresh_token: 'rt', expires_at: Date.now() + 3600e3, email: 'etudiant@exemple.fr' } : null;
    await ctx.addInitScript(([st, au]) => {
      try { if (!sessionStorage.getItem('s')) { sessionStorage.setItem('s', 1); localStorage.clear(); localStorage.setItem('arbor:v1', st); if (au) localStorage.setItem('arbor:auth', au); } } catch (e) { /* about:blank */ }
    }, [JSON.stringify(state), auth ? JSON.stringify(auth) : '']);
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    await page.route(`${SB}/**`, async (route) => {
      const r = route.request(); const u = new URL(r.url());
      const raw = r.postData() || '';
      const body = raw ? JSON.parse(raw) : null;
      sent.push({ path: u.pathname, headers: r.headers(), body, size: raw.length });
      const ok = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(data) });
      if (u.pathname !== '/functions/v1/tutor') return ok({});
      if (body.task === 'enrichir') return ok({ keyPoints: [`À retenir sur ${body.title} (serveur)`], exercises: [{ q: `Question sur ${body.title} ?`, a: 'Réponse tirée de l’extrait.' }], dropped: 0, usage: { used: 1, limit: 150 } });
      if (body.task === 'rediger_notion') return ok({ notes: `Cours rédigé par le serveur pour « ${body.title} », à partir des extraits fournis. ==Phrase essentielle.== Suite du cours avec un exemple concret.`, keyPoints: ['Point clé rédigé par le serveur'], exercises: [], dropped: 0, usage: { used: 2, limit: 150 } });
      if (body.task === 'rediger_cours') return ok({ overview: 'Vue d’ensemble rédigée par le serveur.', notions: [{ title: 'Notion serveur', notes: 'Notes rédigées par le serveur à partir du texte de référence.', keyPoints: [], exercises: [] }], dropped: 0, grounded: true, usage: { used: 3, limit: 150 } });
      return ok({ error: 'inattendu' }, 400);
    });
    if (extra) await extra(page);
    await page.goto(`${URL0}#/s/aisubj00001/aidhcp00001/fiche`); await page.waitForTimeout(1000);
    return { ctx, page };
  }
  const st = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('arbor:v1')));
  async function importPdf(page, mode) {
    await page.evaluate(() => { location.hash = '#/cours'; }); await page.waitForTimeout(500);
    await page.click('[data-act="import-pdf"]'); await page.waitForTimeout(400);
    const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.click('#drop')]);
    await chooser.setFiles(pdfPath); await page.waitForTimeout(300);
    return mode;
  }

  /* A. Une ancienne clé enregistrée est effacée, et les réglages n'ont plus de champ de clé */
  {
    const { ctx, page } = await fresh({ legacyKey: true });
    await page.waitForTimeout(800); // une sauvegarde a lieu après le chargement
    await page.click('#settingsBtn'); await page.waitForTimeout(300);
    check('A1 les réglages ne proposent plus de saisir une clé d’IA', !(await page.$('#apiKey')) && !(await page.$('#model')));
    check('A2 sans compte, les réglages proposent de se connecter (gratuit)', await page.isVisible('#acctEmail') && /Gratuit/.test(await page.textContent('#acctState')));
    await page.click('#modalBody .row-btns.end .btn'); await page.waitForTimeout(500);
    const raw = await page.evaluate(() => localStorage.getItem('arbor:v1'));
    check('A3 l’ancienne clé a disparu du stockage du navigateur', !raw.includes('sk-ant-ancienne-cle-test') && !/"apiKey"/.test(raw));
    await ctx.close();
  }

  /* B. Sans compte : l'analyse rapide d'un PDF marche, l'analyse avancée est verrouillée avec une explication */
  {
    const { ctx, page } = await fresh();
    await importPdf(page);
    const adv = await page.$('input[name="mode"][value="ai"]');
    check('B1 sans compte, l’analyse avancée est désactivée et explique comment l’activer', adv && await adv.isDisabled() && /Connecte-toi/.test(await page.textContent('#modalBody')));
    const before = sent.length;
    await page.click('#pdfGo'); await page.waitForTimeout(2500);
    const txt = await page.textContent('#modalBody');
    check('B2 l’analyse rapide produit l’aperçu du cours (DHCP, DNS), sans aucun appel au serveur', /DHCP/.test(txt) && /DNS/.test(txt) && sent.slice(before).every((x) => x.path !== '/functions/v1/tutor'), txt.slice(0, 120));
    await ctx.close();
  }

  /* C. Connecté : l'analyse avancée passe par le serveur, avec seulement le texte extrait */
  {
    const { ctx, page } = await fresh({ signedIn: true });
    await importPdf(page);
    const adv = await page.$('input[name="mode"][value="ai"]');
    check('C1 connecté, l’analyse avancée est proposée et cochée', adv && !(await adv.isDisabled()) && await adv.isChecked());
    const before = sent.length;
    await page.click('#pdfGo'); await page.waitForTimeout(3500);
    const calls = sent.slice(before).filter((x) => x.path === '/functions/v1/tutor');
    check('C2 une demande « enrichir » par partie du cours', calls.length >= 2 && calls.every((x) => x.body.task === 'enrichir'), calls.map((x) => x.body.title).join(' | '));
    check('C3 chaque demande porte le jeton de l’étudiant et le texte de la partie, jamais le fichier PDF ni une clé',
      calls.every((x) => x.headers.authorization === 'Bearer jwt-test' && x.size < 6000 && !/%PDF|base64|sk-ant/.test(JSON.stringify(x.body))) && calls.some((x) => /DHCPDISCOVER/.test(x.body.text)));
    // valider l'aperçu : le cours importé garde le texte du document et reçoit les points clés du serveur
    const okBtn = await page.$('#modalBody .row-btns.end .btn:not(.ghost)');
    if (okBtn) { await okBtn.click(); await page.waitForTimeout(800); }
    const s = await st(page);
    const all = JSON.stringify(s.subjects);
    check('C4 le cours importé garde le texte du document et ajoute les points clés du serveur', /DHCPDISCOVER/.test(all) && /\(serveur\)/.test(all));
    await ctx.close();
  }

  /* D. Rédiger un cours : passages Wikimedia réels, reformulation par le serveur (repli : extraits) */
  {
    const reach = await fetch('https://fr.wikipedia.org/w/api.php?action=query&meta=siteinfo&format=json').then((r) => r.ok).catch(() => false);
    if (!reach) skip('D rédaction d’un cours', 'Wikimedia injoignable depuis cet environnement');
    else {
      const { ctx, page } = await fresh({ signedIn: true });
      const before = sent.length;
      const btn = await page.$('[data-act="write-course"]');
      if (!btn) check('D0 la partie vide propose « Rédiger le cours »', false);
      else {
        await btn.click();
        // la rédaction se fait en arrière-plan ; on attend que la carte de progression disparaisse (90 s au plus)
        await page.waitForFunction(() => !document.getElementById('writeCard'), null, { timeout: 90000 }).catch(() => {});
        const calls = sent.slice(before).filter((x) => x.path === '/functions/v1/tutor');
        const s = await st(page);
        const node = s.subjects[0].root.children[0];
        const text = JSON.stringify(node);
        if (!/wiki/i.test(text)) skip('D rédaction d’un cours', 'aucune source Wikimedia lue par le navigateur de test (réseau)');
        else {
          check('D1 le serveur reformule à partir des passages trouvés (aucune clé, jeton de l’étudiant)',
            calls.length > 0 && calls.every((x) => ['rediger_notion', 'rediger_cours'].includes(x.body.task) && x.headers.authorization === 'Bearer jwt-test' && x.body.text.length > 80), `${calls.length} appels`);
          check('D2 le cours rédigé est enregistré avec ses sources', /rédigé par le serveur|rédigées par le serveur/.test(text) && /"sources":\[\{/.test(text));
        }
      }
      await ctx.close();
    }
  }

  /* D bis. Partie qui a déjà ses notions : chaque notion est rédigée à partir de ses passages (méthode STORM) */
  {
    const reach = await fetch('https://fr.wikipedia.org/w/api.php?action=query&meta=siteinfo&format=json').then((r) => r.ok).catch(() => false);
    if (!reach) skip('D3 rédaction notion par notion', 'Wikimedia injoignable');
    else {
      const { ctx, page } = await fresh({ signedIn: true, withModule: true });
      const before = sent.length;
      const btn = await page.$('[data-act="write-course"]');
      if (!btn) check('D3 la partie sans cours propose « Rédiger le cours »', false);
      else {
        await btn.click();
        await page.waitForFunction(() => !document.getElementById('writeCard'), null, { timeout: 120000 }).catch(() => {});
        const calls = sent.slice(before).filter((x) => x.path === '/functions/v1/tutor' && x.body.task === 'rediger_notion');
        const kids = (await st(page)).subjects[0].root.children[0].children;
        if (!calls.length && kids.every((k) => !k.notes)) skip('D3 rédaction notion par notion', 'aucun passage trouvé sur Wikimedia pour ces notions');
        else check('D3 chaque notion est reformulée par le serveur à partir de passages numérotés, avec ses sources',
          calls.length >= 1 && calls.every((x) => /\[1\]/.test(x.body.text) && x.headers.authorization === 'Bearer jwt-test') && kids.some((k) => /rédigé par le serveur/.test(k.notes) && k.course && k.course.from === 'serveur' && k.course.sources.length), `${calls.length} notions`);
      }
      await ctx.close();
    }
  }

  /* E. Aucune clé d'IA ni appel direct à un fournisseur dans le code publié */
  {
    const files = ['index.html', 'sw.js', ...fs.readdirSync(path.join(ROOT, 'js')).map((f) => `js/${f}`)];
    const bad = files.filter((f) => /sk-ant-|gsk_[A-Za-z0-9]{10}|dangerouslyAllowBrowser|api\.anthropic\.com|api\.groq\.com|x-api-key/i.test(fs.readFileSync(path.join(ROOT, f), 'utf8')));
    check('E1 aucune clé, aucun appel direct à un fournisseur d’IA dans les fichiers servis au navigateur', !bad.length, bad.join(', '));
  }

  check('F1 aucune erreur JavaScript', errors.length === 0, errors.join(' | '));
  await browser.close(); server.close();
  console.log(failed ? `\n${failed} test(s) en échec${skipped ? `, ${skipped} non vérifié(s)` : ''}` : `\nTous les tests passent${skipped ? ` (${skipped} non vérifié(s))` : ''}`);
  process.exit(failed ? 1 : 0);
})();
