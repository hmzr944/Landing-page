// Types du domaine Configuration, alignés sur db/migrations/001 et 002.
import type { SupabaseClient } from "@supabase/supabase-js";

export type Role = "admin" | "sav_manager" | "agent" | "logistics_manager" | "viewer";
export type Level5 = "unknown" | "none" | "low" | "medium" | "high" | "critical";
export type SiteKind = "warehouse" | "store" | "workshop" | "partner";
export type PolicyKind = "incident_types" | "criticality" | "resolution" | "authorization" | "refund" | "replacement" | "sla" | "escalation" | "tone";
export type PolicyStatus = "draft" | "active" | "retired";
export type Env = "demo" | "production";

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Administrateur", sav_manager: "Responsable SAV", agent: "Collaborateur",
  logistics_manager: "Responsable logistique", viewer: "Observateur",
};
export const LEVEL_LABEL: Record<Level5, string> = {
  unknown: "Inconnue", none: "Aucune", low: "Faible", medium: "Moyenne", high: "Élevée", critical: "Critique",
};
export const SITE_LABEL: Record<SiteKind, string> = {
  warehouse: "Entrepôt", store: "Boutique", workshop: "Atelier", partner: "Partenaire",
};
export const POLICY_LABEL: Record<PolicyKind, string> = {
  incident_types: "Types d'incidents", criticality: "Criticité", resolution: "Solutions autorisées",
  authorization: "Délégation financière", refund: "Remboursement", replacement: "Remplacement",
  sla: "Engagements de service", escalation: "Escalade", tone: "Ton éditorial",
};

export interface CompanyRef { id: string; name: string; environment: Env; role: Role }
export interface Workspace { id: string; company_id: string; name: string }
export interface LegalEntity { id: string; company_id: string; name: string; registration_number: string | null; country: string | null }
export interface Brand { id: string; company_id: string; workspace_id: string; legal_entity_id: string | null; name: string }
export interface Site {
  id: string; company_id: string; workspace_id: string; brand_id: string | null; name: string; kind: SiteKind;
  ships_orders: boolean; city: string | null; timezone: string; opening_hours: { description?: string } | null;
  prep_capacity_per_day: number | null; can_transfer: boolean | null; courier_available: boolean | null;
}
export interface Product {
  id: string; company_id: string; workspace_id: string; brand_id: string | null; sku: string; name: string; category: string | null;
  thermal_sensitivity: Level5; fragility: Level5; storage_conditions: string | null;
  storage_temp_min_c: number | null; storage_temp_max_c: number | null; shelf_life_hours: number | null;
  transport_restrictions: string[]; unit_cost: number | null; list_price: number | null;
}
export interface Carrier { id: string; company_id: string; name: string }
export interface DeliveryMethod { id: string; company_id: string; carrier_id: string; name: string; temperature_controlled: boolean | null; max_transit_hours: number | null }
export interface StockLevel { company_id: string; site_id: string; product_id: string; quantity: number; as_of: string; source: "manual" | "csv" | "integration" }
export interface PolicySet { id: string; company_id: string; workspace_id: string; kind: PolicyKind; name: string }
export interface PolicyVersion {
  id: string; company_id: string; policy_set_id: string; version: number; body: Record<string, unknown>;
  status: PolicyStatus; created_at: string; activated_at: string | null;
}
export interface Member { user_id: string; email: string; role: Role; status: "active" | "suspended"; created_at: string }
export interface AuditEntry { id: number; actor: string | null; action: string; entity: string; entity_id: string | null; detail: Record<string, unknown>; at: string }

export type Table = "workspaces" | "legal_entities" | "brands" | "sites" | "products" | "carriers" | "delivery_methods" | "stock_levels" | "policy_sets";

/** Session transmise par shell.js (JavaScript) au module TypeScript. */
export interface PulsSession {
  mode: "demo" | "account";
  user: string;
  role: string;
  roleKey: Role | null;
  userId?: string;
  companyId?: string | null;
  companyName?: string;
  environment?: Env;
  workspace?: string;
}

/** Contexte passé par puls.js à chaque montage de la vue. */
export interface MountContext {
  session: PulsSession;
  rules: Record<string, unknown>;
  data: { PRODUCTS: Record<string, DemoProduct>; STOCK: Record<string, Record<string, number | string>>; CARRIERS: { name: string }[] };
  client: SupabaseClient | null;
}
export interface DemoProduct { name: string; cat: string; sens: string; level: Level5; price: number }

export interface ConfigViewModule { mount(el: HTMLElement, ctx: MountContext): void }

/** Espace de noms partagé entre les scripts JavaScript existants et les modules TypeScript. */
export interface PulsGlobal {
  client?: SupabaseClient | null;
  session?: PulsSession;
  configView?: ConfigViewModule;
  reload?: () => void;
}

declare global {
  interface Window { PULS: PulsGlobal }
}
