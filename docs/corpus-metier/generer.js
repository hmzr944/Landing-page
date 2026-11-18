/* Régénère le corpus métier n° 1 à partir de contenu.js : pages HTML (sources/), PDF et manifeste corpus.json.
   Lancer depuis la racine du dépôt :  node docs/corpus-metier/generer.js   (Playwright requis, voir README).
   Les PDF sont imprimés par Chromium ; leur date de création change à chaque génération, pas leur texte.
   Deux séries : *.pdf sans ligatures typographiques, et ligatures/*.pdf avec (« fi », « ff », « fl » liés, comme beaucoup
   de PDF issus d'un traitement de texte). La seconde sert de test de non-régression du lecteur (défaut du 2026-11-16). */
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const { DOCS, SOURCES, BANDEAU } = require('./contenu.js');

const DIR = __dirname;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const txt = (x) => (typeof x === 'string' ? x : x.t);
const SECTEUR = { retail: 'Commerce de détail', hcr: 'Hôtellerie-restauration' };

function html(d, ligatures = false) {
  const block = (s) => {
    const items = s.ol || s.ul || s.p;
    const tag = s.ol ? 'ol' : s.ul ? 'ul' : null;
    const body = tag ? `<${tag}>${items.map((x) => `<li>${esc(txt(x))}</li>`).join('')}</${tag}>` : items.map((x) => `<p>${esc(txt(x))}</p>`).join('');
    return `<h2>${esc(s.h)}</h2>${body}`;
  };
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${esc(d.titre)} (v${d.version})</title>
<style>
  body { font: 11pt/1.5 "DejaVu Sans", Arial, sans-serif; color: #1d1d1b; margin: 0; font-variant-ligatures: ${ligatures ? 'common-ligatures' : 'none'}; }
  .fictif { border: 1.5pt solid #b3261e; color: #b3261e; padding: 6pt 10pt; font-weight: bold; margin-bottom: 14pt; }
  .entete { font-size: 9.5pt; color: #555; margin-bottom: 4pt; }
  h1 { font-size: 18pt; margin: 2pt 0 12pt; }
  h2 { font-size: 12.5pt; margin: 16pt 0 6pt; border-bottom: 0.75pt solid #ccc; padding-bottom: 2pt; }
  li { margin: 3pt 0; }
</style></head><body>
<div class="fictif">${esc(BANDEAU)}</div>
<div class="entete">${esc(d.org)} · ${esc(SECTEUR[d.secteur])}</div>
<div class="entete">Procédure ${esc(d.procedure)} · version ${d.version} du ${esc(d.date)}</div>
<h1>${esc(d.titre)}</h1>
${d.sections.map(block).join('\n')}
</body></html>`;
}

function manifest() {
  const regles = (d) => d.sections.flatMap((s) => (s.ol || s.ul || s.p).filter((x) => x && x.r).map((x) => ({
    id: x.r.id, texte: x.t, base: x.r.base, sensible: !!x.r.sensible,
    ...(x.r.source ? { source: SOURCES[x.r.source] } : {}),
  })));
  return {
    nom: 'Corpus métier n° 1',
    avertissement: 'Tous les documents sont fabriqués (jeu de test). Les organisations sont fictives. Seules les règles de base « reglementaire » reprennent un texte public, vérifié à la source indiquée ; les règles « interne » sont inventées pour l’exercice.',
    genere_par: 'docs/corpus-metier/generer.js',
    documents: DOCS.map((d) => ({
      id: d.id, fichier: `${d.id}.pdf`, source_html: `sources/${d.id}.html`, procedure: d.procedure, version: d.version, date: d.date,
      secteur: d.secteur, organisation: d.org, titre: d.titre, nature: 'synthetique', regles_attendues: regles(d),
      ...(d.changements ? { remplace: `${d.procedure}-v${d.version - 1}`, changements: d.changements, non_changements: d.non_changements || [] } : {}),
    })),
  };
}

(async () => {
  fs.mkdirSync(path.join(DIR, 'sources'), { recursive: true });
  fs.mkdirSync(path.join(DIR, 'ligatures'), { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const d of DOCS) {
    const h = html(d);
    fs.writeFileSync(path.join(DIR, 'sources', `${d.id}.html`), h);
    await page.setContent(h);
    await page.pdf({ path: path.join(DIR, `${d.id}.pdf`), format: 'A4', margin: { top: '18mm', bottom: '18mm', left: '18mm', right: '18mm' } });
    console.log('écrit', `${d.id}.pdf`);
    await page.setContent(html(d, true));
    await page.pdf({ path: path.join(DIR, 'ligatures', `${d.id}.pdf`), format: 'A4', margin: { top: '18mm', bottom: '18mm', left: '18mm', right: '18mm' } });
  }
  await browser.close();
  fs.writeFileSync(path.join(DIR, 'corpus.json'), JSON.stringify(manifest(), null, 2) + '\n');
  console.log('écrit corpus.json');
})().catch((e) => { console.error(e); process.exit(1); });
