/* Faux serveur de la migration 013 (adresses autorisées, pass d'équipe), partagé par les tests navigateur Business.
   Mêmes règles que supabase/migrations/013_access.sql (vérifiées pour de vrai par tests/db-rls.js, AC0 à AC21).
   Utilisation : const access = require('./fixtures/access-mock.js')(db) ; puis, dans le gestionnaire de requêtes :
     const r = access(p, m, body, u, { me, ok, err, isLead, isAdmin }); if (r) return r; */
const crypto = require('crypto');
const PUBLIC = /^(gmail\.com|googlemail\.com|outlook\.(com|fr)|hotmail\.(com|fr)|live\.(com|fr)|yahoo\.(com|fr)|icloud\.com|free\.fr|orange\.fr|laposte\.net|proton\.me|protonmail\.com)$/;
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

module.exports = function access(db) {
  db.rules = db.rules || []; db.passes = db.passes || [];
  const orgName = (id) => (db.orgs.find((o) => o.id === id) || {}).name || 'Organisation';
  const unitName = (id) => ((db.units || []).find((x) => x.id === id) || {}).name || null;
  const mems = () => db.members;
  const isMem = (org, uid) => mems().some((y) => (y.org || y.org_id) === org && (y.user || y.user_id) === uid);
  const addMem = (org, me, role, unit) => mems().push({ org, user: me.id, role, email: me.email, unit: unit || null, onboarded: false });
  return function handle(p, m, body, u, { me, ok, err, isLead, isAdmin }) {
    const eq = (k) => (u.searchParams.get(k) || '').replace(/^eq\./, '');
    if (p === '/rest/v1/rpc/add_access_rule') {
      if (!isLead(body.p_org)) return err('accès refusé');
      const v = String(body.p_value || '').toLowerCase().trim().replace(/^@/, '');
      if (body.p_role === 'admin') return err('le rôle d’administrateur ne s’attribue jamais automatiquement');
      if (body.p_kind === 'domain' && !isAdmin(body.p_org)) return err('seul un administrateur peut autoriser un domaine entier');
      if (body.p_kind === 'domain' && PUBLIC.test(v)) return err('domaine de messagerie publique : autorise plutôt des adresses une par une');
      db.rules = db.rules.filter((x) => !(x.org === body.p_org && x.kind === body.p_kind && x.value === v));
      const id = crypto.randomUUID(); db.rules.push({ id, org: body.p_org, kind: body.p_kind, value: v, role: body.p_role || 'member', unit: body.p_unit || null });
      return ok(id);
    }
    if (p === '/rest/v1/rpc/remove_access_rule') {
      const x = db.rules.find((y) => y.id === body.p_id); if (!x || !isLead(x.org)) return err('accès refusé');
      db.rules = db.rules.filter((y) => y !== x); return ok(null);
    }
    if (p === '/rest/v1/rpc/claim_memberships') {
      if (me.unverified) return ok([]);
      const out = [];
      const dom = me.email.split('@')[1];
      const byOrg = {};
      db.rules.filter((x) => (x.kind === 'email' && x.value === me.email) || (x.kind === 'domain' && x.value === dom))
        .forEach((x) => { if (!byOrg[x.org] || x.kind === 'email') byOrg[x.org] = x; });
      Object.values(byOrg).forEach((x) => { if (isMem(x.org, me.id)) return; addMem(x.org, me, x.role, x.unit); out.push({ org_id: x.org, org_name: orgName(x.org), role: x.role }); });
      return ok(out);
    }
    if (p === '/rest/v1/rpc/create_team_pass') {
      if (!isLead(body.p_org)) return err('accès refusé');
      const min = Number(body.p_minutes || 15), max = Number(body.p_max_uses || 30);
      if (!(min >= 1 && min <= 60)) return err('durée : entre 1 et 60 minutes');
      if (!(max >= 1 && max <= 500)) return err('nombre de places : entre 1 et 500');
      const code = Array.from(crypto.randomBytes(6)).map((b) => ALPHA[b % 32]).join('');
      const id = crypto.randomUUID(), expires = Date.now() + min * 60000;
      db.passes.push({ id, org: body.p_org, code, label: body.p_label || null, unit: body.p_unit || null, max, uses: 0, expires, revoked: false });
      return ok([{ id, code, expires_at: new Date(expires).toISOString() }]);
    }
    if (p === '/rest/v1/rpc/revoke_team_pass') {
      const x = db.passes.find((y) => y.id === body.p_id); if (!x || !isLead(x.org)) return err('accès refusé');
      x.revoked = true; return ok(null);
    }
    if (p === '/rest/v1/rpc/redeem_team_pass') {
      const c = String(body.p_code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      const t = db.passes.find((x) => x.code === c);
      if (!t || t.revoked || t.expires <= Date.now() || t.uses >= t.max) return ok([{ status: 'invalide', org_id: null, org_name: null, unit_name: null }]);
      const base = { org_id: t.org, org_name: orgName(t.org), unit_name: unitName(t.unit) };
      if (isMem(t.org, me.id)) return ok([{ status: 'deja_membre', ...base }]);
      addMem(t.org, me, 'member', t.unit); t.uses++;
      return ok([{ status: 'ok', ...base }]);
    }
    if (p === '/rest/v1/org_access_rules' && m === 'GET') { const org = eq('org_id'); return ok(isLead(org) ? db.rules.filter((x) => x.org === org).map((x) => ({ id: x.id, kind: x.kind, value: x.value, role: x.role, unit_id: x.unit })) : []); }
    if (p === '/rest/v1/team_passes' && m === 'GET') {
      const org = eq('org_id');
      return ok(isLead(org) ? db.passes.filter((x) => x.org === org && !x.revoked).map((x) => ({ id: x.id, label: x.label, unit_id: x.unit, max_uses: x.max, uses: x.uses, expires_at: new Date(x.expires).toISOString() })) : []);
    }
    return null;
  };
};
