/* Espace professionnel (étape C) : choisir son espace, créer une organisation, inviter, rejoindre, changer d'espace.
   Supabase est simulé (mêmes routes que le vrai projet) ; les règles d'accès réelles sont testées dans tests/db-rls.js.
   Point central : depuis l'espace professionnel, aucune donnée de l'espace personnel n'est envoyée au serveur.
   Lancer depuis la racine du dépôt :  node tests/org.js   (Playwright requis). */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
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
const SB = 'https://nnqtgwgwalbbhqzceged.supabase.co';
const SECRET_TITLE = 'Mon cours secret de biologie', SECRET_NOTE = 'La mitose confidentielle de mes révisions';

/* ---------- Faux Supabase (en mémoire), qui applique les mêmes règles que la base ---------- */
const db = { orgs: [], members: [], invites: [] };
const users = { 'jwt-alice': { id: 'u-alice', email: 'alice@magasin.fr' }, 'jwt-bob': { id: 'u-bob', email: 'bob@magasin.fr' }, 'jwt-carol': { id: 'u-carol', email: 'carol@ailleurs.fr' } };
const byEmail = (e) => Object.entries(users).find(([, u]) => u.email === e);
const sent = [];
function handle(r) {
  const u = new URL(r.url()); const raw = r.postData() || ''; const body = raw ? JSON.parse(raw) : {};
  const auth = (r.headers().authorization || '').replace('Bearer ', ''); const me = users[auth];
  sent.push({ url: r.url(), method: r.method(), body: raw, headers: r.headers() });
  const ok = (data, status = 200) => ({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(data) });
  const p = u.pathname;
  if (p === '/auth/v1/otp') return ok({});
  if (p === '/auth/v1/verify') { const e = byEmail(body.email); return body.token === '123456' && e ? ok({ access_token: e[0], refresh_token: 'rt', expires_in: 3600, user: { email: body.email } }) : ok({ msg: 'Token has expired or is invalid' }, 403); }
  if (!me) return ok({ message: 'JWT invalide' }, 401);
  const roleIn = (org) => (db.members.find((m) => m.org === org && m.user === me.id) || {}).role;
  if (p === '/rest/v1/rpc/my_organizations') return ok(db.members.filter((m) => m.user === me.id).map((m) => { const o = db.orgs.find((x) => x.id === m.org); return { id: o.id, name: o.name, sector: o.sector, role: m.role }; }));
  if (p === '/rest/v1/rpc/create_organization') { const id = crypto.randomUUID(); db.orgs.push({ id, name: body.p_name, sector: body.p_sector }); db.members.push({ org: id, user: me.id, role: 'admin', email: me.email }); return ok(id); }
  if (p === '/rest/v1/rpc/create_invitation') {
    if (!['admin', 'manager'].includes(roleIn(body.p_org))) return ok({ message: 'accès refusé' }, 400);
    const token = crypto.randomBytes(24).toString('hex'); db.invites.push({ id: crypto.randomUUID(), org: body.p_org, email: body.p_email, role: body.p_role, token, used: false }); return ok(token);
  }
  if (p === '/rest/v1/rpc/accept_invitation') {
    const inv = db.invites.find((i) => i.token === body.p_token && !i.used);
    if (!inv) return ok({ message: 'invitation invalide ou expirée' }, 400);
    if (inv.email !== me.email) return ok({ message: 'cette invitation est destinée à une autre adresse' }, 400);
    inv.used = true; db.members.push({ org: inv.org, user: me.id, role: inv.role, email: me.email }); return ok(inv.org);
  }
  if (p === '/rest/v1/rpc/revoke_invitation') { const i = db.invites.findIndex((x) => x.id === body.p_id && !x.used); if (i < 0 || !['admin', 'manager'].includes(roleIn(db.invites[i].org))) return ok({ message: 'accès refusé' }, 400); db.invites.splice(i, 1); return ok(null); }
  const org = (u.searchParams.get('org_id') || '').replace('eq.', '');
  if (p === '/rest/v1/memberships') return ok(['admin', 'manager'].includes(roleIn(org)) ? db.members.filter((m) => m.org === org).map((m) => ({ user_id: m.user, role: m.role, status: 'active', email: m.email })) : db.members.filter((m) => m.org === org && m.user === me.id).map((m) => ({ user_id: m.user, role: m.role, status: 'active', email: m.email })));
  if (p === '/rest/v1/invitations') return ok(['admin', 'manager'].includes(roleIn(org)) ? db.invites.filter((i) => i.org === org && !i.used).map((i) => ({ id: i.id, email: i.email, role: i.role, expires_at: new Date(Date.now() + 7 * 864e5).toISOString() })) : []);
  return ok({ message: 'route inconnue' }, 404);
}

const leaf = (id, title, notes) => ({ id, title, notes, explain: '', keyPoints: ['Point clé confidentiel de révision'], exercises: [], srs: null, status: 'todo', collapsed: false, children: [] });
const personal = () => ({ subjects: [{ id: 'persosubj01', title: SECRET_TITLE, color: '#1E7A57', icon: 'dna', createdAt: 1, updatedAt: 2, root: { ...leaf('persoroot01', SECRET_TITLE, ''), children: [leaf('persoleaf01', 'Mitose', SECRET_NOTE)] } }], settings: { theme: 'light', mascot: false }, stats: { days: {}, calib: {} }, trophies: {}, xp: 0, profile: { done: true, goals: [] } });

(async () => {
  await new Promise((r) => server.listen(0, r));
  const URL0 = `http://localhost:${server.address().port}/index.html`;
  const browser = await chromium.launch();
  const errors = [];
  async function fresh({ token, withPersonal = true, viewport = { width: 390, height: 844 }, fresh: blank = false } = {}) {
    const ctx = await browser.newContext({ viewport, serviceWorkers: 'block', reducedMotion: 'reduce' });
    const auth = token ? JSON.stringify({ access_token: token, refresh_token: 'rt', expires_at: Date.now() + 3600e3, email: users[token].email }) : '';
    await ctx.addInitScript(([st, au]) => {
      try { if (!sessionStorage.getItem('s')) { sessionStorage.setItem('s', 1); localStorage.clear(); if (st) localStorage.setItem('arbor:v1', st); if (au) localStorage.setItem('arbor:auth', au); } } catch (e) { /* about:blank */ }
    }, [blank ? '' : JSON.stringify(withPersonal ? personal() : { ...personal(), subjects: [] }), auth]);
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    await page.route(`${SB}/**`, (route) => route.fulfill(handle(route.request())));
    return { ctx, page };
  }
  const settle = (page, ms = 600) => page.waitForTimeout(ms);

  /* A. Étudiant sans organisation : rien ne change */
  {
    const { ctx, page } = await fresh();
    await page.goto(URL0); await settle(page, 900);
    check('A1 sans organisation, pas de sélecteur d’espace dans l’en-tête', !(await page.isVisible('#spaceBtn')));
    check('A2 l’espace personnel s’affiche comme avant', await page.isVisible('.bottom-nav') && /Mon cours secret/.test(await page.evaluate(() => JSON.stringify(localStorage.getItem('arbor:v1')))));
    await page.click('#settingsBtn'); await settle(page, 300);
    check('A3 les réglages proposent de créer ou rejoindre une organisation', await page.isVisible('#orgCreate') && /Rejoindre avec une invitation/.test(await page.textContent('#modalBody')));
    await ctx.close();
  }

  /* B. Alice crée son organisation et invite Bob */
  let inviteUrl = '', orgId = '';
  {
    const { ctx, page } = await fresh({ token: 'jwt-alice' });
    await page.goto(URL0); await settle(page, 900);
    await page.click('#settingsBtn'); await settle(page, 300);
    await page.click('#orgCreate'); await settle(page, 300);
    await page.fill('#ocName', 'Magasin de Lyon'); await page.selectOption('#ocSector', 'Commerce et distribution');
    await page.click('#ocForm .btn:not(.ghost)'); await settle(page, 900);
    orgId = (page.url().match(/#\/org\/([0-9a-f-]{36})/) || [])[1] || '';
    check('B1 l’organisation est créée et l’on arrive dans son espace', !!orgId && /Magasin de Lyon/.test(await page.textContent('.org-head')) && /Administrateur/.test(await page.textContent('.org-head')));
    check('B2 dans l’espace professionnel, les menus personnels disparaissent', await page.evaluate(() => document.documentElement.classList.contains('in-org')) && !(await page.isVisible('.bottom-nav')) && !(await page.isVisible('#xp')));
    check('B3 aucune donnée personnelle n’est affichée dans l’espace professionnel', !/Mon cours secret|confidentiel/.test(await page.textContent('#app')));
    check('B4 l’en-tête montre l’espace courant', await page.isVisible('#spaceBtn') && /Magasin de Lyon/.test(await page.textContent('#spaceName')));
    check('B5 l’accueil mène à de vrais écrans (diagnostic, client mystère, suivi), sans faux tableau de bord', !(await page.$('.org-card.soon')) && !!(await page.$('a.org-card[href$="/suivi"]')) && !!(await page.$('a.org-card[href$="/mystere"]')));
    await page.click('.org-tabs a[href$="/equipe"]'); await settle(page, 800);
    await page.fill('#oiEmail', 'bob@magasin.fr'); await page.click('#orgInvite .btn'); await settle(page, 600);
    inviteUrl = await page.inputValue('#oiLink').catch(() => '');
    check('B6 l’invitation donne un lien unique à envoyer', /#\/rejoindre\/[0-9a-f]{48}$/.test(inviteUrl), inviteUrl);
    await page.fill('#oiEmail', 'erreur@magasin.fr'); await page.click('#orgInvite .btn'); await settle(page, 400);
    await teamReload(page);
    check('B7 les invitations en attente sont listées', /bob@magasin\.fr/.test(await page.textContent('#app')) && /erreur@magasin\.fr/.test(await page.textContent('#app')));
    const btn = await page.$('li:has-text("erreur@magasin.fr") [data-revoke]'); if (btn) await btn.click(); await settle(page, 700);
    check('B8 une invitation se retire', !/erreur@magasin\.fr/.test(await page.textContent('#app')));
    // retour à l'espace personnel par le sélecteur
    await page.click('#spaceBtn'); await settle(page, 300);
    await page.click('.space-item[data-space="personal"]'); await settle(page, 900);
    check('B9 retour à l’espace personnel : cours intacts, menus revenus', !(await page.evaluate(() => document.documentElement.classList.contains('in-org'))) && await page.isVisible('.bottom-nav') && /Perso/.test(await page.textContent('#spaceName')));
    await ctx.close();
  }
  async function teamReload(page) { await page.evaluate((id) => { location.hash = `#/org/${id}`; }, orgId); await settle(page, 400); await page.evaluate((id) => { location.hash = `#/org/${id}/equipe`; }, orgId); await settle(page, 800); }

  /* C. Bob ouvre le lien : connexion avec l'adresse invitée, puis arrivée dans l'espace, en collaborateur */
  {
    const { ctx, page } = await fresh({ fresh: true });
    const hash = inviteUrl.slice(inviteUrl.indexOf('#'));
    await page.goto(URL0 + hash); await settle(page, 900);
    check('C1 sans compte, le lien demande de se connecter avec l’adresse invitée (sans introduction étudiante)', await page.isVisible('#orgLogin') && !(await page.isVisible('.onb')));
    await page.fill('#olEmail', 'bob@magasin.fr'); await page.click('#olSend'); await settle(page, 400);
    await page.fill('#olCode', '123456'); await page.click('#olVerify'); await settle(page, 1200);
    check('C2 l’invitation est acceptée : Bob arrive dans l’espace, en collaborateur', new RegExp(`#/org/${orgId}`).test(page.url()) && /Collaborateur/.test(await page.textContent('.org-head')));
    check('C3 un collaborateur n’a pas l’onglet Équipe', !(await page.$('.org-tabs a[href$="/equipe"]')));
    await page.evaluate((id) => { location.hash = `#/org/${id}/equipe`; }, orgId); await settle(page, 700);
    check('C4 même en tapant l’adresse, l’écran Équipe ne s’ouvre pas pour un collaborateur', !(await page.$('#orgInvite')));
    await ctx.close();
  }

  /* D. Le même lien, ouvert par une autre personne : refusé, sans rien casser */
  {
    const tk = inviteUrl.split('/').pop();
    db.invites.push({ id: crypto.randomUUID(), org: orgId, email: 'dan@magasin.fr', role: 'member', token: tk.replace(/.$/, (c) => (c === 'a' ? 'b' : 'a')), used: false });
    const { ctx, page } = await fresh({ token: 'jwt-carol' });
    await page.goto(`${URL0}#/rejoindre/${tk.replace(/.$/, (c) => (c === 'a' ? 'b' : 'a'))}`); await settle(page, 1200);
    check('D1 une invitation destinée à une autre adresse est refusée avec un message clair', /Invitation non valable/.test(await page.textContent('#app')) && /autre adresse/.test(await page.textContent('#app')));
    check('D2 la personne reste dans son espace personnel', !(await page.evaluate(() => localStorage.getItem('arbor:space') || '')).includes(orgId));
    await ctx.close();
  }

  /* E. Onboarding mobile : « J'ai une invitation » mène directement à l'espace professionnel */
  {
    const { ctx, page } = await fresh({ fresh: true });
    await page.goto(URL0); await settle(page, 1000);
    const link = await page.$('.onb [data-onb="join"]');
    check('E1 l’introduction propose « J’ai une invitation de mon organisation »', !!link);
    if (link) { await link.click(); await settle(page, 700); }
    check('E2 elle mène à l’écran pour rejoindre (coller le lien)', /#\/rejoindre/.test(page.url()) && await page.isVisible('#jpLink'));
    await ctx.close();
  }

  /* F. Séparation des données : rien de l'espace personnel n'est parti vers le serveur */
  const all = sent.map((x) => `${x.url} ${x.body}`).join('\n');
  check('F1 aucune donnée personnelle (titre de cours, notes, points clés) dans les requêtes', !/Mon cours secret|mitose confidentielle|Point clé confidentiel|persosubj01|persoleaf01/i.test(all));
  check('F2 les requêtes ne vont qu’au projet Supabase, avec le jeton de la personne et sans clé secrète', sent.every((x) => x.url.startsWith(SB)) && !/sk-ant|gsk_|service_role/.test(all));
  check('F3 aucune erreur JavaScript', errors.length === 0, errors.join(' | '));

  await browser.close(); server.close();
  console.log(failed ? `\n${failed} test(s) en échec` : '\nTous les tests passent');
  process.exit(failed ? 1 : 0);
})();
