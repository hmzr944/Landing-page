// Validation des politiques avant enregistrement. Fonction pure : testée sans navigateur.
import type { PolicyKind, Role } from "./types.js";

const ROLES: Role[] = ["admin", "sav_manager", "agent", "logistics_manager", "viewer"];
type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** Retourne la liste des problèmes (vide si la politique est valide). */
export function validatePolicy(kind: PolicyKind | string, body: unknown): string[] {
  const errs: string[] = [];
  if (!isObj(body)) return ["La politique doit être un objet JSON."];
  switch (kind) {
    case "authorization": {
      const lim = body.limits;
      if (!isObj(lim)) { errs.push("« limits » doit associer chaque rôle à un plafond en euros."); break; }
      for (const r of ROLES) {
        const v = lim[r];
        if (v === undefined) errs.push(`Plafond manquant pour le rôle « ${r} ».`);
        else if (!isNum(v) || v < 0) errs.push(`Le plafond du rôle « ${r} » doit être un nombre positif ou nul.`);
      }
      for (const k of Object.keys(lim)) if (!ROLES.includes(k as Role)) errs.push(`Rôle inconnu : « ${k} ».`);
      if (isNum(lim.viewer) && lim.viewer > 0) errs.push("Un observateur ne peut pas disposer d'une délégation financière.");
      break;
    }
    case "resolution": {
      const c = body.courier;
      if (c !== undefined) {
        if (!isObj(c)) errs.push("« courier » doit être un objet.");
        else {
          if (!Array.isArray(c.zones) || !c.zones.every((z) => typeof z === "string" && z.trim())) errs.push("« courier.zones » doit être une liste de villes.");
          if (!isNum(c.order_before_hour) || c.order_before_hour < 0 || c.order_before_hour > 23) errs.push("« courier.order_before_hour » doit être une heure entre 0 et 23.");
          if (typeof c.delivered_before !== "string") errs.push("« courier.delivered_before » doit être un texte (par exemple « 16 h 30 »).");
        }
      }
      const g = body.goodwill;
      if (g !== undefined) {
        if (!isObj(g)) errs.push("« goodwill » doit être un objet.");
        else for (const [k, v] of Object.entries(g)) if (!isNum(v) || v < 0 || v > 1) errs.push(`Le taux « goodwill.${k} » doit être compris entre 0 et 1.`);
      }
      break;
    }
    case "criticality": {
      const m = body.max;
      const axes = ["product", "occasion", "incident", "relationship", "emotion"];
      if (!isObj(m)) errs.push("« max » doit donner le maximum de chaque facteur.");
      else for (const a of axes) if (!isNum(m[a]) || (m[a] as number) < 0) errs.push(`« max.${a} » doit être un nombre positif.`);
      for (const k of ["sensitivity_points", "relationship_points", "emotion_points"]) {
        const t = body[k];
        if (!isObj(t)) errs.push(`« ${k} » doit être un objet.`);
        else for (const [kk, v] of Object.entries(t)) if (!isNum(v) || v < 0) errs.push(`« ${k}.${kk} » doit être un nombre positif.`);
      }
      if (!isNum(body.priority_threshold)) errs.push("« priority_threshold » doit être un nombre.");
      if (isObj(m) && isObj(body.sensitivity_points)) {
        for (const [k, v] of Object.entries(body.sensitivity_points)) if (isNum(v) && isNum(m.product) && v > m.product) errs.push(`« sensitivity_points.${k} » dépasse le maximum du facteur produit.`);
      }
      break;
    }
    case "tone": {
      if (body.signature !== undefined && typeof body.signature !== "string") errs.push("« signature » doit être un texte.");
      if (body.default_tone !== undefined && !["warm", "sober"].includes(String(body.default_tone))) errs.push("« default_tone » vaut « warm » ou « sober ».");
      break;
    }
    case "sla": {
      for (const k of ["first_response_hours", "resolution_hours"]) {
        if (body[k] !== undefined && (!isNum(body[k]) || (body[k] as number) <= 0)) errs.push(`« ${k} » doit être un nombre d'heures positif.`);
      }
      break;
    }
    default:
      break;
  }
  return errs;
}

/** Modèle de départ d'une nouvelle politique : volontairement vide là où l'entreprise doit décider. */
export function policyTemplate(kind: PolicyKind | string): Record<string, unknown> {
  switch (kind) {
    case "authorization": return { currency: "EUR", limits: { agent: 0, logistics_manager: 0, sav_manager: 0, admin: 0, viewer: 0 } };
    case "resolution": return { courier: { zones: [], order_before_hour: 15, delivered_before: "" }, goodwill: {} };
    case "criticality": return {
      max: { product: 30, occasion: 25, incident: 20, relationship: 15, emotion: 10 },
      sensitivity_points: { critical: 30, high: 26, medium: 16, low: 6, none: 0, unknown: 16 },
      relationship_points: {}, emotion_points: {}, priority_threshold: 70,
    };
    case "tone": return { signature: "", default_tone: "warm" };
    case "sla": return { first_response_hours: 0, resolution_hours: 0 };
    default: return {};
  }
}
