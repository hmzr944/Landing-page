// Tests de la fonction « tutor » (Deno) :  deno test --allow-net --allow-env supabase/functions/tutor/
// Aucune clé ni aucun réseau réel : un faux serveur local « compatible OpenAI » (comme Groq) reçoit les requêtes.
import { assert, assertEquals } from "jsr:@std/assert@1";
import { buildPrompt, checkCitations, type Deps, handle, validate } from "./handler.ts";
import { isSensitive, support } from "./generate.ts";
import { makeCallModel } from "./model.ts";
import { integrityOf, passageFound, pdfPages, sha256Hex, verifyPassages } from "./pdftext.ts";

const passages = [
  { page: 3, text: "Le masque désigne le nombre de bits constituant l'identifiant de réseau dans l'adresse A.B.C.D." },
  { page: 9, text: "La passerelle est le routeur qui permet de sortir du réseau local vers les autres réseaux." },
];
const body = { mode: "socratique", notion: { title: "Masque de sous-réseau", course: "Protocoles TCP-IP" }, passages, message: "Le masque envoie le paquet au bon réseau." };
const req = (b: unknown, jwt = "jeton-valide", origin = "https://hmzr944.github.io") =>
  new Request("http://localhost/tutor", { method: "POST", headers: { authorization: `Bearer ${jwt}`, origin, "content-type": "application/json" }, body: JSON.stringify(b) });

function fakeDeps(over: Partial<Deps> = {}, modelOut: Record<string, unknown> = {}) {
  const recorded: unknown[] = [];
  const deps: Deps = {
    limit: 3, origins: ["https://hmzr944.github.io"],
    getUser: async (jwt) => (jwt === "jeton-valide" ? { id: "u1" } : null),
    usedThisMonth: async () => 0,
    record: async (e) => { recorded.push(e); },
    callModel: async () => ({
      text: JSON.stringify({ reply: "Le masque ne transporte rien : à quoi sert-il quand on compare deux adresses ?", verdict: "faux", misconception: "confond masque et passerelle", hint_level: 0,
        citations: [{ passage: 1, quote: "nombre de bits constituant l'identifiant de réseau" }, { passage: 2, quote: "phrase inventée qui n'est pas dans le cours" }],
        correct_points: [], missing: ["le masque sépare réseau et machine"], done: false, next_activity: "relire_passage", ...modelOut }),
      stop: "end_turn", model: "openai/gpt-oss-120b", inputTokens: 1000, outputTokens: 200,
    }),
    ...over,
  };
  return { deps, recorded };
}

Deno.test("une confusion est nommée et les citations inventées sont retirées", async () => {
  const { deps, recorded } = fakeDeps();
  const r = await handle(req(body), deps);
  assertEquals(r.status, 200);
  const j = await r.json();
  assertEquals(j.verdict, "faux");
  assertEquals(j.misconception, "confond masque et passerelle");
  assertEquals(j.citations.length, 1);
  assertEquals(j.citations[0].page, 3);
  assertEquals(j.citations_dropped, 1);
  assertEquals(j.usage, { used: 1, limit: 3 });
  // coût : 1000 × 4 $ + 200 × 20 $ par million = 0,008 $
  assertEquals((recorded[0] as { costUsd: number }).costUsd, 0);
});

Deno.test("sans connexion : 401, sans appel au modèle", async () => {
  let called = false;
  const { deps } = fakeDeps({ callModel: async () => { called = true; throw new Error("x"); } });
  const r = await handle(req(body, "faux-jeton"), deps);
  assertEquals(r.status, 401);
  assert(!called);
});

Deno.test("quota atteint : 429 avant tout appel au modèle", async () => {
  let called = false;
  const { deps } = fakeDeps({ usedThisMonth: async () => 3, callModel: async () => { called = true; throw new Error("x"); } });
  const r = await handle(req(body), deps);
  assertEquals(r.status, 429);
  assertEquals((await r.json()).error, "quota");
  assert(!called);
});

Deno.test("sans passage du cours, le tuteur refuse de répondre", async () => {
  const { deps } = fakeDeps();
  const r = await handle(req({ ...body, passages: [] }), deps);
  assertEquals(r.status, 400);
});

Deno.test("refus de sécurité : enregistré, message neutre, pas de contenu", async () => {
  const { deps, recorded } = fakeDeps({ callModel: async () => ({ text: "", stop: "refusal", model: "openai/gpt-oss-120b", inputTokens: 500, outputTokens: 0 }) });
  const j = await (await handle(req(body), deps)).json();
  assert(j.refused);
  assertEquals((recorded[0] as { refused: boolean }).refused, true);
});

Deno.test("modèle injoignable : 502 lisible, rien n'est facturé", async () => {
  const { deps, recorded } = fakeDeps({ callModel: async () => { throw new Error("réseau"); } });
  const r = await handle(req(body), deps);
  assertEquals(r.status, 502);
  assertEquals(recorded.length, 0);
});

Deno.test("CORS : une autre origine ne reçoit pas son origine en retour", async () => {
  const { deps } = fakeDeps();
  const r = await handle(new Request("http://localhost/tutor", { method: "OPTIONS", headers: { origin: "https://exemple.com" } }), deps);
  assertEquals(r.headers.get("access-control-allow-origin"), "https://hmzr944.github.io");
});

Deno.test("validation : tailles bornées, historique limité", () => {
  const v = validate({ ...body, passages: Array.from({ length: 20 }, () => ({ page: 1, text: "x".repeat(5000) })), history: Array.from({ length: 40 }, () => ({ role: "student", text: "y" })) });
  assert(v.ok);
  if (v.ok) { assert(v.req.passages.length <= 8); assert(v.req.passages.reduce((a, p) => a + p.text.length, 0) <= 12000); assertEquals(v.req.history!.length, 12); }
});

Deno.test("le prompt numérote les passages avec leur page", () => {
  const v = validate(body);
  assert(v.ok);
  if (v.ok) { const p = buildPrompt(v.req); assert(p.includes("[P1] (page 3)")); assert(p.includes("Réponse de l'étudiant : Le masque envoie")); }
});

Deno.test("citations : accents et guillemets tolérés, extraits inventés refusés", () => {
  const c = checkCitations([{ passage: 1, quote: "Le masque designe le nombre de bits" }, { passage: 9, quote: "rien" }, { passage: 2, quote: "le routeur qui permet de sortir" }], passages);
  assertEquals(c.map((x) => x.passage), [1, 2]);
});

const ok = { reply: "ok", verdict: "juste", misconception: "", hint_level: 0, citations: [], correct_points: [], missing: [], done: true, next_activity: "terminer" };
async function fakeApi(handler: (b: Record<string, any>, n: number) => Response, run: (base: string, seen: Record<string, any>[]) => Promise<void>) {
  const seen: Record<string, any>[] = [];
  const server = Deno.serve({ port: 0, onListen() {} }, async (r) => { const b = await r.json(); b._auth = r.headers.get("authorization"); b._path = new URL(r.url).pathname; seen.push(b); return handler(b, seen.length); });
  try { await run(`http://localhost:${server.addr.port}/openai/v1`, seen); } finally { await server.shutdown(); }
}
const completion = (model: string, content: string, finish = "stop") => Response.json({ model, choices: [{ message: { role: "assistant", content }, finish_reason: finish }], usage: { prompt_tokens: 42, completion_tokens: 7 } });

Deno.test("gpt-oss reçoit le schéma JSON strict, la clé en en-tête et l'effort de raisonnement", async () => {
  await fakeApi((b) => completion(b.model, JSON.stringify(ok)), async (base, seen) => {
    const out = await makeCallModel({ baseUrl: base, apiKey: "cle-de-test", models: ["openai/gpt-oss-120b", "llama-3.3-70b-versatile"] })({ system: "s", user: "u", schema: { type: "object" }, effort: "low" });
    assertEquals(seen.length, 1);
    assertEquals(seen[0]._path, "/openai/v1/chat/completions");
    assertEquals(seen[0]._auth, "Bearer cle-de-test");
    assertEquals(seen[0].model, "openai/gpt-oss-120b");
    assertEquals(seen[0].response_format, { type: "json_schema", json_schema: { name: "tutor_reply", strict: true, schema: { type: "object" } } });
    assertEquals(seen[0].reasoning_effort, "low");
    assertEquals(out.inputTokens, 42);
    assertEquals(JSON.parse(out.text).verdict, "juste");
  });
});

Deno.test("modèle saturé (429) : bascule sur le modèle de secours, en mode JSON simple", async () => {
  await fakeApi((b, n) => n === 1 ? new Response("{}", { status: 429 }) : completion(b.model, JSON.stringify(ok)), async (base, seen) => {
    const out = await makeCallModel({ baseUrl: base, apiKey: "k", models: ["openai/gpt-oss-120b", "llama-3.3-70b-versatile"] })({ system: "s", user: "u", schema: { type: "object" }, effort: "low" });
    assertEquals(seen.map((x) => x.model), ["openai/gpt-oss-120b", "llama-3.3-70b-versatile"]);
    assertEquals(seen[1].response_format, { type: "json_object" });
    assert(String(seen[1].messages[0].content).includes("objet JSON"), "le schéma est rappelé dans la consigne");
    assert(!("reasoning_effort" in seen[1]));
    assertEquals(out.model, "llama-3.3-70b-versatile");
  });
});

Deno.test("schéma refusé (400) : même modèle, en mode JSON simple ; filtre de contenu = refus", async () => {
  await fakeApi((b, n) => n === 1 ? Response.json({ error: { message: "schema" } }, { status: 400 }) : completion(b.model, "", "content_filter"), async (base, seen) => {
    const out = await makeCallModel({ baseUrl: base, apiKey: "k", models: ["openai/gpt-oss-120b"] })({ system: "s", user: "u", schema: { type: "object" }, effort: "medium" });
    assertEquals(seen.length, 2);
    assertEquals(seen[1].response_format, { type: "json_object" });
    assertEquals(out.stop, "refusal");
  });
});

Deno.test("coût nul par défaut, prix réglable", async () => {
  const a = fakeDeps(); await handle(req(body), a.deps);
  assertEquals((a.recorded[0] as { costUsd: number }).costUsd, 0);
  const b = fakeDeps({ price: { input: 1, output: 2 } }); await handle(req(body), b.deps);
  assertEquals((b.recorded[0] as { costUsd: number }).costUsd, 0.0014);
});

/* ---------- Génération de contenu (remplace l'appel direct depuis le navigateur) ---------- */
const extrait = "Le protocole DHCP attribue automatiquement une adresse IP, un masque de sous-réseau et une passerelle par défaut à chaque poste qui rejoint le réseau. Le client envoie une requête DHCPDISCOVER en diffusion, le serveur répond par une offre DHCPOFFER.";
const XORG = "33333333-3333-4333-8333-333333333333", XVER = "44444444-4444-4444-8444-444444444444";
function genDeps(modelOut: Record<string, unknown>, over: Partial<Deps> = {}) {
  const calls: { kind: string }[] = [], recorded: unknown[] = [], seen: Record<string, unknown>[] = [];
  const { deps } = fakeDeps({
    usedThisMonth: async (_u, _m, kind) => { calls.push({ kind }); return 0; },
    record: async (e) => { recorded.push(e); },
    callModel: async (p) => { seen.push(p as unknown as Record<string, unknown>); return { text: JSON.stringify(modelOut), stop: "stop", model: "openai/gpt-oss-120b", inputTokens: 300, outputTokens: 120 }; },
    // extraction Business : rôle dans l'organisation, version du document, texte du PDF stocké
    db: { role: async (_u: string, o: string) => (o === XORG ? "expert" : null) } as unknown as Deps["db"],
    docVersion: async (id: string) => (id === XVER ? { id, org_id: XORG, storage_path: `${XORG}/s/v1.pdf`, checksum: "sha-fiche" } : null),
    docFile: async () => ({ pages: fiche.map((p) => p.text), sha256: "sha-fiche" }),
    ...over,
  });
  return { deps, calls, recorded, seen };
}

Deno.test("enrichir : points ancrés gardés, inventions écartées, quota de génération séparé", async () => {
  const g = genDeps({
    keyPoints: ["DHCP attribue automatiquement l'adresse IP, le masque et la passerelle par défaut.", "Kerberos chiffre les tickets avec AES256 dans Active Directory."],
    exercises: [{ q: "Que fournit DHCP ?", a: "Une adresse IP, un masque de sous-réseau et une passerelle par défaut." }, { q: "Quel port ?", a: "Kerberos utilise toujours le port 88 sur Windows Server." }],
  });
  const r = await handle(req({ task: "enrichir", title: "DHCP", text: extrait }), g.deps);
  assertEquals(r.status, 200);
  const d = await r.json();
  assertEquals(d.keyPoints.length, 1);
  assertEquals(d.exercises.length, 1);
  assertEquals(d.dropped, 2);
  assertEquals(g.calls[0].kind, "generation");
  assertEquals((g.recorded[0] as { mode: string }).mode, "enrichir");
  assertEquals(g.seen[0].maxTokens, 800);
  assert(String(g.seen[0].user).includes("DHCPDISCOVER"));
});

Deno.test("génération : connexion exigée, quota vérifié avant l'appel, texte source obligatoire pour enrichir", async () => {
  const g = genDeps({}, { usedThisMonth: async () => 150 });
  assertEquals((await handle(req({ task: "enrichir", title: "DHCP", text: extrait }, "faux"), g.deps)).status, 401);
  const q = await handle(req({ task: "enrichir", title: "DHCP", text: extrait }), g.deps);
  assertEquals(q.status, 429);
  assertEquals(g.seen.length, 0);
  const g2 = genDeps({});
  assertEquals((await handle(req({ task: "enrichir", title: "DHCP", text: "trop court" }), g2.deps)).status, 400);
  assertEquals((await handle(req({ task: "inconnue", title: "x", text: extrait }), g2.deps)).status, 400);
});

Deno.test("rédiger un cours : notions hors du texte de référence écartées", async () => {
  const g = genDeps({ overview: "DHCP configure les postes.", notions: [
    { title: "Rôle de DHCP", notes: "Le protocole DHCP attribue automatiquement une adresse IP, un masque de sous-réseau et une passerelle par défaut à chaque poste du réseau.", keyPoints: [], exercises: [] },
    { title: "Histoire", notes: "Inventé par Ralph Droms en 1993 à Bucknell University, standardisé ensuite par IETF dans la RFC 2131 publiée en mars 1997.", keyPoints: [], exercises: [] },
  ] });
  const d = await (await handle(req({ task: "rediger_cours", title: "DHCP", text: extrait, sourceTitle: "Wikipédia : DHCP" }), g.deps)).json();
  assertEquals(d.notions.map((n: { title: string }) => n.title), ["Rôle de DHCP"]);
  assertEquals(d.dropped, 1);
  assert(String(g.seen[0].user).includes("Wikipédia : DHCP"));
});

Deno.test("modèles saturés : 503 « occupe », rien n'est enregistré", async () => {
  const g = genDeps({}, { callModel: async () => { const e = new Error("429"); e.name = "Busy"; throw e; } });
  const r = await handle(req({ task: "rediger_notion", title: "DHCP", text: extrait }), g.deps);
  assertEquals(r.status, 503);
  assertEquals(g.recorded.length, 0);
});

Deno.test("ancrage lexical : reformulation fidèle acceptée, invention refusée", () => {
  assert(support("DHCP attribue une adresse IP et un masque automatiquement", extrait) >= 0.5);
  assert(support("Kerberos chiffre les tickets avec AES256", extrait) < 0.5);
});

Deno.test("génération : rien sur l'apprenant (niveau, conseil personnel), même si l'extrait en contient", async () => {
  const src = "Le protocole DHCP attribue automatiquement une adresse IP à chaque poste. Niveau estimé : débutant. Je te conseille de configurer ton laboratoire d'abord.";
  const g = genDeps({
    keyPoints: ["DHCP attribue automatiquement une adresse IP à chaque poste.", "Ton niveau estimé en DHCP est débutant.", "Je te conseille de configurer ton laboratoire."],
    exercises: [{ q: "Que fait DHCP ?", a: "Il attribue automatiquement une adresse IP à chaque poste." }, { q: "Quel est ton niveau ?", a: "Niveau estimé : débutant." }],
  });
  const d = await (await handle(req({ task: "enrichir", title: "DHCP", text: src }), g.deps)).json();
  assertEquals(d.keyPoints, ["DHCP attribue automatiquement une adresse IP à chaque poste."]);
  assertEquals(d.exercises.length, 1);
  assert(String(g.seen[0].system).includes("Ignore tout passage qui juge l'étudiant"));
});

/* ---------- Extraction de connaissances d'un document d'organisation ---------- */
const fiche = [
  { page: 1, text: "Le vélo électrique Alto 500 dispose d'une batterie de 500 Wh. Son autonomie annoncée est de 90 km en mode éco. Le cadre en aluminium pèse 21 kg." },
  { page: 2, text: "Ne jamais recharger une batterie endommagée ou gonflée : l'isoler dans le bac prévu et prévenir le responsable. Le client dispose de 30 jours pour un retour avec le ticket de caisse." },
];
Deno.test("extraire : extrait vérifié mot pour mot, page corrigée, inventions écartées", async () => {
  const g = genDeps({ items: [
    { kind: "produit", title: "Autonomie de l'Alto 500", body: "L'Alto 500 a une autonomie annoncée de 90 km en mode éco.", quote: "Son autonomie annoncée est de 90 km en mode éco", passage: 2, confidence: 0.9 },
    { kind: "produit", title: "Poids", body: "Le vélo pèse 18 kg grâce à son cadre carbone.", quote: "Le cadre en carbone pèse 18 kg", passage: 1, confidence: 0.8 },
    { kind: "regle", title: "Retour client", body: "Le client dispose de 30 jours pour un retour avec le ticket de caisse.", quote: "Le client dispose de 30 jours pour un retour avec le ticket de caisse", passage: 2, confidence: 1.4 },
  ] });
  const r = await handle(req({ task: "extraire", title: "Fiche Alto 500", passages: fiche, org: XORG, version: XVER }), g.deps);
  assertEquals(r.status, 200);
  const d = await r.json();
  assertEquals(d.items.map((x: { title: string }) => x.title), ["Autonomie de l'Alto 500", "Retour client"]);
  assertEquals(d.items[0].page, 1); // le modèle s'est trompé de passage : la page vient de l'extrait retrouvé
  assertEquals(d.dropped, 1);
  assertEquals(d.items[1].confidence, 1);
  assert(String(g.seen[0].user).includes("[P2] (page 2)"));
  assertEquals((g.recorded[0] as { mode: string }).mode, "extraire");
});

Deno.test("extraire : sécurité et argent sont toujours « sensibles », quel que soit l'avis du modèle", async () => {
  const g = genDeps({ items: [
    { kind: "procedure", title: "Batterie endommagée", body: "Ne jamais recharger une batterie endommagée ou gonflée ; l'isoler et prévenir le responsable.", quote: "Ne jamais recharger une batterie endommagée ou gonflée", passage: 2, confidence: 0.9 },
    { kind: "regle", title: "Délai de retour", body: "Le client dispose de 30 jours pour un retour avec le ticket de caisse.", quote: "Le client dispose de 30 jours pour un retour", passage: 2, confidence: 0.9 },
  ] });
  const d = await (await handle(req({ task: "extraire", title: "Fiche Alto 500", passages: fiche, org: XORG, version: XVER }), g.deps)).json();
  assertEquals(d.items[0].kind, "sensible");
  assertEquals(d.items[1].kind, "regle"); // un retour n'est pas un remboursement : pas de mot sensible ici
  assert(isSensitive("Remboursement sous 14 jours") && isSensitive("Produit toxique") && !isSensitive("Le cadre pèse 21 kg"));
});

Deno.test("extraire : passages obligatoires, quota de génération", async () => {
  const g = genDeps({ items: [] });
  assertEquals((await handle(req({ task: "extraire", title: "Fiche", passages: [], org: XORG, version: XVER }), g.deps)).status, 400);
  assertEquals((await handle(req({ task: "extraire", title: "Fiche", passages: fiche, org: XORG, version: XVER }), g.deps)).status, 200);
  assertEquals(g.calls[0].kind, "generation");
});

const dictee = "Bon alors la photosynthèse c'est quand la plante utilise la lumière du soleil pour fabriquer du sucre. Je crois que ça se passe dans les chloroplastes, enfin peut-être dans les racines aussi. Elle rejette de l'oxygène et elle absorbe du dioxyde de carbone par les feuilles.";
Deno.test("structurer : extraits vérifiés dans le texte, inventions et jugements écartés, quota de génération", async () => {
  const g = genDeps({ title: "Photosynthèse", gaps: ["Rôle de la chlorophylle", "Ton niveau est faible"], notions: [
    { title: "Définition", quote: "la plante utilise la lumière du soleil pour fabriquer du sucre", check: false, question: "Que produit la plante avec la lumière ?" },
    { title: "Lieu", quote: "Je crois que ça se passe dans les chloroplastes, enfin peut-être dans les racines aussi", check: true, question: "Où se déroule la photosynthèse ?" },
    { title: "Cycle de Calvin", quote: "le cycle de Calvin fixe le CO2 dans le stroma", check: false, question: "Qu'est-ce que le cycle de Calvin ?" },
    { title: "Échanges gazeux", quote: "Elle rejette de l’oxygène et elle absorbe du dioxyde de carbone", check: false, question: "Ton travail est-il suffisant ?" },
  ] });
  const r = await handle(req({ task: "structurer", title: "Photosynthèse", context: "explication", text: dictee }), g.deps);
  assertEquals(r.status, 200);
  const d = await r.json();
  assertEquals(d.notions.map((n: { title: string }) => n.title), ["Définition", "Lieu"]); // inventé et question sur la personne : écartés
  assertEquals(d.notions[1].check, true);
  assertEquals(d.dropped, 2);
  assertEquals(d.gaps, ["Rôle de la chlorophylle"]);
  assertEquals(g.calls[0].kind, "generation");
  assertEquals((g.recorded[0] as { mode: string }).mode, "structurer");
  assert(String(g.seen[0].user).includes("explication orale transcrite"));
  assert(String(g.seen[0].system).includes("pas une preuve de maîtrise"));
});

Deno.test("structurer : texte trop court refusé ; mode photo annoncé au modèle", async () => {
  const g = genDeps({ title: "x", notions: [], gaps: [] });
  assertEquals((await handle(req({ task: "structurer", title: "-", text: "trop court" }), g.deps)).status, 400);
  assertEquals(g.seen.length, 0);
  assertEquals((await handle(req({ task: "structurer", title: "-", context: "support", text: dictee }), g.deps)).status, 200);
  assert(String(g.seen[0].user).includes("lu sur une photo"));
});

Deno.test("extraire : chaque passage est retrouvé dans le PDF stocké, relu sur le serveur ; un passage inventé est écarté avant le modèle", async () => {
  const g = genDeps({ items: [] });
  const faux = { page: 1, text: "Le vélo Alto 500 est garanti à vie et livré gratuitement partout en Europe sans condition." };
  const r = await handle(req({ task: "extraire", title: "Fiche", passages: [...fiche, faux], org: XORG, version: XVER }), g.deps);
  assertEquals(r.status, 200);
  assertEquals((await r.json()).unverified, 1);
  assert(!String(g.seen[0].user).includes("garanti à vie"));
  const g2 = genDeps({ items: [] });
  const r2 = await handle(req({ task: "extraire", title: "Fiche", passages: [faux], org: XORG, version: XVER }), g2.deps);
  assertEquals(r2.status, 422);
  assertEquals(g2.seen.length, 0);
});

Deno.test("extraire : organisation et version obligatoires, équipe de contenu seulement, version d'une autre organisation refusée", async () => {
  const g = genDeps({ items: [] });
  assertEquals((await handle(req({ task: "extraire", title: "Fiche", passages: fiche }), g.deps)).status, 400);
  assertEquals((await handle(req({ task: "extraire", title: "Fiche", passages: fiche, org: "55555555-5555-4555-8555-555555555555", version: XVER }), g.deps)).status, 403);
  assertEquals((await handle(req({ task: "extraire", title: "Fiche", passages: fiche, org: XORG, version: "66666666-6666-4666-8666-666666666666" }), g.deps)).status, 404);
  assertEquals(g.seen.length, 0);
});

Deno.test("PDF stocké relu pour de vrai (unpdf) : les passages du document sont retrouvés, un passage inventé ne l'est pas", async () => {
  const bytes = await Deno.readFile(new URL("../../../docs/demo/procedure-retours-EXEMPLE-FICTIF.pdf", import.meta.url));
  const pages = await pdfPages(bytes);
  assert(pages.length >= 1 && pages[0].length > 200);
  // un passage tel que le navigateur l'envoie : mêmes mots, autres coupures de lignes
  const words = pages[0].replace(/\s+/g, " ").split(" ");
  const real = words.slice(20, 60).join("\n");
  assert(passageFound(real, pages, 1));
  assert(!passageFound("Le remboursement est toujours accordé en espèces dans un délai de deux heures après la demande du client.", pages, 1));
  const v = verifyPassages([{ page: 1, text: real }, { page: 1, text: "Texte inventé qui ne figure nulle part dans cette procédure de démonstration, vraiment." }], pages);
  assertEquals([v.kept.length, v.dropped.length], [1, 1]);
});

Deno.test("dialogue : mode « mise en situation » accepté, consigne explicite, ancrée dans les passages", () => {
  const v = validate({ ...body, mode: "situation", message: "" });
  assert(v.ok);
  const p = buildPrompt((v as { req: Parameters<typeof buildPrompt>[0] }).req);
  assert(p.includes("Mode : mise en situation") && p.includes("situation concrète") && p.includes("[P1]"));
  assert(!validate({ ...body, mode: "autre" }).ok);
});

Deno.test("provenance (P0) : empreinte du fichier stocké calculée par le serveur ; divergente, l'extraction est bloquée et tracée", async () => {
  const marks: unknown[][] = [];
  const g = genDeps({ items: [] }, { docFile: async () => ({ pages: fiche.map((p) => p.text), sha256: "autre-empreinte" }), markIntegrity: async (...a: unknown[]) => { marks.push(a); } });
  const r = await handle(req({ task: "extraire", title: "Fiche", passages: fiche, org: XORG, version: XVER }), g.deps);
  assertEquals(r.status, 409);
  assert(/intégrité/.test((await r.json()).error));
  assertEquals(g.seen.length, 0); // aucun appel au modèle
  assertEquals([marks[0][0], marks[0][1], marks[0][2], marks[0][5]], [XVER, "divergent", "autre-empreinte", "sha-fiche"]);
  const g2 = genDeps({ items: [] }, { markIntegrity: async (...a: unknown[]) => { marks.push(a); } });
  assertEquals((await handle(req({ task: "extraire", title: "Fiche", passages: fiche, org: XORG, version: XVER }), g2.deps)).status, 200);
  assertEquals(marks[1][1], "conforme");
});

Deno.test("provenance : SHA-256 réel des octets du PDF ; l'empreinte déclarée doit être identique", async () => {
  const bytes = await Deno.readFile(new URL("../../../docs/demo/procedure-retours-EXEMPLE-FICTIF.pdf", import.meta.url));
  const sha = await sha256Hex(bytes);
  assert(/^[0-9a-f]{64}$/.test(sha));
  const ref = [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))].map((x) => x.toString(16).padStart(2, "0")).join("");
  assertEquals(sha, ref);
  assertEquals(integrityOf(sha.toUpperCase(), sha), "conforme");
  assertEquals(integrityOf("0".repeat(64), sha), "divergent");
  assertEquals(integrityOf(null, sha), "conforme"); // version ancienne sans empreinte déclarée : celle du serveur devient la référence
  const altered = bytes.slice(); altered[altered.length - 10] ^= 1;
  assert((await sha256Hex(altered)) !== sha);
});

Deno.test("règle écrite (Setup Express) : le PDF produit dans le navigateur est relu par le serveur, accents compris, et ses extraits sont retrouvés", async () => {
  // le module navigateur s'installe sur globalThis quand il n'y a pas de module.exports
  await import("../../../js/textpdf.js");
  const TextPdf = (globalThis as unknown as { TextPdf: { make: (t: string, o: Record<string, unknown>) => Uint8Array } }).TextPdf;
  const regle = "Lorsqu’un client demande un remboursement, nous devons vérifier le ticket de caisse et l’état du produit avant de proposer une solution. Au-delà de 30 jours, on propose un avoir (« bon d’achat ») de 100 €.";
  const bytes = TextPdf.make(regle, { title: "Règle : remboursement", author: "Léa Martin", date: new Date("2026-11-13T10:00:00Z") });
  const pages = await pdfPages(bytes);
  assertEquals(pages.length, 1);
  assert(pages[0].includes("vérifier le ticket de caisse"), pages[0].slice(0, 200));
  assert(pages[0].includes("Léa Martin"));
  assert(pages[0].includes("100 €"));
  assert(passageFound("nous devons vérifier le ticket de caisse et l’état du produit avant de proposer une solution", pages, 1));
  assert(/^[0-9a-f]{64}$/.test(await sha256Hex(bytes)));
  // un long texte passe sur plusieurs pages, toujours lisible
  const long = TextPdf.make(Array.from({ length: 80 }, (_, i) => `Règle ${i + 1} : toujours vérifier l’étiquette du produit numéro ${i + 1}.`).join("\n"), { title: "Long" });
  const lp = await pdfPages(long);
  assert(lp.length >= 2 && lp[lp.length - 1].includes("numéro 80"));
});
