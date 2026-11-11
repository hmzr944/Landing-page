/* Connexion (Supabase Auth) et appel du tuteur (fonction serveur « tutor »).
   - Seules l'adresse du projet et la clé publiable sont ici : elles sont faites pour être publiques.
     La clé de l'API du modèle (Groq, modèles open source) n'existe que côté serveur (secret Supabase) ; elle n'arrive jamais dans le navigateur.
   - Connexion par e-mail et mot de passe, ou par lien e-mail (code à 6 chiffres si le modèle d'e-mail le contient). Session dans ce navigateur.
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
    if (p.get('access_token')) { write(fromAuth({ access_token: p.get('access_token'), refresh_token: p.get('refresh_token'), expires_in: p.get('expires_in') })); notice = { ok: true, type: p.get('type') || '' }; }
    else notice = { ok: false, msg: p.get('error_description') || 'Le lien de connexion n’a pas fonctionné.' };
    history.replaceState(null, '', location.pathname + '#/');
    return true;
  }
  captureFragment();
  // page déjà ouverte : le lien ne change que le fragment ; on le traite avant le routeur
  addEventListener('hashchange', () => {
    if (!captureFragment()) return;
    const n = notice; notice = null;
    // Lien « mot de passe oublié » ou confirmation d'inscription : l'accueil prend la main s'il le peut
    if (window.Welcome && Welcome.handle(n)) return;
    if (window.FX) FX.toast(n.ok ? 'Connecté : tu peux parler à Pousse' : n.msg, n.ok ? 'success' : 'error', 4200);
  });

  async function call(path, { method = 'POST', body, token, query = '', headers: extra = {} } = {}) {
    const res = await fetch(`${URL}${path}${query}`, {
      method,
      headers: { apikey: KEY, 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extra },
      body: body ? JSON.stringify(body) : undefined,
    });
    let data = null;
    try { data = await res.json(); } catch (e) { data = null; }
    return { status: res.status, ok: res.ok, data };
  }

  /* Connexion par e-mail et mot de passe (Supabase Auth). Les erreurs portent un code stable pour l'interface :
     invalid, unconfirmed, weak, exists, rate, offline, same, other. On ne révèle jamais si une adresse a un compte. */
  const remember = (email) => { try { localStorage.setItem('arbor:auth-email', email); } catch (e) { /* rien */ } };
  function authError(r, fallback) {
    const d = (r && r.data) || {};
    const raw = `${d.error_code || ''} ${d.error || ''} ${d.msg || ''} ${d.error_description || ''} ${d.message || ''}`.toLowerCase();
    const mk = (code, msg) => { const e = new Error(msg); e.code = code; e.kind = code === 'offline' ? 'offline' : 'auth'; return e; };
    if (!r) return mk('offline', 'Pas de connexion. Vérifie ton réseau et réessaie.');
    if (r.status === 429 || /rate.?limit|too many/.test(raw)) return mk('rate', 'Trop de tentatives. Attends une minute avant de réessayer.');
    if (/email.?not.?confirmed/.test(raw)) return mk('unconfirmed', 'Ton adresse n’est pas encore confirmée. Ouvre le lien reçu par e-mail.');
    if (/invalid.?(login|credentials|grant)/.test(raw)) return mk('invalid', 'E-mail ou mot de passe incorrect.');
    if (/same.?password|different from the old/.test(raw)) return mk('same', 'Choisis un mot de passe différent de l’ancien.');
    if (/weak.?password|password should|at least/.test(raw)) return mk('weak', 'Ce mot de passe est trop faible. Choisis-en un plus long.');
    if (/already.?(registered|exists)|user_already_exists/.test(raw)) return mk('exists', 'Un compte existe déjà avec cette adresse. Connecte-toi.');
    if (/signup.?disabled|signups not allowed/.test(raw)) return mk('other', 'Les inscriptions sont fermées pour le moment.');
    // Service d'e-mail de Supabase sans serveur d'envoi (SMTP) : seules les adresses de l'équipe du projet reçoivent des e-mails
    if (/not.?authori[sz]ed/.test(raw) && /email/.test(raw)) return mk('mail', 'L’envoi d’e-mails n’est pas encore ouvert à cette adresse. L’équipe d’Arbor doit terminer la configuration de l’envoi.');
    if (/sending.*(confirmation|recovery|email)|smtp|email.*(send|deliver)/.test(raw)) return mk('mail', 'L’e-mail n’a pas pu partir. Réessaie plus tard : l’équipe d’Arbor est prévenue par ses journaux.');
    if (/email.?address.?invalid|invalid.*email|unable to validate email/.test(raw)) return mk('email', 'Cette adresse e-mail est refusée. Vérifie-la ou essaie une autre adresse.');
    // Cas imprévu : on garde le code du serveur pour pouvoir le diagnostiquer
    const code = String(d.error_code || d.error || r.status || '').replace(/[^\w.-]/g, '').slice(0, 40);
    return mk('other', code ? `${fallback} (code : ${code})` : fallback);
  }
  async function safeCall(path, opts) { try { return await call(path, opts); } catch (e) { return null; } }
  const redirect = () => `?redirect_to=${encodeURIComponent(SITE)}`;

  // Inscription : sans confirmation d'e-mail, la session arrive tout de suite ; sinon un lien part dans la boîte mail
  async function signUp(email, password) {
    if (!navigator.onLine) throw authError(null);
    const r = await safeCall('/auth/v1/signup', { body: { email, password }, query: redirect() });
    if (!r || !r.ok) throw authError(r, 'Inscription impossible pour le moment. Réessaie dans un instant.');
    remember(email);
    if (r.data && r.data.access_token) { write(fromAuth(r.data, email)); return { session: true }; }
    return { session: false };
  }
  async function signInPassword(email, password) {
    if (!navigator.onLine) throw authError(null);
    const r = await safeCall('/auth/v1/token', { body: { email, password }, query: '?grant_type=password' });
    if (!r || !r.ok || !r.data || !r.data.access_token) throw authError(r, 'Connexion impossible pour le moment. Réessaie dans un instant.');
    write(fromAuth(r.data, email)); remember(email);
    return true;
  }
  // Mot de passe oublié : la réponse est la même que l'adresse ait un compte ou non
  async function recover(email) {
    if (!navigator.onLine) throw authError(null);
    const r = await safeCall('/auth/v1/recover', { body: { email }, query: redirect() });
    if (!r) throw authError(null);
    if (r.status === 429) throw authError(r);
    remember(email);
    return true;
  }
  async function resend(email) {
    if (!navigator.onLine) throw authError(null);
    const r = await safeCall('/auth/v1/resend', { body: { type: 'signup', email }, query: redirect() });
    if (!r) throw authError(null);
    if (!r.ok) throw authError(r, 'Envoi impossible pour le moment.');
    return true;
  }
  // Nouveau mot de passe, une fois connecté (après le lien de récupération)
  async function updatePassword(password) {
    const t = await token();
    if (!t) { const e = new Error('Le lien a expiré. Demande un nouveau lien.'); e.code = 'expired'; throw e; }
    const r = await safeCall('/auth/v1/user', { method: 'PUT', body: { password }, token: t });
    if (!r || !r.ok) throw authError(r, 'Le mot de passe n’a pas pu être changé.');
    return true;
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

  /* Une demande au serveur (dialogue ou génération). Erreurs typées pour un message clair : offline, auth, quota, busy, server */
  async function ask(payload) {
    if (!navigator.onLine) { const e = new Error('offline'); e.kind = 'offline'; throw e; }
    const t = await token();
    if (!t) { const e = new Error('auth'); e.kind = 'auth'; throw e; }
    let r;
    try { r = await call('/functions/v1/tutor', { body: payload, token: t }); }
    catch (err) { const e = new Error('offline'); e.kind = 'offline'; throw e; }
    if (r.status === 401) { write(null); const e = new Error('auth'); e.kind = 'auth'; throw e; }
    if (r.status === 429) { const e = new Error('quota'); e.kind = 'quota'; e.limit = r.data && r.data.limit; throw e; }
    if (r.status === 503) { const e = new Error('busy'); e.kind = 'busy'; throw e; }
    if (!r.ok) { const e = new Error((r.data && r.data.error) || 'Le tuteur ne répond pas.'); e.kind = 'server'; throw e; }
    return r.data;
  }
  async function usage() {
    const t = await token(); if (!t) return null;
    const d = new Date(), m = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    const r = await call('/rest/v1/ai_usage', { method: 'GET', token: t, query: `?select=calls&month=eq.${m}` });
    return r.ok && Array.isArray(r.data) ? (r.data[0] ? r.data[0].calls : 0) : null;
  }

  /* Appel authentifié à l'API de la base (espace professionnel). Le jeton de la personne connectée suffit :
     ce qu'elle peut lire ou écrire est décidé par les règles d'accès de la base, jamais par le navigateur. */
  async function rest(path, { method = 'POST', body, query = '', headers } = {}) {
    if (!navigator.onLine) { const e = new Error('Pas de connexion.'); e.kind = 'offline'; throw e; }
    const t = await token();
    if (!t) { const e = new Error('Connecte-toi d’abord.'); e.kind = 'auth'; throw e; }
    let r;
    try { r = await call(path, { method, body, token: t, query, headers }); }
    catch (err) { const e = new Error('Connexion impossible.'); e.kind = 'offline'; throw e; }
    if (r.status === 401) { write(null); const e = new Error('Ta session a expiré : reconnecte-toi.'); e.kind = 'auth'; throw e; }
    if (!r.ok) { const e = new Error((r.data && (r.data.message || r.data.error)) || 'Action impossible.'); e.kind = 'server'; e.status = r.status; throw e; }
    return r.data;
  }

  // Identifiant de la personne connectée, lu dans son jeton (sert à signer ce qu'elle crée ; la base le revérifie)
  function userId() {
    const s = read(); if (!s) return '';
    try { const p = s.access_token.split('.')[1]; return JSON.parse(atob(p.replace(/-/g, '+').replace(/_/g, '/'))).sub || ''; } catch (e) { return ''; }
  }
  // Dépôt d'un fichier dans le stockage privé (le chemin commence par l'identifiant de l'organisation : règle d'accès)
  async function upload(bucket, path, blob, type = 'application/pdf') {
    const t = await token();
    if (!t) { const e = new Error('Connecte-toi d’abord.'); e.kind = 'auth'; throw e; }
    let res;
    try { res = await fetch(`${URL}/storage/v1/object/${bucket}/${path}`, { method: 'POST', headers: { apikey: KEY, Authorization: `Bearer ${t}`, 'Content-Type': type, 'x-upsert': 'false' }, body: blob }); }
    catch (err) { const e = new Error('Connexion impossible.'); e.kind = 'offline'; throw e; }
    if (!res.ok) { let m = ''; try { m = (await res.json()).message; } catch (x) { /* rien */ } const e = new Error(m || 'Le fichier n’a pas pu être enregistré.'); e.kind = 'server'; e.status = res.status; throw e; }
    return true;
  }

  window.Tutor = { rest, upload, userId, signIn, verifyCode, signUp, signInPassword, recover, resend, updatePassword, signOut, ask, usage, email, signedIn: () => !!read(), notice: () => { const n = notice; notice = null; return n; }, lastEmail: () => { try { return localStorage.getItem('arbor:auth-email') || ''; } catch (e) { return ''; } } };
})();
