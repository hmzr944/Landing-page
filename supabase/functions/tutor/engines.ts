// Moteurs Business côté serveur (migration 008, docs/engines.md) :
// - relations   : propose des liens entre connaissances VALIDÉES (prérequis, confusion fréquente…), à valider par un humain ;
// - scenario_concevoir / scenario_start : scénarios versionnés (contexte, objectif, personnage, contraintes, événements,
//   grille de comportements), conçus ici à partir des connaissances validées, publiés par un humain, joués ensuite ;
// - comparer_versions : Live Policy Watchdog. Le texte de la nouvelle version est relu ici (PDF stocké) ; chaque
//   connaissance est classée inchangée, reformulée, modifiée ou supprimée (+ nouvelles), avec un extrait vérifié ;
//   rien n'est appliqué sans décision humaine (decide_change_item) ;
// - invitation_envoyer : envoi de l'invitation par e-mail, si le service d'envoi est configuré (sinon : dit clairement).
// - verifier_provenance (009) : empreinte SHA-256 du fichier stocké comparée à celle déclarée, puis chaque extrait des
//   connaissances de la version recherché dans le texte du fichier ; seul ce résultat permet ensuite de valider.
// Le rôle est toujours vérifié ici, jamais pris du navigateur.
import { isSensitive } from "./generate.ts";
import type { Knowledge, OrgCtx } from "./org.ts";
import { OrgError } from "./org.ts";
import { integrityOf, passageFound, type StoredDoc } from "./pdftext.ts";

export interface EnginesDb {
  insertEdges?(rows: Record<string, unknown>[]): Promise<number>;
  edgesOf?(orgId: string): Promise<{ from_id: string; to_id: string; relation: string }[]>;
  createScenarioDef?(row: Record<string, unknown>): Promise<string>;
  createScenarioVersion?(row: Record<string, unknown>): Promise<string>;
  getScenarioVersion?(id: string): Promise<Record<string, unknown> | null>;
  createScenario(row: Record<string, unknown>): Promise<string>;
  versionInfo?(id: string): Promise<VersionRow | null>;
  versionByNumber?(sourceId: string, n: number): Promise<VersionRow | null>;
  knowledgeOfVersion?(versionId: string): Promise<(Knowledge & { status: string })[]>;
  docFile?(storagePath: string): Promise<StoredDoc>;
  markIntegrity?(versionId: string, integrity: "conforme" | "divergent", sha256: string): Promise<void>;
  setProvenance?(rows: { id: string; provenance: "verifiee" | "introuvable"; sha256: string }[]): Promise<void>;
  audit?(orgId: string, actor: string, action: string, target: string, detail: Record<string, unknown>): Promise<void>;
  insertOutOfScope?(rows: Record<string, unknown>[]): Promise<void>;
  insertPolicyChange?(row: Record<string, unknown>): Promise<string>;
  insertChangeItems?(rows: Record<string, unknown>[]): Promise<void>;
  invitationById?(id: string): Promise<Record<string, unknown> | null>;
  markInvitationSent?(id: string, count: number): Promise<void>;
  sendEmail?(to: string, subject: string, html: string, text: string): Promise<void>;
  siteUrl?: string;
}

export type VersionRow = { id: string; org_id: string; source_id: string; version: number; storage_path: string; checksum?: string | null };

const eclip = (s: unknown, n: number) => String(s ?? "").slice(0, n);
const UUIDR = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const enorm = (s: string) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[«»"“”’'`]/g, "'").replace(/\s+/g, " ").trim();
const oneLine = (s: string) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const inDoc = (quote: string, text: string) => quote.trim().length >= 12 && ` ${oneLine(text)} `.includes(` ${oneLine(quote)} `);
const estr = { type: "string" };
const kRefs = (ks: Knowledge[]) => ks.map((k, i) => `[k${i + 1}] (${k.kind}) ${k.title} : ${k.body} — extrait : « ${k.quote} »`).join("\n");
const kAt = (ks: Knowledge[], ref: unknown) => { const m = String(ref || "").match(/k(\d+)/i); return m ? ks[Number(m[1]) - 1] || null : null; };
const LEAD = ["admin", "manager"], CONTENT = ["admin", "manager", "expert"];

async function ask(ctx: OrgCtx, mode: string, p: { system: string; user: string; schema: Record<string, unknown>; maxTokens: number }) {
  let res;
  try { res = await ctx.callModel({ ...p, effort: "medium" }); }
  catch (e) { if ((e as Error)?.name === "Busy") throw new OrgError(503, "occupe"); throw new OrgError(502, "le service ne répond pas pour l'instant"); }
  await ctx.onModel(mode, res);
  if (res.stop === "refusal") throw new OrgError(422, "demande refusée par le modèle");
  try { return JSON.parse(res.text) as Record<string, unknown>; } catch { throw new OrgError(502, "réponse illisible"); }
}
const need = <T>(f: T | undefined): T => { if (!f) throw new OrgError(501, "fonction indisponible : mise à jour de la base requise (migration 008)"); return f; };

/* Relit le fichier stocké d'une version et vérifie son intégrité : l'empreinte calculée ici doit être celle déclarée à
   l'envoi. Divergence : la version est marquée « divergente », l'incident est journalisé, et tout s'arrête (409). */
export async function readVerified(ctx: OrgCtx, db: EnginesDb, ver: VersionRow): Promise<StoredDoc> {
  let doc: StoredDoc;
  try { doc = await need(db.docFile)(ver.storage_path); }
  catch (e) { if (e instanceof OrgError) throw e; throw new OrgError(502, "le document stocké n'a pas pu être relu sur le serveur"); }
  const integrity = integrityOf(ver.checksum, doc.sha256);
  if (db.markIntegrity) await db.markIntegrity(ver.id, integrity, doc.sha256);
  if (integrity === "divergent") {
    if (db.audit) await db.audit(ver.org_id, ctx.userId, "provenance.divergente", ver.id, { declaree: ver.checksum || null, calculee: doc.sha256 });
    throw new OrgError(409, "intégrité : le fichier stocké ne correspond pas à l'empreinte déclarée à l'envoi ; extraction et validation bloquées");
  }
  return doc;
}

/* Provenance des connaissances d'une version : chaque extrait est cherché dans le texte du fichier stocké, à sa page
   (ou une voisine). « verifiee » porte l'empreinte du fichier ; « introuvable » empêche toute validation (009). */
export async function verifyProvenance(ctx: OrgCtx, db: EnginesDb, org: string, role: string, b: Record<string, unknown>) {
  if (!CONTENT.includes(role)) throw new OrgError(403, "accès refusé");
  const ver = await need(db.versionInfo)(String(b.version || ""));
  if (!ver || ver.org_id !== org) throw new OrgError(404, "version introuvable");
  const doc = await readVerified(ctx, db, ver);
  const ks = (await need(db.knowledgeOfVersion)(ver.id)).filter((k) => ["propose", "a_revalider", "valide"].includes(k.status));
  const rows = ks.map((k) => ({ id: k.id, provenance: (k.quote && passageFound(k.quote, doc.pages, Number(k.page) || 1) ? "verifiee" : "introuvable") as "verifiee" | "introuvable", sha256: doc.sha256 }));
  if (rows.length) await need(db.setProvenance)(rows);
  return { integrity: "conforme", sha256: doc.sha256, verified: rows.filter((r) => r.provenance === "verifiee").length, notFound: rows.filter((r) => r.provenance === "introuvable").map((r) => r.id) };
}

/* ---------- Graphe : relations proposées entre connaissances validées ---------- */
const RELATIONS = ["prerequis", "partie_de", "precise", "exemple_de", "contredit", "confusion_frequente"];
export async function relations(ctx: OrgCtx, db: EnginesDb, org: string, role: string) {
  if (!CONTENT.includes(role)) throw new OrgError(403, "accès refusé");
  const ks = (await ctx.db.validatedKnowledge(org, 60)).slice(0, 40);
  if (ks.length < 3) throw new OrgError(400, "il faut au moins 3 connaissances validées");
  const out = await ask(ctx, "relations", {
    system: `Tu relies des connaissances professionnelles validées [k…]. Relations possibles :
prerequis (il faut connaître A avant B), partie_de (A est une étape ou une partie de B), precise (A précise ou complète B),
exemple_de (A est un exemple de B), contredit (A et B ne peuvent pas être vraies ensemble), confusion_frequente (A et B se confondent facilement).
Ne propose que des relations évidentes à la lecture des connaissances, 2 à 15. "why" : une phrase courte. N'invente aucune connaissance.`,
    user: kRefs(ks),
    schema: { type: "object", additionalProperties: false, required: ["edges"], properties: { edges: { type: "array", items: { type: "object", additionalProperties: false, required: ["from", "to", "relation", "why"], properties: { from: estr, to: estr, relation: { type: "string", enum: RELATIONS }, why: estr } } } } },
    maxTokens: 1400,
  });
  const have = new Set(((await db.edgesOf?.(org)) || []).map((e) => `${e.from_id}|${e.to_id}|${e.relation}`));
  const rows = (Array.isArray(out.edges) ? out.edges : []).map((e) => e as Record<string, string>).map((e) => ({ a: kAt(ks, e.from), b: kAt(ks, e.to), relation: e.relation, why: eclip(e.why, 300) }))
    .filter((e) => e.a && e.b && e.a.id !== e.b.id && RELATIONS.includes(e.relation) && !have.has(`${e.a.id}|${e.b.id}|${e.relation}`))
    .filter((e, i, arr) => arr.findIndex((x) => x.a!.id === e.a!.id && x.b!.id === e.b!.id && x.relation === e.relation) === i)
    .slice(0, 15).map((e) => ({ org_id: org, from_id: e.a!.id, to_id: e.b!.id, relation: e.relation, method: "ia", status: "propose", note: e.why, created_by: ctx.userId }));
  const n = rows.length ? await need(db.insertEdges)(rows) : 0;
  return { proposed: n };
}

/* ---------- Scénarios ---------- */
const SC_KINDS = ["client", "procedure", "technique", "management", "autre"];
const SPEC_SCHEMA = { type: "object", additionalProperties: false,
  required: ["title", "role_label", "role_play", "context", "objective", "name", "profile", "personality", "need", "objections", "constraints", "events", "rubric", "opening", "knowledge"],
  properties: { title: estr, role_label: estr, role_play: estr, context: estr, objective: estr, name: estr, profile: estr, personality: estr, need: estr,
    objections: { type: "array", items: estr }, constraints: { type: "array", items: estr },
    events: { type: "array", items: { type: "object", additionalProperties: false, required: ["turn", "text"], properties: { turn: { type: "integer" }, text: estr } } },
    rubric: { type: "array", items: { type: "object", additionalProperties: false, required: ["id", "label"], properties: { id: estr, label: estr } } },
    opening: estr, knowledge: { type: "array", items: estr } } };

export async function scenarioDesign(ctx: OrgCtx, db: EnginesDb, org: string, role: string, b: Record<string, unknown>) {
  if (!LEAD.includes(role)) throw new OrgError(403, "accès refusé");
  const kind = SC_KINDS.includes(String(b.kind)) ? String(b.kind) : "client";
  const brief = eclip(b.brief, 400).trim();
  const ks = (await ctx.db.validatedKnowledge(org, 60)).slice(0, 30);
  if (ks.length < 2) throw new OrgError(400, "il faut au moins 2 connaissances validées pour concevoir un scénario");
  const out = await ask(ctx, "scenario", {
    system: `Tu conçois un scénario d'entraînement professionnel (type : ${kind}). La personne formée joue "role_label" (ex. vendeur, technicien, manager) ; l'IA joue "role_play" (le personnage ou la situation).
Le scénario contient : un contexte, un objectif observable, un personnage (name, profile, personality), un enjeu caché ("need") que la personne doit faire émerger, 1 à 3 objections ou difficultés, des contraintes (temps, règles), 1 à 3 événements qui font évoluer la situation à un tour donné (2 à 8), une grille de 3 à 6 comportements observables (id en minuscules sans espace, label court), la première réplique ("opening").
Tout fait (produit, règle, procédure, chiffre) doit venir des connaissances validées [k…] ; liste celles mobilisées dans "knowledge". Prénoms fictifs. Écris en français.${brief ? `\nDemande du responsable : ${brief}` : ""}`,
    user: kRefs(ks), schema: SPEC_SCHEMA, maxTokens: 1800,
  });
  const used = [...new Set((Array.isArray(out.knowledge) ? out.knowledge : []).map((r) => kAt(ks, r)).filter(Boolean) as Knowledge[])];
  if (used.length < 1) throw new OrgError(422, "le scénario proposé ne s'appuie sur aucune connaissance validée : réessaie");
  const rubric = (Array.isArray(out.rubric) ? out.rubric : []).map((r) => r as Record<string, string>)
    .map((r) => ({ id: eclip(r.id, 30).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z_]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, ""), label: eclip(r.label, 160) }))
    .filter((r, i, a) => r.id.length >= 3 && r.label && a.findIndex((x) => x.id === r.id) === i).slice(0, 6);
  const spec = {
    kind, role_label: eclip(out.role_label, 40) || "collaborateur", role_play: eclip(out.role_play, 200), context: eclip(out.context, 600), objective: eclip(out.objective, 300),
    name: eclip(out.name, 40) || "Client", style: "scenario", profile: eclip(out.profile, 300), personality: eclip(out.personality, 300), need: eclip(out.need, 300),
    objections: (Array.isArray(out.objections) ? out.objections : []).slice(0, 3).map((o) => ({ text: eclip(o, 200), resolved: false })),
    constraints: (Array.isArray(out.constraints) ? out.constraints : []).slice(0, 4).map((c) => eclip(c, 200)),
    events: (Array.isArray(out.events) ? out.events : []).map((e) => e as { turn: number; text: string }).filter((e) => Number(e.turn) >= 2 && Number(e.turn) <= 8 && e.text).slice(0, 3).map((e) => ({ turn: Number(e.turn), text: eclip(e.text, 300) })),
    rubric: rubric.length >= 2 ? rubric : undefined, opening: eclip(out.opening, 400) || "Bonjour…", knowledge: used.map((k) => k.id),
  };
  const title = eclip(out.title, 160).trim() || "Scénario";
  const sid = await need(db.createScenarioDef)({ org_id: org, title: title.length >= 2 ? title : "Scénario", kind, created_by: ctx.userId });
  const vid = await need(db.createScenarioVersion)({ org_id: org, scenario_id: sid, version: 1, spec, knowledge_ids: spec.knowledge, created_by: ctx.userId });
  return { scenario: sid, version: vid, title, spec: { ...spec, knowledge: used.map((k) => ({ id: k.id, title: k.title })) } };
}

export async function scenarioStart(ctx: OrgCtx, db: EnginesDb, org: string, role: string, b: Record<string, unknown>) {
  const vid = String(b.version || ""); if (!UUIDR.test(vid)) throw new OrgError(400, "scénario invalide");
  const v = await need(db.getScenarioVersion)(vid);
  if (!v || v.org_id !== org) throw new OrgError(404, "scénario introuvable");
  // un brouillon ne se joue que par un responsable (pour le tester avant de le publier)
  if (v.status !== "valide" && !(v.status === "brouillon" && LEAD.includes(role))) throw new OrgError(403, "scénario non publié");
  const spec = v.spec as Record<string, any>;
  const state = { need_found: false, resolved: [] as number[], patience: 4, turns: 0, behaviors: {} as Record<string, string>, claims: [] as unknown[], events: [] as unknown[], ended: false };
  const id = await db.createScenario({ org_id: org, user_id: ctx.userId, kind: "scenario", scenario_version_id: vid, spec, state, transcript: [{ role: "client", text: spec.opening }] });
  return { id, opening: spec.opening, client: { name: spec.name, style: "scenario" }, scenario: { context: spec.context, objective: spec.objective, role_label: spec.role_label, constraints: spec.constraints || [] } };
}

/* ---------- Live Policy Watchdog : comparer deux versions d'un document ---------- */
const CHANGE_SCHEMA = { type: "object", additionalProperties: false, required: ["items", "added"], properties: {
  items: { type: "array", items: { type: "object", additionalProperties: false, required: ["k", "change", "quote", "body", "why"], properties: { k: estr, change: { type: "string", enum: ["reformule", "modifie", "supprime"] }, quote: estr, body: estr, why: estr } } },
  added: { type: "array", items: { type: "object", additionalProperties: false, required: ["title", "body", "quote"], properties: { title: estr, body: estr, quote: estr } } } } };

export async function compareVersions(ctx: OrgCtx, db: EnginesDb, org: string, role: string, b: Record<string, unknown>) {
  if (!CONTENT.includes(role)) throw new OrgError(403, "accès refusé");
  const to = await need(db.versionInfo)(String(b.version || ""));
  if (!to || to.org_id !== org) throw new OrgError(404, "version introuvable");
  if (to.version < 2) throw new OrgError(400, "pas de version précédente à comparer");
  const from = await need(db.versionByNumber)(to.source_id, to.version - 1);
  if (!from) throw new OrgError(404, "version précédente introuvable");
  const pages = (await readVerified(ctx, db, to)).pages; // intégrité du fichier vérifiée avant toute comparaison
  const text = pages.join("\n");
  const pageOf = (q: string) => { const i = pages.findIndex((p) => inDoc(q, p)); return i >= 0 ? i + 1 : null; };
  const old = (await need(db.knowledgeOfVersion)(from.id)).filter((k) => ["valide", "a_revalider"].includes(k.status));
  const items: Record<string, unknown>[] = [];
  const rest: Knowledge[] = [];
  old.forEach((k) => { if (inDoc(k.quote, text)) items.push({ knowledge_id: k.id, change: "inchange", sensitive: k.kind === "sensible", new_quote: k.quote, new_page: pageOf(k.quote), explanation: "Extrait retrouvé mot pour mot dans la nouvelle version." }); else rest.push(k); });
  let analysed = true;
  {
    try {
      const out = await ask(ctx, "comparer", {
        system: `Une procédure ou une fiche a changé. On te donne des connaissances de l'ANCIENNE version [k…] dont l'extrait n'apparaît plus tel quel, et le texte de la NOUVELLE version.
Pour chaque [k…] : "reformule" (même sens, autres mots), "modifie" (le fond a changé : chiffre, règle, étape…), ou "supprime" (plus mentionné). "quote" = l'extrait de la nouvelle version COPIÉ MOT POUR MOT qui correspond ("" si supprimé), "body" = la connaissance à jour, "why" = ce qui a changé, en une phrase.
"added" : les nouvelles règles ou informations importantes absentes de l'ancienne version (extrait mot pour mot). N'invente rien.`,
        user: `Anciennes connaissances :\n${kRefs(rest) || "(aucune)"}\n\nNouvelle version :\n"""${text.slice(0, 9000)}"""`,
        schema: CHANGE_SCHEMA, maxTokens: 2000,
      });
      const seen = new Set<string>();
      (Array.isArray(out.items) ? out.items : []).map((x) => x as Record<string, string>).forEach((x) => {
        const k = kAt(rest, x.k); if (!k || seen.has(k.id)) return; seen.add(k.id);
        const quote = eclip(x.quote, 1200).trim(), ok = x.change !== "supprime" && inDoc(quote, text);
        const change = x.change === "supprime" ? "supprime" : x.change === "reformule" && ok ? "reformule" : "modifie";
        items.push({ knowledge_id: k.id, change, sensitive: k.kind === "sensible" || isSensitive(`${quote} ${x.body}`), new_body: change === "supprime" ? null : eclip(x.body, 6000) || null,
          new_quote: ok ? quote : null, new_page: ok ? pageOf(quote) : null, explanation: eclip(x.why, 500) + (change !== "supprime" && !ok ? " (extrait non retrouvé dans le document : à vérifier)" : "") });
      });
      rest.filter((k) => !seen.has(k.id)).forEach((k) => items.push({ knowledge_id: k.id, change: "modifie", sensitive: k.kind === "sensible", explanation: "Extrait introuvable dans la nouvelle version ; l'analyse n'a pas conclu : à revoir." }));
      (Array.isArray(out.added) ? out.added : []).slice(0, 10).map((x) => x as Record<string, string>).forEach((x) => {
        const quote = eclip(x.quote, 1200).trim(); if (!inDoc(quote, text)) return;
        items.push({ knowledge_id: null, change: "nouveau", sensitive: isSensitive(`${quote} ${x.body}`), new_title: eclip(x.title, 200) || quote.slice(0, 60), new_body: eclip(x.body, 6000), new_quote: quote, new_page: pageOf(quote), explanation: "Nouvelle information de cette version." });
      });
    } catch (e) {
      if (e instanceof OrgError && e.status === 503) throw e;
      analysed = false; // sans modèle : tout ce qui n'est pas retrouvé mot pour mot reste à revoir par un humain
      rest.forEach((k) => items.push({ knowledge_id: k.id, change: "modifie", sensitive: k.kind === "sensible", explanation: "Extrait introuvable dans la nouvelle version (analyse automatique indisponible) : à revoir." }));
    }
  }
  const count = (c: string) => items.filter((i) => i.change === c).length;
  const summary = { inchange: count("inchange"), reformule: count("reformule"), modifie: count("modifie"), supprime: count("supprime"), nouveau: count("nouveau"), sensibles: items.filter((i) => i.sensitive && i.change !== "inchange").length, analysed };
  const cid = await need(db.insertPolicyChange)({ org_id: org, source_id: to.source_id, from_version_id: from.id, to_version_id: to.id, summary, created_by: ctx.userId,
    status: items.some((i) => i.change !== "inchange") ? "a_valider" : "traite" });
  if (items.length) await need(db.insertChangeItems)(items.map((i) => ({ ...i, org_id: org, change_id: cid, decision: "a_valider" })));
  return { change: cid, summary };
}

/* ---------- Invitation envoyée par e-mail ---------- */
async function sha256(t: string) { const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t)); return [...new Uint8Array(h)].map((x) => x.toString(16).padStart(2, "0")).join(""); }
const escHtml = (s: string) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
export async function sendInvitation(ctx: OrgCtx, db: EnginesDb, org: string, role: string, b: Record<string, unknown>) {
  if (!LEAD.includes(role)) throw new OrgError(403, "accès refusé");
  const id = String(b.invitation || ""), token = String(b.token || "");
  if (!UUIDR.test(id) || !/^[0-9a-f]{48}$/.test(token)) throw new OrgError(400, "invitation invalide");
  const inv = await need(db.invitationById)(id);
  if (!inv || inv.org_id !== org) throw new OrgError(404, "invitation introuvable");
  // le jeton n'est jamais stocké : on vérifie qu'il correspond bien à cette invitation
  if ((await sha256(token)) !== inv.token_hash) throw new OrgError(403, "le lien ne correspond pas à cette invitation");
  if (inv.accepted_at || inv.revoked_at || new Date(String(inv.expires_at)) < new Date()) throw new OrgError(409, "invitation déjà utilisée, annulée ou expirée");
  if (inv.sent_at && Date.now() - new Date(String(inv.sent_at)).getTime() < 10 * 60e3) throw new OrgError(429, "e-mail déjà envoyé il y a moins de 10 minutes");
  if (Number(inv.send_count || 0) >= 5) throw new OrgError(429, "trop d'envois pour cette invitation : partage le lien autrement");
  if (!db.sendEmail) throw new OrgError(501, "envoi par e-mail non configuré : partage le lien");
  const link = `${db.siteUrl || "https://hmzr944.github.io/Landing-page/"}#/rejoindre/${token}`;
  const org_name = String(inv.org_name || "ton organisation");
  const text = `Bonjour,\n\n${org_name} t'invite à rejoindre son espace de formation sur Arbor.\nOuvre ce lien sur ton téléphone et connecte-toi avec cette adresse (${inv.email}) :\n${link}\n\nLe lien est valable 7 jours et ne sert qu'une fois.`;
  const html = `<p>Bonjour,</p><p><b>${escHtml(org_name)}</b> t'invite à rejoindre son espace de formation sur Arbor.</p><p><a href="${escHtml(link)}">Rejoindre ${escHtml(org_name)}</a></p><p>Connecte-toi avec cette adresse : ${escHtml(String(inv.email))}. Le lien est valable 7 jours et ne sert qu'une fois.</p>`;
  try { await db.sendEmail(String(inv.email), `Invitation : ${org_name} sur Arbor`, html, text); }
  catch (_e) { throw new OrgError(502, "l'e-mail n'a pas pu partir : partage le lien"); }
  await need(db.markInvitationSent)(id, Number(inv.send_count || 0) + 1);
  return { sent: true };
}
