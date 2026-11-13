/* Arbor Business avec la migration 007 : assistant de l'administrateur (6 étapes reprenables), équipes,
   compétences éditables, invitations v2 (aperçu, expirée, utilisée, annulée, déjà membre), arrivée du collaborateur.
   Supabase et la fonction « tutor » sont simulés en mémoire avec les mêmes règles que la base
   (les règles réelles sont vérifiées sur PostgreSQL dans tests/db-rls.js, section W).
   Lancer depuis la racine du dépôt :  node tests/org-onboarding.js   (Playwright requis). */
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
const SECRET = 'Mes notes secrètes de chimie';

/* ---------- Faux Supabase avec la migration 007 ---------- */
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = (sub) => `${b64({ alg: 'HS256' })}.${b64({ sub, exp: 9999999999 })}.sig`;
const people = { alice: { id: 'u-alice', email: 'alice@boulangerie.fr', pass: 'Pain2026x' }, bob: { id: 'u-bob', email: 'bob@boulangerie.fr', pass: 'Croissant1' }, zoe: { id: 'u-zoe', email: 'zoe@ailleurs.fr', pass: 'Ailleurs22' } };
const tokens = Object.fromEntries(Object.values(people).map((u) => [jwt(u.id), u]));
const db = { orgs: [], members: [], invites: [], units: [], skills: [], sk: [], su: [], knowledge: [], calls: [] };
const sent = [];
const fault = { server: false, offline: false, delay: 0 }; // pannes simulées sur l'enregistrement de l'organisation
const sha = (t) => crypto.createHash('sha256').update(t).digest('hex');
function handle(r) {
  const u = new URL(r.url()); const raw = r.postData() || ''; let body = {}; try { body = raw ? JSON.parse(raw) : {}; } catch (e) { body = {}; }
  const me = tokens[(r.headers().authorization || '').replace('Bearer ', '')];
  sent.push({ url: r.url(), method: r.method(), body: raw });
  const ok = (data, status = 200) => ({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(data) });
  const err = (m, status = 400) => ok({ message: m }, status);
  const p = u.pathname, m = r.method();
  const eq = (k) => (u.searchParams.get(k) || '').replace(/^eq\./, '');
  if (p === '/auth/v1/settings') return ok({ external: { email: true, google: false } });
  if (p === '/auth/v1/token') { const x = Object.values(people).find((y) => y.email === body.email && y.pass === body.password); return x ? ok({ access_token: jwt(x.id), refresh_token: 'rt', expires_in: 3600, user: { email: x.email } }) : ok({ error_code: 'invalid_credentials', msg: 'Invalid login credentials' }, 400); }
  if (p === '/rest/v1/rpc/invitation_preview') {
    const i = db.invites.find((x) => x.hash === sha(body.p_token || ''));
    if (!i) return ok([]);
    const o = db.orgs.find((x) => x.id === i.org);
    const st = i.revoked ? 'annulee' : i.used ? 'utilisee' : i.expires < Date.now() ? 'expiree' : 'valide';
    return ok([{ org_name: o.name, role: i.role, unit: (db.units.find((x) => x.id === i.unit) || {}).name || null, email_hint: `${i.email.slice(0, 2)}•••@${i.email.split('@')[1]}`, status: st }]);
  }
  if (!me) return ok({ message: 'JWT invalide' }, 401);
  const mem = (org) => db.members.find((x) => x.org === org && x.user === me.id);
  const role = (org) => (mem(org) || {}).role;
  const isAdmin = (org) => role(org) === 'admin', isLead = (org) => ['admin', 'manager'].includes(role(org));
  if (p === '/auth/v1/user') return ok({ email: me.email });
  if (p === '/rest/v1/profiles') return ok(m === 'GET' ? [] : null);
  // ---- fonctions
  if (p === '/rest/v1/rpc/my_organizations') return ok(db.members.filter((x) => x.user === me.id).map((x) => { const o = db.orgs.find((y) => y.id === x.org); return { id: o.id, name: o.name, sector: o.sector, role: x.role, owner: o.created_by === me.id, unit: (db.units.find((y) => y.id === x.unit) || {}).name || null, onboarded: !!x.onboarded, setup: o.setup }; }));
  if (p === '/rest/v1/rpc/create_organization') { const id = crypto.randomUUID(); db.orgs.push({ id, name: body.p_name, sector: body.p_sector, size: body.p_size || null, country: body.p_country || null, language: body.p_language || 'fr', goals: [], setup: {}, created_by: me.id }); db.members.push({ org: id, user: me.id, role: 'admin', email: me.email }); db.calls.push(['create', body]); return ok(id); }
  if (p === '/rest/v1/rpc/update_organization') {
    if (fault.server) return err('erreur interne', 500);
    if (!isAdmin(body.p_org)) return err('accès refusé');
    const o = db.orgs.find((x) => x.id === body.p_org);
    ['name', 'sector', 'size', 'country', 'language', 'goals'].forEach((k) => { if (body[`p_${k}`] != null) o[k] = body[`p_${k}`]; });
    if (body.p_setup) o.setup = { ...o.setup, ...body.p_setup };
    db.calls.push(['update', body]); return ok(null);
  }
  if (p === '/rest/v1/rpc/save_unit') {
    if (!isAdmin(body.p_org)) return err('accès refusé');
    if (db.units.some((x) => x.org === body.p_org && x.kind === body.p_kind && x.name === body.p_name.trim())) return err('ce nom existe déjà');
    const id = crypto.randomUUID(); db.units.push({ id, org: body.p_org, kind: body.p_kind, name: body.p_name.trim(), parent: body.p_parent || null }); return ok(id);
  }
  if (p === '/rest/v1/rpc/delete_unit') { const x = db.units.find((y) => y.id === body.p_id); if (!x || !isAdmin(x.org)) return err('accès refusé'); db.units = db.units.filter((y) => y.id !== body.p_id); return ok(null); }
  if (p === '/rest/v1/rpc/create_invitation') {
    if (!isLead(body.p_org)) return err('accès refusé');
    if (body.p_role === 'admin' && !isAdmin(body.p_org)) return err('seul un administrateur peut inviter un administrateur');
    if (db.members.some((x) => x.org === body.p_org && x.email === body.p_email)) return err('cette personne fait déjà partie de l’organisation');
    db.invites.filter((x) => x.org === body.p_org && x.email === body.p_email && !x.used).forEach((x) => { x.revoked = true; });
    const token = crypto.randomBytes(24).toString('hex');
    db.invites.push({ id: crypto.randomUUID(), org: body.p_org, email: body.p_email, role: body.p_role, unit: body.p_unit || null, hash: sha(token), used: false, revoked: false, expires: Date.now() + 7 * 864e5 });
    return ok(token);
  }
  if (p === '/rest/v1/rpc/accept_invitation') {
    const i = db.invites.find((x) => x.hash === sha(body.p_token || ''));
    if (!i) return err('invitation invalide');
    if (i.revoked) return err('invitation annulée');
    if (i.used) return i.usedBy === me.id ? ok(i.org) : err('invitation déjà utilisée');
    if (i.expires < Date.now()) return err('invitation expirée');
    if (i.email !== me.email) return err('cette invitation est destinée à une autre adresse');
    i.used = true; i.usedBy = me.id; db.members.push({ org: i.org, user: me.id, role: i.role, email: me.email, unit: i.unit, onboarded: false }); return ok(i.org);
  }
  if (p === '/rest/v1/rpc/revoke_invitation') { const i = db.invites.find((x) => x.id === body.p_id); if (!i || !isLead(i.org)) return err('accès refusé'); i.revoked = true; return ok(null); }
  if (p === '/rest/v1/rpc/mark_onboarded') { const x = mem(body.p_org); if (!x) return err('accès refusé'); x.onboarded = true; return ok(null); }
  if (p === '/rest/v1/rpc/set_member_unit') { if (!isLead(body.p_org)) return err('accès refusé'); const x = db.members.find((y) => y.org === body.p_org && y.user === body.p_user); x.unit = body.p_unit; return ok(null); }
  // ---- tables
  const org = eq('org_id');
  if (p === '/rest/v1/organizations') { const o = db.orgs.find((x) => x.id === eq('id')); return ok(o && mem(o.id) ? [o] : []); }
  if (p === '/rest/v1/org_units') return ok(mem(org) ? db.units.filter((x) => x.org === org).map((x) => ({ id: x.id, kind: x.kind, name: x.name, parent_id: x.parent })) : []);
  if (p === '/rest/v1/memberships') return ok(isLead(org) ? db.members.filter((x) => x.org === org).map((x) => ({ user_id: x.user, role: x.role, status: 'active', email: x.email, unit_id: x.unit || null })) : []);
  if (p === '/rest/v1/invitations') return ok(isLead(org) ? db.invites.filter((x) => x.org === org && !x.used && !x.revoked).map((x) => ({ id: x.id, email: x.email, role: x.role, unit_id: x.unit, expires_at: new Date(x.expires).toISOString() })) : []);
  if (p === '/rest/v1/knowledge_nodes') return ok(mem(org) ? db.knowledge.filter((x) => x.org === org && (u.searchParams.get('status') !== 'eq.valide' || x.status === 'valide')).map((x) => ({ id: x.id, title: x.title, kind: 'procedure', status: x.status })) : []);
  if (p === '/rest/v1/skills') {
    if (m === 'GET') return ok(mem(org) ? db.skills.filter((x) => x.org === org) : []);
    if (m === 'POST') { if (!isLead(body.org_id)) return err('accès refusé', 403); const s = { id: crypto.randomUUID(), org: body.org_id, name: body.name, description: body.description, importance: body.importance || 2 }; db.skills.push(s); return ok([s], 201); }
    const id = eq('id'); const s = db.skills.find((x) => x.id === id);
    if (!s || !isLead(s.org)) return ok([]);
    if (m === 'PATCH') { Object.assign(s, body); return ok(null, 204); }
    if (m === 'DELETE') { db.skills = db.skills.filter((x) => x.id !== id); return ok(null, 204); }
  }
  if (p === '/rest/v1/skill_knowledge') { if (m === 'POST') { (Array.isArray(body) ? body : [body]).forEach((x) => db.sk.push(x)); return ok(null, 201); } return ok(db.sk.filter((x) => x.org_id === org)); }
  if (p === '/rest/v1/skill_units') {
    if (m === 'POST') { db.su.push(body); return ok(null, 201); }
    if (m === 'DELETE') { db.su = db.su.filter((x) => !(x.skill_id === eq('skill_id') && x.unit_id === eq('unit_id'))); return ok(null, 204); }
    return ok(db.su.filter((x) => x.org_id === org));
  }
  if (p === '/functions/v1/tutor' && body.task === 'competences') {
    if (!isLead(body.org)) return err('accès refusé', 403);
    const ks = db.knowledge.filter((x) => x.org === body.org && x.status === 'valide');
    return ok({ skills: [{ name: 'Accueillir un client', description: 'Salue et propose son aide', knowledge: [ks[0].id] }, { name: 'Conseiller un pain', description: 'Explique les farines', knowledge: ks.map((k) => k.id) }] });
  }
  if (m === 'GET') return ok([]);
  return ok({ message: 'route inconnue' }, 404);
}

const personal = () => ({ version: 2, subjects: [{ id: 'perso1', title: SECRET, color: '#22c55e', icon: 'flask', createdAt: 1, updatedAt: 1, root: { id: 'r1', title: SECRET, notes: 'chimie confidentielle', explain: '', keyPoints: [], exercises: [], srs: null, status: 'todo', collapsed: false, children: [] } }], profile: { done: true, how: 'skip', at: 1 }, settings: {} });

(async () => {
  await new Promise((r) => server.listen(0, r));
  const URL0 = `http://localhost:${server.address().port}/index.html`;
  const browser = await chromium.launch();
  const errors = [];
  async function fresh({ who, blank = false, viewport = { width: 390, height: 844 } } = {}) {
    const ctx = await browser.newContext({ viewport, isMobile: true, hasTouch: true, serviceWorkers: 'block', reducedMotion: 'reduce' });
    const auth = who ? JSON.stringify({ access_token: jwt(who.id), refresh_token: 'rt', expires_at: Date.now() + 3600e3, email: who.email }) : '';
    await ctx.addInitScript(([st, au]) => {
      try { if (!sessionStorage.getItem('s')) { sessionStorage.setItem('s', 1); localStorage.clear(); if (st) localStorage.setItem('arbor:v1', st); if (au) localStorage.setItem('arbor:auth', au); localStorage.setItem('arbor:welcome', '{"how":"test"}'); } } catch (e) { /* about:blank */ }
    }, [blank ? '' : JSON.stringify(personal()), auth]);
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    await page.route(`${SB}/**`, async (route) => {
      const isUpd = route.request().url().endsWith('/rpc/update_organization');
      if (isUpd && fault.offline) return route.abort('internetdisconnected');
      if (isUpd && fault.delay) await new Promise((r) => setTimeout(r, fault.delay));
      return route.fulfill(handle(route.request())).catch(() => {});
    });
    return { ctx, page };
  }
  const settle = (page, ms = 700) => page.waitForTimeout(ms);
  const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
  const shots = process.env.ARBOR_SHOTS;
  const shot = async (page, n) => { if (shots) await page.screenshot({ path: path.join(shots, `biz-${n}.png`) }); };
  let orgId = '', inviteBob = '';

  /* A. L'administrateur crée son organisation avec l'assistant */
  {
    const { ctx, page } = await fresh({ who: people.alice });
    await page.goto(`${URL0}#/org/nouvelle/detaillee`); await settle(page, 900);
    check('A1 l’assistant détaillé s’ouvre à l’étape 1 sur 6, avec une seule décision', /Étape 1 sur 6/.test(await page.textContent('.obz-count')) && (await page.$$('.obz-steps span')).length === 6);
    await page.click('#obzNext'); await settle(page, 300);
    check('A2 le nom est le seul champ obligatoire, et l’erreur s’affiche sous le champ', /Indique le nom/.test(await page.textContent('#obNameErr')) && db.orgs.length === 0);
    await page.fill('#obName', 'Boulangerie Martin'); await page.selectOption('#obSector', 'Commerce et distribution');
    await page.click('.obz-chips label:has-text("11 à 50")'); await page.fill('#obCountry', 'France'); await page.selectOption('#obLang', 'fr');
    check('A3 pas de débordement sur téléphone', await noOverflow(page));
    await shot(page, '1-infos');
    await page.click('#obzNext'); await settle(page, 1200);
    orgId = (page.url().match(/#\/org\/([0-9a-f-]{36})/) || [])[1] || '';
    const cr = db.calls.find((c) => c[0] === 'create');
    check('A4 organisation créée avec taille, pays, langue ; on passe à l’étape 2', !!orgId && cr && cr[1].p_size === '11-50' && cr[1].p_country === 'France' && cr[1].p_language === 'fr' && /Étape 2 sur 6/.test(await page.textContent('.obz-count')));
    check('A5 l’étape franchie est enregistrée dans la base (reprise possible)', (db.orgs[0].setup || {}).step === 'objectifs');
    await page.click('.obz-goal[data-g="vente"]'); await page.click('.obz-goal[data-g="procedures"]'); await page.fill('#obOther', 'Hygiène en boutique');
    await shot(page, '2-objectifs');
    await page.click('#obzNext'); await settle(page, 900);
    check('A6 objectifs multiples et réponse libre enregistrés', JSON.stringify(db.orgs[0].goals) === JSON.stringify(['procedures', 'vente', 'Hygiène en boutique']), JSON.stringify(db.orgs[0].goals));
    // Structure
    await page.fill('.obz-add[data-kind="etablissement"] input', 'Lyon Croix-Rousse'); await page.click('.obz-add[data-kind="etablissement"] .btn'); await settle(page, 700);
    await page.fill('.obz-add[data-kind="equipe"] input', 'Vente'); await page.selectOption('.obz-add[data-kind="equipe"] select', { label: 'Lyon Croix-Rousse' }); await page.click('.obz-add[data-kind="equipe"] .btn'); await settle(page, 700);
    await page.fill('.obz-add[data-kind="equipe"] input', 'Vente'); await page.click('.obz-add[data-kind="equipe"] .btn'); await settle(page, 600);
    check('A7 établissement et équipe créés ; un doublon est refusé avec un message', db.units.length === 2 && db.units.find((x) => x.kind === 'equipe').parent === db.units.find((x) => x.kind === 'etablissement').id && /existe déjà/.test(await page.textContent('#obMsg')));
    await shot(page, '3-structure');
    await page.click('#obzNext'); await settle(page, 900);
    // Connaissances : le module Documents existant est intégré
    check('A8 étape Connaissances : le parcours du document (6 temps jusqu’à la validation humaine) et l’import existant', (await page.$$('.obz-flow li')).length === 6 && /Validation humaine/.test(await page.textContent('.obz-flow')) && !!(await page.$('#obDocs')));
    await shot(page, '4-connaissances');
    // on simule deux connaissances validées (l'extraction réelle est testée dans tests/org-docs.js)
    db.knowledge.push({ id: crypto.randomUUID(), org: orgId, title: 'Saluer dans les 30 secondes', status: 'valide' }, { id: crypto.randomUUID(), org: orgId, title: 'Farine T80', status: 'valide' });
    await page.click('#obzNext'); await settle(page, 1000);
    // Compétences
    await page.click('#skPropose'); await settle(page, 900);
    check('A9 propositions de compétences à partir des connaissances validées, rien n’est ajouté sans accord', (await page.$$('.sk-props [data-p]')).length === 2 && db.skills.length === 0);
    await page.selectOption('.sk-props [data-p="0"] [data-pimp]', '3'); await page.click('.sk-props [data-p="0"] [data-keep]'); await settle(page, 700);
    await page.click('.sk-props [data-p="1"] [data-drop]'); await settle(page, 200);
    check('A10 une proposition gardée (importance « essentielle », connaissances liées), l’autre écartée', db.skills.length === 1 && db.skills[0].importance === 3 && db.sk.length === 1);
    await settle(page, 600);
    await page.click('#skManual'); await page.fill('#skName', 'Encaisser'); await page.check('.sk-kpick input >> nth=1'); await page.click('#skNew .btn'); await settle(page, 900);
    check('A11 compétence ajoutée à la main, reliée à une connaissance', db.skills.length === 2 && db.sk.length === 2);
    await page.click('.sk-row >> nth=0 >> summary'); await page.check('.sk-row >> nth=0 >> [data-team]'); await settle(page, 500);
    await page.selectOption('.sk-row >> nth=1 >> [data-imp]', '1'); await settle(page, 500);
    check('A12 équipe concernée et importance modifiées', db.su.length === 1 && db.skills[1].importance === 1);
    page.once('dialog', (dg) => dg.accept());
    await page.click('.sk-row >> nth=1 >> [data-rm]'); await settle(page, 900);
    check('A13 une compétence se supprime', db.skills.length === 1);
    await shot(page, '5-competences');
    await page.click('#obzNext'); await settle(page, 1000);
    // Invitations
    check('A14 étape Invitations : rôle et équipe au choix', await page.isVisible('#ivRole') && await page.isVisible('#ivUnit'));
    await page.fill('#ivEmail', 'bob@boulangerie.fr'); await page.selectOption('#ivUnit', { label: 'Vente' }); await page.click('#ivForm .btn'); await settle(page, 700);
    inviteBob = await page.inputValue('#oiLink').catch(() => '');
    check('A15 lien d’invitation créé avec l’équipe ; partage par la messagerie de l’administrateur', /#\/rejoindre\/[0-9a-f]{48}$/.test(inviteBob) && db.invites[0].unit === db.units.find((x) => x.name === 'Vente').id && /^mailto:bob%40boulangerie\.fr/.test(await page.getAttribute('#ivOut a[href^="mailto:"]', 'href')));
    await page.fill('#ivEmail', 'alice@boulangerie.fr'); await page.click('#ivForm .btn'); await settle(page, 600);
    check('A16 inviter quelqu’un qui est déjà membre : message clair', /déjà partie/.test(await page.textContent('#ivErr')));
    await shot(page, '6-invitations');
    await page.click('#obzNext'); await settle(page, 1200);
    check('A17 fin : organisation prête, état honnête (connaissances, compétences, membres) et première simulation proposée', /est prête/.test(await page.textContent('.obz-end')) && /2 connaissances validées/.test(await page.textContent('.obz-check')) && !!(await page.$('.obz-next a[href$="/mystere"]')) && db.orgs[0].setup.done === true);
    await shot(page, '7-fin');
    check('A18 rien de l’espace personnel n’est parti vers le serveur', !sent.some((x) => x.body.includes(SECRET) || x.body.includes('chimie confidentielle')));
    await ctx.close();
  }

  /* B. Reprise : configuration commencée puis abandonnée */
  {
    db.orgs[0].setup = { step: 'structure' };
    const { ctx, page } = await fresh({ who: people.alice });
    await page.goto(`${URL0}#/org/${orgId}`); await settle(page, 1000);
    check('B1 l’accueil de l’organisation propose de reprendre à l’étape où l’on s’était arrêté', /Reprendre la configuration/.test(await page.textContent('.obz-resume')) && /Étape 3 sur 6/.test(await page.textContent('.obz-resume')));
    await page.click('.obz-resume'); await settle(page, 900);
    check('B2 la reprise ouvre la bonne étape, avec les équipes déjà créées', /Étape 3 sur 6/.test(await page.textContent('.obz-count')) && /Lyon Croix-Rousse/.test(await page.textContent('.obz-units')));
    await page.goto(`${URL0}#/org/${orgId}/configurer/infos`); await settle(page, 900);
    check('B3 l’étape 1 rouverte montre les informations enregistrées', (await page.inputValue('#obName')) === 'Boulangerie Martin' && (await page.inputValue('#obCountry')) === 'France');
    db.orgs[0].setup = { step: 'fin', done: true };
    await ctx.close();
  }

  /* B'. Persistance : on ne passe jamais à l'étape suivante si l'enregistrement échoue (réseau, serveur, délai, double clic) */
  {
    const { ctx, page } = await fresh({ who: people.alice });
    await page.addInitScript(() => { window.ARBOR_SAVE_TIMEOUT = 800; });
    db.orgs[0].setup = { step: 'objectifs' };
    await page.goto(`${URL0}#/org/${orgId}/configurer/objectifs`); await settle(page, 900);
    const goal = page.locator('.obz-goal').nth(1);
    if ((await goal.getAttribute('aria-pressed')) !== 'true') await goal.click();
    const stepNow = async () => (await page.textContent('.obz-count')).match(/Étape (\d)/)[1];
    const setupCalls = () => db.calls.filter((c) => c[0] === 'update' && c[1].p_setup).length;
    fault.server = true; let before = setupCalls();
    await page.click('#obzNext'); await settle(page, 700);
    check('P1 refus serveur : on reste à l’étape 2, message clair, saisie conservée, rien d’enregistré', (await stepNow()) === '2' && /n’est pas enregistrée/.test(await page.textContent('.obz')) && (await goal.getAttribute('aria-pressed')) === 'true' && db.orgs[0].setup.step === 'objectifs' && setupCalls() === before);
    check('P2 le bouton reste utilisable pour réessayer', !(await page.isDisabled('#obzNext')));
    fault.server = false; fault.offline = true;
    await page.click('#obzNext'); await settle(page, 700);
    check('P3 hors ligne : on reste à l’étape 2, avec « Pas de connexion »', (await stepNow()) === '2' && /Pas de connexion/.test(await page.textContent('#obzSaveErr')) && db.orgs[0].setup.step === 'objectifs');
    fault.offline = false; fault.delay = 2500;
    await page.click('#obzNext'); await settle(page, 1300);
    check('P4 délai dépassé : on reste à l’étape 2 et on le dit', (await stepNow()) === '2' && /trop de temps/.test(await page.textContent('#obzSaveErr')));
    await settle(page, 2000); // la réponse tardive arrive ; elle ne fait pas avancer l'écran
    check('P5 une réponse tardive ne fait pas avancer l’écran tout seul', (await stepNow()) === '2');
    fault.delay = 500; before = setupCalls();
    await page.dblclick('#obzNext'); await page.click('#obzNext').catch(() => {}); await settle(page, 1600);
    check('P6 réessai réussi après un double clic : une seule sauvegarde, puis l’étape 3', (await stepNow()) === '3' && setupCalls() === before + 1 && db.orgs[0].setup.step === 'structure', `${setupCalls() - before} sauvegarde(s)`);
    fault.delay = 0;
    db.orgs[0].setup = { step: 'fin', done: true };
    await ctx.close();
  }

  /* C. Le collaborateur : aperçu de l'invitation, compte, arrivée, diagnostic */
  {
    const { ctx, page } = await fresh({ blank: true });
    await page.goto(URL0 + inviteBob.slice(inviteBob.indexOf('#'))); await settle(page, 1000);
    const txt = await page.textContent('#app');
    check('C1 avant toute connexion : organisation, rôle, équipe et adresse masquée', /Boulangerie Martin/.test(txt) && /Collaborateur/.test(txt) && /Vente/.test(txt) && /bo•••@boulangerie\.fr/.test(txt) && !(await page.isVisible('.onb')));
    await shot(page, 'c1-invitation');
    await page.click('#jnLogin'); await settle(page, 400);
    await page.fill('#welEmail', people.bob.email); await page.fill('#welPass', people.bob.pass); await page.click('.wel-submit'); await settle(page, 1600);
    check('C2 connecté : invitation acceptée, arrivée du collaborateur (et non l’accueil Student)', /\/bienvenue$/.test(page.url()) && /Bienvenue dans Boulangerie Martin/.test(await page.textContent('.obz-arrival')) && /équipe/.test(await page.textContent('.obz-arrival')) && /Vente/.test(await page.textContent('.obz-arrival')), page.url());
    await shot(page, 'c2-bienvenue');
    check('C3 il voit la promesse et les compétences au programme, sur le même écran', /Tes résultats t’aident à progresser\. Ton espace personnel reste privé\./.test(await page.textContent('.obz-arrival')) && /Accueillir un client/.test(await page.textContent('.obz-arrival')));
    await page.click('.obz-privacy-box summary'); await settle(page, 300);
    const priv = await page.textContent('.obz-privacy');
    check('C4 il sait ce qui est observé, qui voit ses résultats, que ses collègues ne voient jamais ses erreurs et que son espace personnel reste privé', /Observé/.test(priv) && /managers et administrateurs/.test(priv) && /jamais tes erreurs/.test(priv) && /espace personnel/.test(priv));
    await shot(page, 'c4-confidentialite');
    check('C5 un seul écran, un seul bouton « C’est parti », rien à configurer', !(await page.$('.obz-dots')) && !(await page.$('#arNext')) && !(await page.$('.obz-form')) && /C’est parti/.test(await page.textContent('#arGo')));
    await page.click('#arGo'); await settle(page, 1000);
    check('C6 il arrive sur son accueil ; la présentation est notée comme vue', new RegExp(`#/org/${orgId}$`).test(page.url()) && db.members.find((x) => x.user === people.bob.id).onboarded === true, page.url());
    await page.goto(`${URL0}#/org/${orgId}`); await settle(page, 900);
    check('C7 la présentation ne revient pas', !(await page.isVisible('.obz-arrival')) && await page.isVisible('.org-head'));
    check('C8 un collaborateur n’a ni configuration ni équipe', !(await page.$('a[href*="/configurer"]')) && !(await page.$('.org-tabs a[href$="/equipe"]')));
    await page.goto(`${URL0}#/org/${orgId}/configurer/invitations`); await settle(page, 800);
    check('C9 même en tapant l’adresse, la configuration est refusée', /réservée aux administrateurs/.test(await page.textContent('#app')) && !(await page.$('#ivForm')));
    await ctx.close();
  }

  /* D. Liens d'invitation : utilisé, expiré, annulé, autre adresse */
  {
    const { ctx, page } = await fresh({ blank: true });
    await page.goto(URL0 + inviteBob.slice(inviteBob.indexOf('#'))); await settle(page, 900);
    check('D1 lien déjà utilisé (par quelqu’un d’autre ou sans être connecté) : message dédié', /déjà utilisée/.test(await page.textContent('#app')));
    const t2 = crypto.randomBytes(24).toString('hex');
    db.invites.push({ id: crypto.randomUUID(), org: orgId, email: 'old@boulangerie.fr', role: 'member', unit: null, hash: sha(t2), used: false, revoked: false, expires: Date.now() - 1000 });
    await page.goto(`${URL0}#/rejoindre/${t2}`); await settle(page, 900);
    check('D2 lien expiré : message dédié, et rien à saisir', /expirée/.test(await page.textContent('#app')) && !(await page.$('#jnLogin')));
    const t3 = crypto.randomBytes(24).toString('hex');
    db.invites.push({ id: crypto.randomUUID(), org: orgId, email: 'annule@boulangerie.fr', role: 'member', unit: null, hash: sha(t3), used: false, revoked: true, expires: Date.now() + 1e8 });
    await page.goto(`${URL0}#/rejoindre/${t3}`); await settle(page, 900);
    check('D3 lien annulé : message dédié', /annulée/.test(await page.textContent('#app')));
    await page.goto(`${URL0}#/rejoindre/${'ab'.repeat(24)}`); await settle(page, 900);
    check('D4 lien inconnu : message dédié', /ne correspond à aucune invitation/.test(await page.textContent('#app')));
    await ctx.close();
  }
  {
    const t4 = crypto.randomBytes(24).toString('hex');
    db.invites.push({ id: crypto.randomUUID(), org: orgId, email: 'cleo@boulangerie.fr', role: 'member', unit: null, hash: sha(t4), used: false, revoked: false, expires: Date.now() + 1e8 });
    const { ctx, page } = await fresh({ who: people.zoe });
    await page.goto(`${URL0}#/rejoindre/${t4}`); await settle(page, 1200);
    check('D5 connecté avec une autre adresse : refus expliqué, avec l’adresse attendue masquée', /autre adresse/.test(await page.textContent('#app')) && /cl•••@boulangerie\.fr/.test(await page.textContent('#app')) && !db.members.some((x) => x.user === people.zoe.id));
    await ctx.close();
  }

  /* E. Équipe : ranger un membre dans une équipe ; onglet Compétences avec le même éditeur */
  {
    const { ctx, page } = await fresh({ who: people.alice });
    await page.goto(`${URL0}#/org/${orgId}/equipe`); await settle(page, 1000);
    await page.selectOption(`[data-unit="${people.bob.id}"]`, { label: 'Lyon Croix-Rousse' }); await settle(page, 600);
    check('E1 l’administrateur change l’équipe d’un membre', db.members.find((x) => x.user === people.bob.id).unit === db.units.find((x) => x.kind === 'etablissement').id);
    await page.goto(`${URL0}#/org/${orgId}/competences`); await settle(page, 1000);
    check('E2 l’onglet Compétences utilise l’éditeur complet (importance, équipes, suppression)', !!(await page.$('.sk-row [data-imp]')) && !!(await page.$('.sk-row [data-rm]')));
    check('E3 pas de débordement sur téléphone', await noOverflow(page));
    await ctx.close();
  }

  check('Z aucune erreur JavaScript', errors.length === 0, errors.join(' | '));
  await browser.close(); server.close();
  console.log(failed ? `\n${failed} échec(s)` : '\nTous les tests passent');
  process.exit(failed ? 1 : 0);
})();
