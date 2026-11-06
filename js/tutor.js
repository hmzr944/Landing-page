/* Connexion (Supabase Auth) et appel du tuteur (fonction serveur « tutor »).
   - Seules l'adresse du projet et la clé publiable sont ici : elles sont faites pour être publiques.
     La clé de l'API du modèle (Groq, modèles open source) n'existe que côté serveur (secret Supabase) ; elle n'arrive jamais dans le navigateur.
   - Connexion par lien e-mail (ou code à 6 chiffres si le modèle d'e-mail le contient). Session dans ce navigateur.
   - Hors connexion ou sans compte, tout Arbor fonctionne ; seul le tuteur est indisponible. */
(function () {
  const URL = 'https://nnqtgwgwalbbhqzceged.supabase.co';
  const KEY = 'sb_publishable_2H_e1XdjMLrcv5Q2TT9vjg_-KJaAZ0c';
  const SKEY = 'arbor:auth';
  const SITE = location.origin + location.pathname;

  const read = () => { try { return JSON.parse(localStorage.getItem(SKEY) || 'null'); } catch (e) { return null; } };
  const write = (s) => { try { if (s) localStorage.setItem(SKEY, JSON.stringify(s)); else localStorage.removeItem(SKEY); } catch (e) { /* rien */ } };
  const fromAuth = (d, email) => ({ access_token: d.access_token, refresh_token: d.refresh_token, expires_at: Date.now() + ((+d.expires_in || 3600) - 60) * 1000, email: email || (d.user && d.user.email) || '' });

  // Retour du lien e-mail : « #access_token=…&refresh_token=… » (avant que le routeur ne lise l'adresse)
  let notice = null;
  function captureFragment() {
    const h = location.hash.replace(/^#/, '');
    if (!/(^|&)(access_token|error_description)=/.test(h)) return false;
    const p = new URLSearchParams(h);
    if (p.get('access_token')) { write(fromAuth({ access_token: p.get('access_token'), refresh_token: p.get('refresh_token'), expires_in: p.get('expires_in') })); notice = { ok: true }; }
    else notice = { ok: false, msg: p.get('error_description') || 'Le lien de connexion n’a pas fonctionné.' };
    history.replaceState(null, '', location.pathname + '#/');
    return true;
  }
  captureFragment();
  // page déjà ouverte : le lien ne change que le fragment ; on le traite avant le routeur
  addEventListener('hashchange', () => {
    if (captureFragment() && window.FX) { const n = notice; notice = null; FX.toast(n.ok ? 'Connecté : tu peux parler à Pousse' : n.msg, n.ok ? 'success' : 'error', 4200); }
  });

  async function call(path, { method = 'POST', body, token, query = '' } = {}) {
    const res = await fetch(`${URL}${path}${query}`, {
      method,
      headers: { apikey: KEY, 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    let data = null;
    try { data = await res.json(); } catch (e) { data = null; }
    return { status: res.status, ok: res.ok, data };
  }

  async function signIn(email) {
    const r = await call('/auth/v1/otp', { body: { email, create_user: true }, query: `?redirect_to=${encodeURIComponent(SITE)}` });
    if (!r.ok) throw new Error((r.data && (r.data.msg || r.data.error_description || r.data.message)) || 'Envoi impossible. Vérifie l’adresse.');
    try { localStorage.setItem('arbor:auth-email', email); } catch (e) { /* rien */ }
    return true;
  }
  async function verifyCode(email, code) {
    const r = await call('/auth/v1/verify', { body: { type: 'email', email, token: String(code).trim() } });
    if (!r.ok || !r.data || !r.data.access_token) throw new Error('Code incorrect ou expiré.');
    write(fromAuth(r.data, email));
    return true;
  }
  async function token() {
    const s = read();
    if (!s) return null;
    if (Date.now() < s.expires_at) return s.access_token;
    const r = await call('/auth/v1/token', { body: { refresh_token: s.refresh_token }, query: '?grant_type=refresh_token' });
    if (!r.ok || !r.data || !r.data.access_token) { write(null); return null; }
    write(fromAuth(r.data, s.email));
    return r.data.access_token;
  }
  async function email() {
    const s = read(); if (!s) return '';
    if (s.email) return s.email;
    const t = await token(); if (!t) return '';
    const r = await call('/auth/v1/user', { method: 'GET', token: t });
    const e = (r.data && r.data.email) || '';
    if (e) write({ ...read(), email: e });
    return e;
  }
  function signOut() { const s = read(); write(null); if (s) call('/auth/v1/logout', { token: s.access_token }).catch(() => {}); }

  /* Une question au tuteur. Erreurs typées pour un message clair : offline, auth, quota, server, refused */
  async function ask(payload) {
    if (!navigator.onLine) { const e = new Error('offline'); e.kind = 'offline'; throw e; }
    const t = await token();
    if (!t) { const e = new Error('auth'); e.kind = 'auth'; throw e; }
    let r;
    try { r = await call('/functions/v1/tutor', { body: payload, token: t }); }
    catch (err) { const e = new Error('offline'); e.kind = 'offline'; throw e; }
    if (r.status === 401) { write(null); const e = new Error('auth'); e.kind = 'auth'; throw e; }
    if (r.status === 429) { const e = new Error('quota'); e.kind = 'quota'; e.limit = r.data && r.data.limit; throw e; }
    if (!r.ok) { const e = new Error((r.data && r.data.error) || 'Le tuteur ne répond pas.'); e.kind = 'server'; throw e; }
    return r.data;
  }
  async function usage() {
    const t = await token(); if (!t) return null;
    const d = new Date(), m = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    const r = await call('/rest/v1/ai_usage', { method: 'GET', token: t, query: `?select=calls&month=eq.${m}` });
    return r.ok && Array.isArray(r.data) ? (r.data[0] ? r.data[0].calls : 0) : null;
  }

  window.Tutor = { signIn, verifyCode, signOut, ask, usage, email, signedIn: () => !!read(), notice: () => { const n = notice; notice = null; return n; }, lastEmail: () => { try { return localStorage.getItem('arbor:auth-email') || ''; } catch (e) { return ''; } } };
})();
