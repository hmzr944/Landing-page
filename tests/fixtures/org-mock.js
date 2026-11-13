/* Bouchon Supabase de l'espace pro (contrats des migrations 003 à 009 et de la fonction tutor), partagé par les tests
   navigateur de l'Experience Architecture et par les captures d'écran. Aucune logique métier réelle ici : la logique
   serveur est testée par Deno, les règles d'accès par tests/db-rls.js. */
const crypto = require('crypto');
const SB = 'https://nnqtgwgwalbbhqzceged.supabase.co';
const jwt = (sub) => `x.${Buffer.from(JSON.stringify({ sub })).toString('base64url')}.y`;
const ORG = '44444444-4444-4444-8444-444444444444';
const U = { bob: { id: 'u-bob', role: 'member', email: 'bob@magasin.fr' }, chloe: { id: 'u-chloe', role: 'member', email: 'chloe@magasin.fr' }, eve: { id: 'u-eve', role: 'manager', email: 'eve@magasin.fr' }, ana: { id: 'u-ana', role: 'admin', email: 'ana@magasin.fr' }, paul: { id: 'u-paul', role: 'expert', email: 'paul@magasin.fr' } };
const tokens = Object.fromEntries(Object.values(U).map((u) => [jwt(u.id), u]));
const K = [
  { id: 'k-autonomie', kind: 'produit', title: 'Autonomie de l’Alto 500', body: '90 km en mode éco.', quote: 'Son autonomie annoncée est de 90 km en mode éco', page: 1, status: 'valide', source_version_id: 'v1' },
  { id: 'k-batterie', kind: 'sensible', title: 'Batterie endommagée', body: 'Ne jamais recharger une batterie endommagée.', quote: 'Ne jamais recharger une batterie endommagée', page: 2, status: 'valide', source_version_id: 'v1' },
  { id: 'k-retour', kind: 'regle', title: 'Délai de retour', body: '30 jours pour un retour.', quote: 'Le client dispose de 30 jours pour un retour', page: 2, status: 'valide', source_version_id: 'v1' },
];
const iso = (d) => new Date(Date.now() - d * 864e5).toISOString();
const fresh = () => ({
  no008: false, mail: false, sent: [], calls: [],
  scenarios: [], versions: [],
  evidence: [
    { user_id: 'u-bob', knowledge_id: 'k-autonomie', activity: 'simulation', outcome: 'juste', level: 4, context: 'simulation:client', session_id: 's1', at: iso(3) },
    { user_id: 'u-bob', knowledge_id: 'k-retour', activity: 'diagnostic', outcome: 'juste', level: 2, confidence: 'sait', at: iso(3) },
    { user_id: 'u-bob', knowledge_id: 'k-batterie', activity: 'diagnostic', outcome: 'faux', confidence: 'sait', at: iso(2) },
    { user_id: 'u-chloe', knowledge_id: 'k-batterie', activity: 'diagnostic', outcome: 'faux', confidence: 'reflexe', at: iso(2) },
    { user_id: 'u-chloe', knowledge_id: 'k-batterie', activity: 'simulation', outcome: 'juste', at: iso(1) },
    { user_id: 'u-chloe', knowledge_id: 'k-retour', activity: 'simulation', outcome: 'non_documente', at: iso(1) },
  ],
  skills: [{ id: 'sk1', name: 'Conseiller un vélo', description: '', importance: 3 }, { id: 'sk2', name: 'Manipuler les batteries en sécurité', description: '', importance: 2 }],
  links: [{ skill_id: 'sk1', knowledge_id: 'k-autonomie' }, { skill_id: 'sk1', knowledge_id: 'k-retour' }, { skill_id: 'sk2', knowledge_id: 'k-batterie' }],
  actions: [{ id: 'a1', user_id: 'u-bob', kind: 'revalidation', reason: 'La procédure de retour a changé : refais la mise en situation.', status: 'a_faire', due: null, created_at: iso(1) }],
  edges: [],
  items: [
    { id: 'it1', change_id: 'ch1', change: 'modifie', knowledge_id: 'k-retour', sensitive: false, new_title: 'Délai de retour', new_quote: 'Le client dispose de 14 jours pour un retour', new_page: 2, explanation: 'Le délai passe de 30 à 14 jours.', decision: 'a_valider' },
    { id: 'it2', change_id: 'ch1', change: 'nouveau', knowledge_id: null, sensitive: true, new_title: 'Stockage des batteries', new_quote: 'Les batteries sont stockées dans l’armoire ignifugée', new_page: 3, explanation: '', decision: 'a_valider' },
    { id: 'it3', change_id: 'ch1', change: 'inchange', knowledge_id: 'k-autonomie', sensitive: false, decision: 'accepte' },
  ],
  retention: 365,
  revals: [{ id: 'rv1', user_id: 'u-bob', skill_id: 'sk1', knowledge_id: 'k-retour', new_knowledge_id: null, change_id: 'ch1', change_item_id: 'it1', reason: 'La règle « Délai de retour » a changé : maintenant « 14 jours ».', status: 'requires_revalidation', created_at: iso(0) }],
  feedback: [], no010: false, feedbackFail: false,
  // Arbor League (011) : réponses simulées des fonctions de la base (la logique réelle est testée par tests/db-rls.js, section L)
  no011: false,
  awards: [{ user_id: 'u-bob', trophy: 'premiere_pousse', knowledge_id: 'k-autonomie', evidence_id: 1, at: iso(3) }, { user_id: 'u-chloe', trophy: 'resilience', knowledge_id: 'k-batterie', evidence_id: 5, at: iso(1) }],
  ranks: { 'u-bob': 2, 'u-chloe': 2 },
  cordees: [], mentorships: [], season: null, challenges: [], leagueCalls: [],
  oos: [{ id: 'oo1', user_id: 'u-chloe', claim: 'On peut aussi passer par la borne en caisse 3', context: 'simulation:client', rationale: 'pratique de terrain plausible', status: 'a_examiner', created_at: iso(1) }],
});
let db = fresh();
const state = { get db() { return db; }, reset() { db = fresh(); return db; } };
const MISSING = { code: 'PGRST205', message: "Could not find the table 'public.x' in the schema cache" };

function fn(me, b) {
  // Dialogue avec Pousse (portes d'entrée) : même contrat que le tuteur Student
  if (b.mode) return { reply: b.mode === 'enseigne' && b.message ? 'Bon début : il manque la durée exacte.' : `Que sais-tu de « ${b.notion.title} » ?`, verdict: b.message ? 'partiel' : 'sans_reponse', citations: b.message ? [{ quote: b.passages[0].text.slice(0, 40), page: b.passages[0].page }] : [], correct_points: b.mode === 'enseigne' && b.message ? ['Il faut le ticket'] : [], missing: b.mode === 'enseigne' && b.message ? ['Le délai est de 30 jours'] : [], done: false, next_activity: 'continuer', misconception: '', hint_level: 0, citations_dropped: 0 };
  const lead = ['admin', 'manager'].includes(me.role);
  if (b.task === 'scenario_concevoir') {
    if (!lead) return [403, { error: 'accès refusé' }];
    const spec = { name: 'M. Martin', role_play: 'un client qui rapporte un vélo sans ticket', role_label: 'Conseiller de vente', context: 'Samedi, 17 h, file d’attente à la caisse.', objective: 'Appliquer la procédure de retour sans perdre le client.', need: 'Il a besoin du vélo lundi pour aller travailler.', objections: [{ text: 'Je n’ai pas le ticket' }], constraints: ['Pas de remboursement sans preuve d’achat'], events: [{ turn: 1, text: 'Un autre client s’impatiente derrière.' }], rubric: [{ id: 'procedure', label: 'Applique la procédure de retour' }, { id: 'calme', label: 'Garde son calme' }], opening: 'Bonjour, je veux rendre ce vélo.', knowledge: [{ id: 'k-retour', title: 'Délai de retour' }] };
    db.scenarios.push({ id: 'sc1', title: 'Retour sans ticket', kind: b.kind, status: 'brouillon', current_version: 1 });
    db.versions.push({ id: 'ver1', scenario_id: 'sc1', version: 1, status: 'brouillon', spec, created_at: iso(0) });
    return { scenario: 'sc1', version: 'ver1', title: 'Retour sans ticket', spec };
  }
  if (b.task === 'scenario_start') {
    const v = db.versions.find((x) => x.id === b.version);
    if (!v || (v.status !== 'valide' && !lead)) return [404, { error: 'scénario introuvable' }];
    db.turns = 0;
    return { id: 'sess1', opening: v.spec.opening, client: { name: v.spec.name, style: 'scenario' }, scenario: { context: v.spec.context, objective: v.spec.objective, role_label: v.spec.role_label, constraints: v.spec.constraints } };
  }
  if (b.task === 'mystere_tour') { db.turns++; return { reply: db.turns >= 2 ? 'Bon, d’accord, merci.' : 'Je n’ai pas le ticket, mais je l’ai acheté ici !', ended: db.turns >= 2, turn: db.turns, event: db.turns === 1 ? 'Un autre client s’impatiente derrière.' : null }; }
  if (b.task === 'mystere_fin') return { debrief: { outcome: 'satisfait', turns: 2, need: { found: true, text: 'Il a besoin du vélo lundi' }, objections: [], behaviors: [{ id: 'procedure', label: 'Applique la procédure de retour', observed: true, evidence: 'Je regarde votre achat dans notre système' }],
    correct: [], incorrect: [], undocumented: [], insufficient: [{ text: 'on peut sûrement s’arranger', quote: 'Le client dispose de 30 jours pour un retour' }], events: [{ turn: 1, text: 'Un autre client s’impatiente derrière.' }], note: 'Une simulation réussie ne suffit pas à valider une compétence.' } };
  if (b.task === 'relations') { if (!lead) return [403, { error: 'accès refusé' }]; db.edges.push({ id: 'e1', from_id: 'k-retour', to_id: 'k-batterie', relation: 'confusion_frequente', status: 'propose', method: 'ia', note: 'Les deux procédures se suivent au comptoir.' }); return { proposed: 1 }; }
  if (b.task === 'invitation_envoyer') { if (!db.mail) return [501, { error: 'envoi par e-mail non configuré : partage le lien' }]; return { sent: true }; }
  return [400, { error: 'tâche inconnue' }];
}
function rpc(me, name, b) {
  const lead = ['admin', 'manager'].includes(me.role);
  if (name === 'my_organizations') return [{ id: ORG, name: 'Magasin de Lyon', sector: 'Commerce', role: me.role }];
  if (db.no008 && !['create_invitation'].includes(name)) return [404, MISSING];
  if (name === 'scenario_spec') return db.versions.find((v) => v.id === b.p_version).spec;
  if (name === 'publish_scenario_version') { const v = db.versions.find((x) => x.id === b.p_version); v.status = 'valide'; const s = db.scenarios.find((x) => x.id === v.scenario_id); s.status = 'publie'; return null; }
  if (name === 'decide_change_item') { const it = db.items.find((x) => x.id === b.p_item); if (it.sensitive && !lead) return [403, { message: 'manager requis' }]; it.decision = b.p_decision; it.decided_at = new Date().toISOString(); return null; }
  if (name === 'policy_change_impact') return { knowledge: 1, skills: [{ id: 'sk1', name: 'Conseiller un vélo' }], scenarios: [{ id: 'sc1', title: 'Retour sans ticket' }], people: ['u-bob', 'u-chloe'] };
  if (name === 'assign_learning_actions') { if (!lead) return [403, { message: 'accès refusé' }]; return b.p_users.length; }
  if (name === 'set_action_status') { const a = db.actions.find((x) => x.id === b.p_id); a.status = b.p_status; return null; }
  if (name === 'set_edge_status') { db.edges.find((x) => x.id === b.p_id).status = b.p_status; return null; }
  if (name === 'record_human_validation') { if (!lead || b.p_user === me.id) return [403, { message: 'accès refusé' }]; db.evidence.push({ user_id: b.p_user, skill_id: b.p_skill, activity: 'validation_humaine', outcome: b.p_outcome, level: 5, at: new Date().toISOString() }); return null; }
  if (name === 'export_my_org_data') return { organization: ORG, evidence: db.evidence.filter((e) => e.user_id === me.id), actions: db.actions.filter((a) => a.user_id === me.id) };
  if (name === 'erase_my_org_data') { const n = db.evidence.filter((e) => e.user_id === me.id).length; db.evidence = db.evidence.filter((e) => e.user_id !== me.id); return { evidence: n, simulations: 1, actions: 1 }; }
  if (name === 'set_retention') { if (me.role !== 'admin') return [403, { message: 'accès refusé' }]; db.retention = b.p_days; return null; }
  if (name === 'create_invitation') return 'ab'.repeat(24);
  if (/^(my_league|league_)/.test(name)) {
    if (db.no011) return [404, { code: 'PGRST202', message: `Could not find the function public.${name}` }];
    db.leagueCalls.push([me.id, name, b]);
    const memberIds = Object.values(U).map((u) => u.id);
    if (name === 'my_league') {
      const mine = db.awards.filter((a) => a.user_id === me.id);
      const K = { 'k-autonomie': 'Autonomie de l’Alto 500', 'k-batterie': 'Batterie endommagée', 'k-retour': 'Délai de retour' };
      return { rank: db.ranks[me.id] || 1, applied: mine.length ? 1 : 0, durable: mine.filter((a) => a.trophy === 'feuille_or').length, transfer: 0,
        next: { rank: (db.ranks[me.id] || 1) + 1, label: 'Arbuste', min_applied: 3, min_durable: 1, min_transfer: 0 },
        awards: mine.map((a) => ({ trophy: a.trophy, knowledge: K[a.knowledge_id] || null, knowledge_id: a.knowledge_id, evidence_id: a.evidence_id, evidence: { activity: 'simulation', context: 'simulation:client', at: a.at }, at: a.at })), ranks: [] };
    }
    if (name === 'league_board') {
      return { members: Object.values(U).map((u) => ({ user_id: u.id, name: u.email.split('@')[0], rank: db.ranks[u.id] || 1,
          trophies: Object.values(db.awards.filter((a) => a.user_id === u.id).reduce((acc, a) => { (acc[a.trophy] = acc[a.trophy] || { trophy: a.trophy, count: 0, last: a.at }).count++; return acc; }, {})), season_awards: 0 })),
        cordees: db.cordees, season: db.season, challenges: db.challenges, past_seasons: [] };
    }
    const lead2 = ['admin', 'manager'].includes(me.role);
    if (!lead2) return [403, { message: 'accès refusé' }];
    if (name === 'league_save_cordee') { const c = { id: `c${db.cordees.length + 1}`, name: b.p_name, kind: b.p_kind, members: (b.p_members || []).filter((x) => memberIds.includes(x)).length, member_ids: (b.p_members || []).filter((x) => memberIds.includes(x)), trophies: 0, applied: 0 }; db.cordees.push(c); return c.id; }
    if (name === 'league_start_mentorship') {
      if (b.p_mentor === b.p_mentee) return [400, { message: 'un mentor accompagne une autre personne' }];
      if (!db.awards.some((a) => a.user_id === b.p_mentor)) return [400, { message: 'le mentor doit avoir appliqué cette connaissance' }];
      const m = { id: `m${db.mentorships.length + 1}`, mentor_id: b.p_mentor, mentee_id: b.p_mentee, knowledge_id: b.p_knowledge, status: 'actif', started_at: new Date().toISOString() }; db.mentorships.push(m); return m.id;
    }
    if (name === 'league_create_season') { db.season = { id: 'se1', name: b.p_name, starts_at: b.p_starts, ends_at: b.p_ends }; return 'se1'; }
    if (name === 'league_create_challenge') { db.challenges.push({ id: `ch${db.challenges.length + 1}`, title: b.p_title, cordee_id: b.p_cordee, target_ratio: b.p_ratio, achieved_at: null, knowledge: ['Délai de retour'] }); return 'ok'; }
    return [404, { message: `rpc inconnue ${name}` }];
  }
  if (name === 'review_out_of_scope') { if (!['admin', 'manager', 'expert'].includes(me.role)) return [403, { message: 'accès refusé' }]; db.oos.find((x) => x.id === b.p_id).status = b.p_status; return null; }
  if (name === 'cancel_revalidation') { if (!lead) return [403, { message: 'accès refusé' }]; db.revals.find((x) => x.id === b.p_id).status = 'annulee'; return null; }
  return [404, { message: `rpc inconnue ${name}` }];
}
function handle(r) {
  const u = new URL(r.url()); const p = u.pathname; const raw = r.postData() || '';
  const me = tokens[(r.headers().authorization || '').replace('Bearer ', '')];
  const ok = (data, status = 200) => ({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: data === undefined || data === null ? (status === 200 ? 'null' : '') : JSON.stringify(data) });
  if (!me) return ok({ message: 'JWT invalide' }, 401);
  const b = raw ? JSON.parse(raw) : {};
  db.sent.push({ path: p, query: u.search, body: b, user: me.id });
  const lead = ['admin', 'manager'].includes(me.role);
  const eq = (k) => (u.searchParams.get(k) || '').replace(/^eq\./, '');
  const out = (x) => (Array.isArray(x) && typeof x[0] === 'number' ? ok(x[1], x[0]) : ok(x));
  if (p.startsWith('/rest/v1/rpc/')) return out(rpc(me, p.slice(13), b));
  if (p === '/functions/v1/tutor') { const x = fn(me, b); return Array.isArray(x) ? ok(x[1], x[0]) : ok({ ...x, usage: { used: 1, limit: 400 } }); }
  const T008 = ['/rest/v1/scenarios', '/rest/v1/scenario_versions', '/rest/v1/learning_actions', '/rest/v1/knowledge_edges', '/rest/v1/policy_changes', '/rest/v1/policy_change_items'];
  if (db.no008 && T008.includes(p)) return ok(MISSING, 404);
  if (p === '/rest/v1/evidence_events') return ok(db.evidence.filter((e) => (lead || e.user_id === me.id) && (!eq('user_id') || e.user_id === eq('user_id'))));
  if (p === '/rest/v1/knowledge_nodes') { const ids = (u.searchParams.get('id') || '').match(/^in\.\((.*)\)$/); return ok(K.filter((k) => !ids || ids[1].split(',').includes(k.id))); }
  if (p === '/rest/v1/memberships') { const all = Object.values(U).map((x) => ({ user_id: x.id, role: x.role, email: x.email, status: 'active', unit_id: null })); return ok(all.filter((m) => (lead || m.user_id === me.id) && (!eq('user_id') || m.user_id === eq('user_id')))); }
  if (p === '/rest/v1/skills') return ok(db.skills);
  if (p === '/rest/v1/skill_knowledge') return ok(db.links);
  if (p === '/rest/v1/skill_units' || p === '/rest/v1/org_units') return ok([]);
  if (p === '/rest/v1/learning_actions') return ok(db.actions.filter((a) => a.user_id === me.id));
  if (p === '/rest/v1/scenarios') return ok(db.scenarios.filter((s) => (lead || s.status === 'publie') && (!eq('status') || s.status === eq('status'))));
  if (p === '/rest/v1/scenario_versions') return ok(db.versions.filter((v) => (lead || v.status === 'valide') && (!eq('status') || v.status === eq('status'))).map(({ spec, ...v }) => v)); // spec jamais lisible ici
  if (p === '/rest/v1/knowledge_edges') return ok(db.edges.filter((e) => lead || e.status === 'valide'));
  if (p === '/rest/v1/sources') return ok([{ id: 'src1', title: 'Procédure retours', current_version: 2 }]);
  if (p === '/rest/v1/source_versions') return ok([{ id: 'v1', version: 1, page_count: 3 }, { id: 'v2', version: 2, page_count: 3 }]);
  if (p === '/rest/v1/policy_changes') return ok(lead || me.role === 'expert' ? [{ id: 'ch1', status: 'ouvert', to_version_id: 'v2', created_at: iso(0), summary: { modifie: 1, supprime: 0, nouveau: 1, reformule: 0, inchange: 1, analysed: true } }] : []);
  if (p === '/rest/v1/policy_change_items') return ok(db.items);
  if (p === '/rest/v1/invitations') return ok(r.method() === 'GET' ? [{ id: 'inv1', email: 'zoe@magasin.fr', role: 'member', expires_at: new Date(Date.now() + 6e8).toISOString(), created_at: iso(0) }].filter(() => u.searchParams.get('email')) : null);
  // Retours (migration 010) : écriture par la personne elle-même ; lecture par l'auteur et les responsables de l'organisation
  if (p === '/rest/v1/feedback') {
    if (db.no010) return ok({ code: 'PGRST205', message: "Could not find the table 'public.feedback' in the schema cache" }, 404);
    if (r.method() === 'POST') {
      if (db.feedbackFail) return ok({ message: 'erreur interne' }, 500);
      if (b.user_id) return ok({ message: 'permission denied for column user_id' }, 403);
      if (b.org_id && b.org_id !== ORG) return ok({ message: 'new row violates row-level security policy' }, 403);
      db.feedback.push({ id: `fb${db.feedback.length + 1}`, user_id: me.id, created_at: new Date().toISOString(), ...b });
      return ok(null, 201);
    }
    return ok(db.feedback.filter((f) => f.user_id === me.id || (f.org_id === ORG && lead)));
  }
  if (p === '/rest/v1/league_mentorships') return db.no011 ? ok({ code: 'PGRST205', message: "Could not find the table 'public.league_mentorships'" }, 404) : ok(db.mentorships);
  if (p === '/rest/v1/source_versions' && eq('source_id')) return ok([{ id: 'v1', version: 1, page_count: 3 }, { id: 'v2', version: 2, page_count: 3 }].filter((v) => !u.searchParams.get('version') || `eq.${v.version}` === u.searchParams.get('version')));
  if (p === '/rest/v1/skill_revalidations') return db.no008 ? ok(MISSING, 404) : ok(db.revals.filter((r) => lead || r.user_id === me.id));
  if (p === '/rest/v1/out_of_scope_knowledge') return db.no008 ? ok(MISSING, 404) : ok(db.oos.filter((r) => ['admin', 'manager', 'expert'].includes(me.role) || r.user_id === me.id));
  if (p === '/rest/v1/organizations') return ok([{ retention_days: db.retention }]);
  return ok({ message: `route inconnue ${p}` }, 404);
}

const init = (who) => [([tok, email, org, role]) => {
  try { if (!sessionStorage.getItem('s')) { sessionStorage.setItem('s', 1); localStorage.clear(); localStorage.setItem('arbor:auth', JSON.stringify({ access_token: tok, refresh_token: 'r', expires_at: Date.now() + 3e6, email })); localStorage.setItem('arbor:orgs', JSON.stringify([{ id: org, name: 'Magasin de Lyon', sector: 'Commerce', role }])); localStorage.setItem('arbor:v1', JSON.stringify({ subjects: [{ id: 'persosub001', title: 'Mon cours perso confidentiel', color: '#1E7A57', icon: 'dna', createdAt: 1, updatedAt: 2, root: { id: 'persoroot01', title: 'Mon cours perso confidentiel', notes: 'secret personnel', explain: '', keyPoints: [], exercises: [], srs: null, status: 'todo', collapsed: false, children: [] } }], settings: { theme: 'light', mascot: false }, stats: { days: {}, calib: {} }, trophies: {}, xp: 0, profile: { done: true, goals: [] } })); } } catch (e) { /* about:blank */ }
}, [jwt(U[who].id), U[who].email, ORG, U[who].role]];
module.exports = { SB, ORG, U, K, jwt, handle, state, init };
