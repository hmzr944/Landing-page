/* Génère les documents d'EXEMPLE FICTIF du pilote (magasin de vélos), en PDF, dans docs/demo/.
   Ils servent à la démonstration et aux essais ; ils sont marqués comme fictifs sur chaque page.
   Lancer depuis la racine du dépôt :  node tools/make-demo-docs.js   (Playwright requis). */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const OUT = path.resolve(__dirname, '..', 'docs', 'demo');
const page = (title, body) => `<html><head><meta charset="utf-8"><style>
  body{font-family:Arial,Helvetica,sans-serif;font-size:12.5px;line-height:1.5;margin:36px 44px;color:#13221d}
  .fictif{border:2px solid #b8572c;color:#b8572c;font-weight:700;padding:6px 10px;border-radius:6px;margin-bottom:18px;font-size:11.5px}
  h1{font-size:22px;margin:0 0 6px} h2{font-size:15px;margin:20px 0 6px} table{border-collapse:collapse;width:100%} td,th{border:1px solid #ccd;padding:5px 8px;text-align:left}
  .pb{page-break-before:always}
</style></head><body><div class="fictif">EXEMPLE FICTIF : document de démonstration Arbor, sans valeur réelle, avec une marque, des produits et des règles inventés.</div><h1>${title}</h1>${body}</body></html>`;

const DOCS = {
  'fiche-produit-alto-500-EXEMPLE-FICTIF.pdf': page('Fiche produit : vélo électrique Alto 500', `
<h2>Caractéristiques</h2>
<p>Le vélo électrique Alto 500 dispose d’une batterie de 500 Wh. Son autonomie annoncée est de 90 km en mode éco et de 55 km en mode sport. Le cadre en aluminium pèse 21 kg, batterie comprise.</p>
<p>La recharge complète de la batterie dure 5 heures avec le chargeur fourni. Le moteur, placé dans le moyeu arrière, assiste jusqu’à 25 km/h, conformément à la réglementation.</p>
<h2>Pour qui ?</h2>
<p>L’Alto 500 convient aux trajets quotidiens de 15 à 40 km. Pour des trajets plus longs, l’Alto 700, équipé d’une batterie de 700 Wh, offre une autonomie annoncée de 130 km en mode éco.</p>
<p>Le vélo existe en deux tailles de cadre : M pour les personnes de 1,55 m à 1,75 m, L pour les personnes de 1,75 m à 1,95 m.</p>
<h2>Prix et services</h2>
<p>Le prix public de l’Alto 500 est de 1 490 euros. La première révision, à 500 km, est offerte. L’antivol en U recommandé coûte 49 euros.</p>
<h2 class="pb">Sécurité</h2>
<p>Ne jamais recharger une batterie endommagée ou gonflée : l’isoler dans le bac métallique prévu et prévenir le responsable de magasin. Ne pas laisser un client tester un vélo sans casque.</p>
<p>La batterie se stocke entre 10 et 25 °C, chargée entre 40 et 60 % en cas de non-utilisation prolongée.</p>`),
  'procedure-retours-EXEMPLE-FICTIF.pdf': page('Procédure : retours, échanges et remboursements', `
<h2>Délais</h2>
<p>Le client dispose de 30 jours après l’achat pour un retour, sur présentation du ticket de caisse. Un vélo électrique retourné doit avoir parcouru moins de 50 km.</p>
<h2>Étapes d’un retour</h2>
<p>1. Vérifier le ticket de caisse et la date d’achat. 2. Contrôler l’état du produit avec le client. 3. Proposer d’abord un échange ou un avoir. 4. Si le client refuse, enregistrer le remboursement dans la caisse avec le motif.</p>
<h2>Remboursement</h2>
<p>Le remboursement se fait sur le moyen de paiement d’origine, jamais en espèces au-delà de 150 euros. Tout remboursement supérieur à 500 euros doit être validé par le responsable de magasin.</p>
<h2>Données du client</h2>
<p>Ne jamais photographier ni copier la pièce d’identité d’un client. Seuls le nom et le numéro de ticket sont saisis dans la caisse.</p>
<h2>Réclamation difficile</h2>
<p>Si le client conteste la décision, rester calme, reformuler sa demande, puis appeler le responsable. Ne jamais promettre un remboursement que la procédure ne permet pas.</p>`),
};

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const p = await browser.newPage();
  for (const [name, html] of Object.entries(DOCS)) {
    await p.setContent(html);
    await p.pdf({ path: path.join(OUT, name), format: 'A4' });
    console.log('créé :', path.join('docs', 'demo', name));
  }
  await browser.close();
})();
