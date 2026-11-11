// Lecture du document stocké, côté serveur : le navigateur ne peut pas faire passer un texte qui n'est pas dans le PDF.
// - pdfPages : texte de chaque page (unpdf, version serverless de pdf.js, open source).
// - verifyPassages : un passage envoyé par le navigateur n'est gardé que si on le retrouve sur sa page (ou une voisine).
//   Comparaison par suites de 4 mots, sans accents ni ponctuation : tolère les différences de mise en page entre
//   l'extraction du navigateur et celle du serveur (coupures de ligne, espaces), pas un texte inventé.

const flat = (s: string) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

export function passageFound(text: string, pages: string[], page: number, threshold = 0.8): boolean {
  const near = [page - 2, page - 1, page].filter((i) => i >= 0 && i < pages.length).map((i) => pages[i]).join(" ");
  const hay = ` ${flat(near || pages.join(" "))} `;
  const w = flat(text).split(" ").filter(Boolean);
  if (!w.length) return false;
  if (w.length < 4) return hay.includes(` ${w.join(" ")} `);
  let hit = 0, total = 0;
  for (let i = 0; i + 4 <= w.length; i++) { total++; if (hay.includes(` ${w.slice(i, i + 4).join(" ")} `)) hit++; }
  return hit / total >= threshold;
}

export function verifyPassages<T extends { page: number; text: string }>(passages: T[], pages: string[]) {
  const kept: T[] = [], dropped: T[] = [];
  passages.forEach((p) => (passageFound(p.text, pages, p.page) ? kept : dropped).push(p));
  return { kept, dropped };
}

// Empreinte SHA-256 (hexadécimal) des octets du fichier stocké : calculée ici, jamais reprise du navigateur
export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const h = await crypto.subtle.digest("SHA-256", bytes as Uint8Array<ArrayBuffer>);
  return [...new Uint8Array(h)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
// Un fichier stocké relu par le serveur : son texte page par page et son empreinte
export type StoredDoc = { pages: string[]; sha256: string };
// L'empreinte déclarée à l'envoi (calculée par le navigateur) doit être celle du fichier réellement stocké.
// Sans empreinte déclarée (versions anciennes), l'empreinte du serveur devient la référence.
export const integrityOf = (declared: string | null | undefined, actual: string): "conforme" | "divergent" =>
  !declared || String(declared).trim().toLowerCase() === actual.toLowerCase() ? "conforme" : "divergent";

// Texte de chaque page d'un PDF (chargé à la demande : seules les tâches qui lisent un document en ont besoin)
export async function pdfPages(bytes: Uint8Array): Promise<string[]> {
  const { extractText, getDocumentProxy } = await import("npm:unpdf@0.12.1");
  const pdf = await getDocumentProxy(bytes);
  const { text } = await extractText(pdf, { mergePages: false });
  return (Array.isArray(text) ? text : [String(text)]).map((t) => String(t));
}
