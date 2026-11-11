/* Journal des observations pédagogiques (IndexedDB).
   Une observation = une preuve datée sur une notion : réponse en révision, question de leçon,
   et plus tard dialogue, explication, simulation. On n'y met que des faits observés, jamais d'estimation.
   Le stockage local principal reste petit : chaque notion n'y garde qu'un résumé (Obs.summarize).
   Si IndexedDB est indisponible (navigation privée), les observations restent en mémoire pour la session. */
(function () {
  const NAME = 'arbor-db', VERSION = 1, STORE = 'obs';
  let dbp = null;
  const memory = [];
  function open() {
    if (dbp) return dbp;
    dbp = new Promise((resolve) => {
      try {
        const req = indexedDB.open(NAME, VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE)) {
            const st = db.createObjectStore(STORE, { keyPath: 'id' });
            st.createIndex('nid', 'nid');
            st.createIndex('at', 'at');
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
        req.onblocked = () => resolve(null);
      } catch (e) { resolve(null); }
    });
    return dbp;
  }
  const tx = async (mode, fn) => {
    const db = await open();
    if (!db) return fn(null);
    return new Promise((resolve) => {
      try {
        const t = db.transaction(STORE, mode);
        const out = fn(t.objectStore(STORE));
        t.oncomplete = () => resolve(out && out.result !== undefined ? out.result : out);
        t.onerror = () => resolve(null);
        t.onabort = () => resolve(null);
      } catch (e) { resolve(null); }
    });
  };
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

  /* o : { sid, nid, activity: rappel|lecon|socratique|enseigne|situation|simulation, outcome: juste|partiel|faux,
          grade?, confidence?, answer?, misconception? } */
  async function add(o) {
    const rec = { id: uid(), at: Date.now(), ...o };
    if (rec.answer) rec.answer = String(rec.answer).slice(0, 600);
    const ok = await tx('readwrite', (st) => (st ? st.put(rec) : null));
    if (ok === null) memory.push(rec);
    return rec;
  }
  async function byNotion(nid) {
    const res = await tx('readonly', (st) => (st ? st.index('nid').getAll(nid) : null));
    return [...(Array.isArray(res) ? res : []), ...memory.filter((x) => x.nid === nid)].sort((a, b) => a.at - b.at);
  }
  async function all() {
    const res = await tx('readonly', (st) => (st ? st.getAll() : null));
    return [...(Array.isArray(res) ? res : []), ...memory].sort((a, b) => a.at - b.at);
  }
  async function putMany(list) {
    if (!Array.isArray(list) || !list.length) return 0;
    const clean = list.filter((x) => x && x.id && x.nid && x.at).map((x) => ({ ...x, answer: x.answer ? String(x.answer).slice(0, 600) : undefined }));
    const ok = await tx('readwrite', (st) => { if (!st) return null; clean.forEach((x) => st.put(x)); return true; });
    if (ok === null) memory.push(...clean);
    return clean.length;
  }
  async function clear() { memory.length = 0; await tx('readwrite', (st) => (st ? st.clear() : null)); }

  /* Résumé gardé sur la notion (synchrone, pour la règle de maîtrise et les raisons affichées) */
  const dayKey = (t) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  function summarize(node, o) {
    const ev = node.ev || { n: 0, ok: 0, recall: [], miss: 0, last: 0 };
    ev.n++; ev.last = o.at || Date.now();
    if (o.outcome === 'juste') { ev.ok++; ev.lastOkAt = ev.last; }
    if (o.outcome === 'faux') ev.miss++;
    // rappels réussis, un par jour : la preuve d'une mémoire qui tient dans le temps
    if (o.activity === 'rappel' && o.outcome === 'juste') {
      const k = dayKey(ev.last);
      if (!ev.recall.includes(k)) ev.recall = [...ev.recall, k].slice(-10);
    }
    if (o.misconception) ev.mis = [...(ev.mis || []), { label: String(o.misconception).slice(0, 120), at: ev.last }].slice(-5);
    node.ev = ev;
    return ev;
  }

  window.Obs = { add, byNotion, all, putMany, clear, summarize, dayKey };
})();
