/* Documents mixtes : ce qui est à apprendre (cours) et ce qui ne l'est pas (évaluation, conseil, commentaire, annexe).
   Trois sources :
   A. Documents générés ici, dans plusieurs disciplines, avec leurs pièges (toujours exécutés).
   B. Documents réels publics téléchargés sur le web (cours universitaires, fiches d'évaluation, guides) : exécutés
      si le réseau le permet, sinon signalés « NON VÉRIFIÉ ». Ils ne sont jamais copiés dans le dépôt.
   C. Documents personnels, seulement si ARBOR_PRIVATE_DIR pointe vers un dossier local (jamais publiés).
   Pour chaque document, on vérifie que les phrases mises de côté n'apparaissent ni dans le cours, ni dans les points
   clés, ni dans la leçon générée, ni dans les passages envoyés à Pousse, et que les sujets gardés citent leur page.
   Lancer depuis la racine du dépôt :  node tests/pdf-mixed.js   (Playwright requis). */
const http = require('http');
const https = require('https');
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

const doc = (title, body) => `<html><head><meta charset="utf-8"></head><body style="font-family:Arial;font-size:12.5px;line-height:1.45;margin:40px">
<h1 style="font-size:24px">${title}</h1>${body}</body></html>`;

/* ---------- A. Documents générés : pièges par discipline ---------- */
const GEN = [
  {
    id: 'bilan-compta', name: 'Bilan personnel en comptabilité (1re personne, tutoiement)',
    html: doc('Bilan de compétences en comptabilité', `
<h2>1. Mon évaluation de ton niveau</h2>
<p>Je vais être honnête avec toi. Tu as fait des progrès, mais tu confonds encore les charges et les immobilisations. Ton niveau actuel est fragile.</p>
<h2>2. Diagnostic par domaine</h2>
<h3>2.1 Comptabilité générale</h3>
<p>Niveau estimé : Débutant</p>
<p>Tu as découvert :</p><ul><li>Le bilan comptable.</li><li>Le compte de résultat.</li><li>Les écritures de journal.</li><li>La balance des comptes.</li></ul>
<p>Mon constat : Tu connais le vocabulaire mais tu ne sais pas encore passer une écriture seul.</p>
<h3>2.2 Fiscalité</h3>
<p>Niveau estimé : Très faible</p>
<p>Tu as découvert :</p><ul><li>La TVA collectée et déductible.</li><li>L’impôt sur les sociétés.</li><li>La liasse fiscale.</li></ul>
<p>Mon constat : C’est ton plus gros point faible.</p>
<h2>3. Ma recommandation</h2>
<p>Je te conseille de commencer par les écritures de base. Ne cherche pas encore à te spécialiser en fiscalité.</p>`),
    aside: ['Je vais être honnête avec toi', 'tu confonds encore les charges', 'Tu connais le vocabulaire mais tu ne sais pas encore', 'C’est ton plus gros point faible', 'Je te conseille de commencer', 'Ne cherche pas encore'],
    keep: [], topics: ['Le bilan comptable', 'La TVA collectée et déductible', 'La liasse fiscale'], kinds: ['evaluation', 'recommandation'], topicsOnly: true,
  },
  {
    id: 'bio-annote', name: 'Cours de biologie annoté par un professeur',
    html: doc('La division cellulaire', `
<h2>1. La mitose</h2>
<p>La mitose est la division d’une cellule mère en deux cellules filles génétiquement identiques. Elle comprend quatre phases : la prophase, la métaphase, l’anaphase et la télophase. Pendant l’anaphase, les chromatides sœurs se séparent et migrent vers les pôles opposés de la cellule.</p>
<h2>2. La méiose</h2>
<p>La méiose est une succession de deux divisions qui produit quatre cellules haploïdes. Elle assure le brassage génétique grâce au crossing-over et à la ségrégation indépendante des chromosomes.</p>
<h2>Remarques du professeur</h2>
<p>Bon travail sur la mitose, mais tu confonds encore mitose et méiose dans ta copie. Je te conseille de revoir le schéma de l’anaphase avant le contrôle.</p>`),
    aside: ['Bon travail sur la mitose', 'Je te conseille de revoir'],
    keep: ['La mitose est la division d’une cellule mère', 'Pendant l’anaphase, les chromatides sœurs se séparent', 'La méiose est une succession de deux divisions'], kinds: ['evaluation'],
  },
  {
    id: 'langues-3e', name: 'Bilan de langues à la 3e personne',
    html: doc('Espagnol : bilan du trimestre et rappels de grammaire', `
<h2>Rappels de grammaire</h2>
<p>Le passé simple espagnol (pretérito indefinido) exprime une action achevée dans le passé. Les verbes réguliers en -ar prennent les terminaisons -é, -aste, -ó, -amos, -asteis, -aron. Le verbe ser et le verbe ir ont la même conjugaison au passé simple : fui, fuiste, fue.</p>
<h2>Appréciation</h2>
<p>L’élève maîtrise le présent de l’indicatif mais confond encore le passé simple et l’imparfait. Résultats satisfaisants à l’oral. L’élève doit encore travailler l’accentuation écrite.</p>`),
    aside: ['L’élève maîtrise le présent', 'Résultats satisfaisants à l’oral', 'L’élève doit encore travailler'],
    keep: ['Le passé simple espagnol (pretérito indefinido) exprime une action achevée', 'Le verbe ser et le verbe ir ont la même conjugaison'], kinds: ['evaluation'],
  },
  {
    id: 'philo', name: 'Cours de philosophie avec des citations à la 1re personne',
    html: doc('Descartes et le doute méthodique', `
<h2>1. Le doute méthodique</h2>
<p>Descartes décide de douter de tout ce qui peut l’être. Il écrit : « Je pense, donc je suis. » Cette proposition résiste au doute, car même si je me trompe, il faut que je sois pour me tromper.</p>
<h2>2. Le cogito</h2>
<p>Le cogito est la première certitude de la philosophie cartésienne. Je suis une chose qui pense, c’est-à-dire une chose qui doute, qui conçoit, qui affirme et qui nie.</p>`),
    aside: [], keep: ['Je pense, donc je suis', 'Le cogito est la première certitude', 'Je suis une chose qui pense'], kinds: [],
  },
  {
    id: 'droit-conseils', name: 'Fiche de droit avec conseils de révision',
    html: doc('La formation du contrat', `
<h2>1. L’offre et l’acceptation</h2>
<p>L’article 1113 du Code civil dispose que le contrat est formé par la rencontre d’une offre et d’une acceptation par lesquelles les parties manifestent leur volonté de s’engager. L’offre doit être ferme et précise ; à défaut, il ne s’agit que d’une invitation à entrer en pourparlers.</p>
<h2>2. La validité</h2>
<p>Selon l’article 1128, sont nécessaires à la validité d’un contrat le consentement des parties, leur capacité de contracter et un contenu licite et certain.</p>
<h2>Conseils pour l’examen</h2>
<p>Tu confonds encore l’offre et l’invitation à entrer en pourparlers. Je te conseille de relire l’article 1128 et de refaire les cas pratiques du TD 3.</p>`),
    aside: ['Tu confonds encore l’offre', 'Je te conseille de relire'],
    keep: ['L’article 1113 du Code civil dispose', 'sont nécessaires à la validité d’un contrat'], kinds: ['evaluation'],
  },
  {
    id: 'en-report', name: 'English report: biology lesson and teacher feedback',
    html: doc('Photosynthesis: lesson notes and feedback', `
<h2>1. Photosynthesis</h2>
<p>Photosynthesis converts light energy into chemical energy stored in glucose. It takes place in the chloroplasts, where chlorophyll absorbs mainly red and blue light. The light-dependent reactions produce ATP and NADPH, which the Calvin cycle uses to fix carbon dioxide.</p>
<h2>2. Teacher feedback</h2>
<p>Overall, the student demonstrates a solid understanding of the light-dependent reactions. Your diagram of the chloroplast is clear. I recommend more practice on the Calvin cycle before the exam. Well done.</p>`),
    aside: ['the student demonstrates a solid understanding', 'I recommend more practice', 'Well done'],
    keep: ['Photosynthesis converts light energy into chemical energy', 'The light-dependent reactions produce ATP and NADPH'], kinds: ['evaluation'],
  },
  {
    id: 'formulaire', name: 'Fiche d’évaluation de stage vierge',
    html: doc('Fiche d’appréciation du stagiaire', `
<p>Nom : ............................ Prénom : ............................</p>
<p>Date de début : ...................... Date de fin : ......................</p>
<p>Mettre une croix dans la case correspondant à votre évaluation.</p>
<p>Ponctualité : Excellent Très bien Bien Assez bien Passable Insuffisant</p>
<p>Autonomie : Excellent Très bien Bien Assez bien Passable Insuffisant</p>
<p>Appréciation générale du tuteur : ..........................................................</p>
<p>Signature : ......................</p>`),
    aside: ['Prénom', 'Mettre une croix', 'Signature'], keep: [], kinds: ['annexe'], form: true,
  },
];

/* ---------- B. Documents réels publics (web) ---------- */
const WEB = [
  { id: 'web-droit-aunege', name: 'Cours de droit des contrats (AUNEGe, CC BY-NC-ND)', url: 'https://moodle.luniversitenumerique.fr/pluginfile.php/88686/mod_resource/content/3/droit-des-contrats-presentation-cours.pdf',
    expectAsideText: ['Ce cours vous est proposé par'], keep: ['Le droit des contrats est une branche du droit civil'], noKinds: ['evaluation', 'recommandation', 'commentaire'] },
  { id: 'web-bio-td', name: 'TD de biologie cellulaire : la mitose (Université de Béjaïa)', url: 'https://elearning.univ-bejaia.dz/pluginfile.php/115252/mod_folder/content/0/TD_N1_LE_CYCLE_CELLULAIRE.pdf',
    keep: ['Le cycle cellulaire comprend la mitose'], noKinds: ['evaluation', 'recommandation', 'commentaire'], minNotes: 9000 },
  { id: 'web-cyto', name: 'Cours de cytogénétique : divisions cellulaires (Université de Constantine)', url: 'https://fac.umc.edu.dz/vet/Cours_Ligne/cours_22_23/Cytogenetique_A1/Chap_4.pdf',
    noKinds: ['evaluation', 'recommandation', 'commentaire'], minNotes: 15000 },
  { id: 'web-snes', name: 'Recommandations institutionnelles sur l’évaluation (texte sur le sujet, pas sur un élève)', url: 'https://www.dijon.snes.edu/spip/IMG/pdf/2._recommandations_mise_en_oeuvre_evaluations.pdf',
    noKinds: ['evaluation', 'recommandation', 'commentaire'], minNotes: 20000 },
  { id: 'web-feedback-en', name: 'Guide anglais sur le feedback (s’adresse à « you » sans juger personne)', url: 'https://sites.reading.ac.uk/wp-content/uploads/sites/38/2019/01/2._deft_feedback_guide.pdf',
    noKinds: ['evaluation', 'recommandation', 'commentaire'], minNotes: 12000 },
  { id: 'web-fiche-stage', name: 'Fiche d’évaluation de stage (Sorbonne Université)', url: 'https://lettres.sorbonne-universite.fr/sites/default/files/media/2020-01/10_fiche-d-evaluation-de-stage_0.pdf',
    minAside: { annexe: 10 } },
  { id: 'web-mit-illisible', name: 'Cours MIT au texte mal encodé (police sans table Unicode)', url: 'https://ocw.mit.edu/courses/6-829-computer-networks-fall-2002/35485a0ecba2d9038ceb9467c0517054_L1PacketSwitch.pdf',
    unreadable: true },
];

function download(url, file) {
  return new Promise((resolve) => {
    if (fs.existsSync(file) && fs.statSync(file).size > 1000) return resolve(true);
    const go = (u, n) => https.get(u, { headers: { 'User-Agent': 'Mozilla/5.0 (Arbor tests)' }, timeout: 45000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && n < 4) { res.resume(); return go(new URL(res.headers.location, u).href, n + 1); }
      if (res.statusCode !== 200) { res.resume(); return resolve(false); }
      const chunks = []; res.on('data', (c) => chunks.push(c)); res.on('end', () => { const b = Buffer.concat(chunks); if (b.slice(0, 5).toString() !== '%PDF-') return resolve(false); fs.writeFileSync(file, b); resolve(true); });
    }).on('error', () => resolve(false)).on('timeout', function () { this.destroy(); resolve(false); });
    go(url, 0);
  });
}

(async () => {
  await new Promise((r) => server.listen(0, r));
  const URL0 = `http://localhost:${server.address().port}/index.html`;
  const browser = await chromium.launch();
  const errors = [];
  const page = await browser.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(URL0); await page.waitForTimeout(1200);
  await page.evaluate(() => { const i = document.createElement('input'); i.type = 'file'; i.id = '__f'; document.body.appendChild(i); });

  // Analyse d'un PDF + tout ce qui en découle : cours, points clés, leçon, passages de Pousse, texte des pages
  async function analyze(file) {
    await page.setInputFiles('#__f', file);
    return page.evaluate(async () => {
      const f = document.getElementById('__f').files[0];
      let res;
      try { res = await PdfImport.analyze(f); } catch (e) { return { error: e.message }; }
      const pdf = await pdfjsLib.getDocument({ data: await f.arrayBuffer() }).promise;
      const pages = [];
      for (let i = 1; i <= Math.min(pdf.numPages, 60); i++) { const tc = await (await pdf.getPage(i)).getTextContent(); pages.push(tc.items.map((x) => x.str).join(' ')); }
      const norm = (n) => ({ id: Math.random().toString(36).slice(2), title: n.title, notes: n.notes || '', keyPoints: n.keyPoints || [], exercises: n.exercises || [], src: n.src, context: n.context || [], children: (n.children || []).map(norm), srs: null });
      const root = norm(res.tree);
      const all = []; (function w(n) { all.push(n); n.children.forEach(w); })(root);
      const learn = [];
      all.forEach((n) => { learn.push(n.notes, ...n.keyPoints); });
      const lesson = Lesson.build(root); lesson.steps.forEach((s) => learn.push(JSON.stringify(s)));
      all.forEach((n) => Dialogue.passagesOf(n).forEach((p) => learn.push(p.text)));
      const leaves = all.filter((n) => n !== root && !n.children.length && !n.exercises.length); // les questions d'un QCM ne sont pas des sujets
      const plain = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
      const onPage = leaves.filter((n) => n.src && n.src.pages.some((p) => plain(pages[p - 1] || '').includes(plain(n.title.replace(/^[\d.\s]+/, '')).slice(0, 40))));
      const context = all.flatMap((n) => n.context);
      return {
        learnText: learn.join('\n'), notes: all.reduce((a, n) => a + n.notes.length, 0),
        contextText: context.map((c) => `${c.title || ''} ${c.text}`).join('\n'), contextPagesOk: context.every((c) => c.pages.length && c.pages.every((p) => p >= 1 && p <= pdf.numPages)),
        setAside: res.setAside, topicsOnly: res.topicsOnly, form: res.form, personal: res.profile.personal,
        titles: all.map((n) => n.title), leaves: leaves.length, leavesWithPage: leaves.filter((n) => n.src && n.src.pages.length).length, leavesOnPage: onPage.length,
      };
    });
  }
  const flat = (s) => String(s).replace(/[’`]/g, "'").replace(/\s+/g, ' ');
  const has = (hay, needle) => flat(hay).includes(flat(needle));

  /* ---------- A ---------- */
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'arbor-mixed-'));
  const maker = await browser.newPage();
  for (const d of GEN) {
    await maker.setContent(d.html); const file = path.join(tmp, `${d.id}.pdf`); await maker.pdf({ path: file, format: 'A4' });
    const r = await analyze(file);
    const t = `[${d.name}]`;
    if (r.error) { check(`${t} analyse`, false, r.error); continue; }
    const leaked = d.aside.filter((x) => has(r.learnText, x));
    check(`${t} rien d’évaluatif, de conseil ou d’annexe dans le cours, les points clés, la leçon ni les passages de Pousse`, !leaked.length, leaked.join(' | '));
    const kept = d.keep.filter((x) => !has(r.learnText, x));
    check(`${t} le vrai contenu est gardé`, !kept.length, kept.join(' | '));
    if (d.aside.length) check(`${t} ce qui est écarté reste consultable, avec ses pages`, d.aside.every((x) => has(r.contextText, x)) && r.contextPagesOk, d.aside.filter((x) => !has(r.contextText, x)).join(' | '));
    check(`${t} types mis de côté attendus : ${d.kinds.join(', ') || 'aucun'}`, d.kinds.every((k) => r.setAside[k]) && (d.kinds.length || !Object.keys(r.setAside).length), JSON.stringify(Object.keys(r.setAside)));
    if (d.topics) check(`${t} les sujets listés sont gardés comme notions, avec leur page vérifiée`, d.topics.every((x) => r.titles.some((y) => has(y, x))) && r.leavesOnPage >= r.leaves * 0.9, `${r.leavesOnPage}/${r.leaves}`);
    if ('topicsOnly' in d) check(`${t} signalé comme « sujets sans explication »`, r.topicsOnly === d.topicsOnly);
    if (d.form) check(`${t} reconnu comme formulaire à remplir`, r.form === true);
  }

  /* ---------- B ---------- */
  const cache = path.join(os.tmpdir(), 'arbor-web-corpus'); fs.mkdirSync(cache, { recursive: true });
  for (const d of WEB) {
    const file = path.join(cache, `${d.id}.pdf`);
    const t = `[web : ${d.name}]`;
    if (!(await download(d.url, file))) { skip(t, 'téléchargement impossible depuis cet environnement'); continue; }
    const r = await analyze(file);
    if (d.unreadable) { check(`${t} texte illisible détecté et signalé au lieu d’être importé`, !!r.error && /illisible/.test(r.error), r.error || 'importé sans alerte'); continue; }
    if (r.error) { check(`${t} analyse`, false, r.error); continue; }
    if (d.noKinds) check(`${t} aucun passage pris à tort pour une évaluation, un conseil ou un commentaire`, d.noKinds.every((k) => !r.setAside[k]), JSON.stringify(r.setAside));
    if (d.keep) check(`${t} le contenu du cours est gardé`, d.keep.every((x) => has(r.learnText, x)));
    if (d.minNotes) check(`${t} le cours garde l’essentiel de son texte (≥ ${d.minNotes} caractères)`, r.notes >= d.minNotes, String(r.notes));
    if (d.expectAsideText) check(`${t} présentation et mode d’emploi mis de côté`, d.expectAsideText.every((x) => has(r.contextText, x) && !has(r.learnText, x)));
    if (d.minAside) check(`${t} champs et grilles du formulaire mis de côté`, Object.entries(d.minAside).every(([k, n]) => r.setAside[k] && r.setAside[k].count >= n), JSON.stringify(r.setAside));
  }

  /* ---------- C. Documents personnels (locaux seulement) ---------- */
  const priv = process.env.ARBOR_PRIVATE_DIR;
  if (!priv) skip('[documents personnels]', 'ARBOR_PRIVATE_DIR non défini');
  else {
    const bilan = fs.readdirSync(priv).find((f) => /tssr|bilan/i.test(f) && f.endsWith('.pdf'));
    if (bilan) {
      const r = await analyze(path.join(priv, bilan));
      const commentary = ['Je vais être totalement franc', 'Je ne te considère pas comme un technicien', 'Tu as vu beaucoup de vocabulaire', 'C’est une priorité absolue pour commencer ton laboratoire', 'Ne cherche pas encore à te spécialiser', 'Tu sais utiliser Windows comme utilisateur', 'non acquis', 'Je préfère que tu saches'];
      const leaked = commentary.filter((x) => has(r.learnText, x));
      check('[bilan TSSR] aucune phrase de jugement ou de conseil dans le cours, la leçon, les points clés et Pousse', !leaked.length, leaked.join(' | '));
      check('[bilan TSSR] ces passages restent consultables avec leurs pages', commentary.slice(0, 6).every((x) => has(r.contextText, x)) && r.contextPagesOk);
      check('[bilan TSSR] les 42 sujets techniques (8 domaines) sont gardés, chacun avec sa page vérifiée', ['Adresse IP et masque de sous-réseau', 'Schéma AGDLP', 'Samba et son fichier smb.conf', 'Man-in-the-middle', 'Centreon'].every((x) => r.titles.includes(x)) && r.leaves === 42 && r.leavesWithPage === 42 && r.leavesOnPage >= 41, `${r.leavesOnPage}/${r.leaves} retrouvés à leur page`);
      check('[bilan TSSR] signalé comme « sujets sans explication » (le cours peut être rédigé)', r.topicsOnly === true);
    } else skip('[bilan TSSR]', 'fichier absent');
    const cours = fs.readdirSync(priv).find((f) => /tcp/i.test(f) && f.endsWith('.pdf'));
    if (cours) {
      const r = await analyze(path.join(priv, cours));
      check('[cours TCP/IP] rien de pédagogique n’est écarté (aucune évaluation, aucun conseil, aucun commentaire)', ['evaluation', 'recommandation', 'commentaire'].every((k) => !r.setAside[k]), JSON.stringify(r.setAside));
      check('[cours TCP/IP] le texte du cours est conservé (≥ 70 000 caractères)', r.notes >= 70000, String(r.notes));
    } else skip('[cours TCP/IP]', 'fichier absent');
  }

  check('Z aucune erreur JavaScript', errors.length === 0, errors.join(' | '));
  await browser.close(); server.close();
  console.log(failed ? `\n${failed} test(s) en échec${skipped ? `, ${skipped} non vérifié(s)` : ''}` : `\nTous les tests passent${skipped ? ` (${skipped} non vérifié(s))` : ''}`);
  process.exit(failed ? 1 : 0);
})();
