// --- Pagination ---
export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
}
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}
export interface SingleResponse<T> {
  data: T;
}

// --- Error ---
export interface CommishApiError {
  error: {
    code: string;
    message: string;
  };
}

// --- Users (backed by `profiles` table) ---
export interface User {
  id: string;
  name: string;
  email: string;
  role: string | null;
  title: string | null;
  start_date: string | null;
  is_active: boolean;
  manager_id: string | null;
  created_at: string;
  updated_at: string;
}
export interface CreateUserRequest {
  name: string;
  email: string;
  role?: string;
  title?: string;
  start_date?: string;
  is_active?: boolean;
  manager_id?: string;
}
export interface UpdateUserRequest {
  name?: string;
  email?: string;
  role?: string;
  title?: string;
  start_date?: string;
  is_active?: boolean;
  manager_id?: string;
}

// --- Comp Plans ---
export interface CompPlan {
  id: string;
  organization_id: string;
  name: string;
  /** Free-form plan type string, e.g. 'ae', 'sdr', 'manager'. Default: 'ae'. */
  plan_type: string;
  user_id: string | null;
  fiscal_year_id: string | null;
  /** Total base salary in dollars. */
  base_salary: number | null;
  /** Total variable compensation target in dollars. */
  variable_compensation: number | null;
  /** ARR commission rate as a decimal (e.g. 0.10 = 10%). */
  arr_variable_percentage: number | null;
  /** WNC commission rate as a decimal. */
  wnc_variable_percentage: number | null;
  /** Annual ARR quota in dollars. */
  arr_quota_annual: number | null;
  /** Annual WNC quota (units/points). */
  wnc_quota_annual: number | null;
  /** ARR accelerator multiplier applied at the quarterly milestone (e.g. 1.5 = 1.5×). */
  arr_quarterly_accelerator: number | null;
  /** ARR accelerator multiplier applied at 100% annual attainment (e.g. 2.0 = 2×). */
  arr_annual_accelerator: number | null;
  /** WNC accelerator multiplier applied at 100% annual attainment. */
  wnc_annual_accelerator: number | null;
  status: "draft" | "active" | "archived";
  user?: { id: string; name: string; email: string; role: string } | null;
  fiscal_year?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}
export interface CreateCompPlanRequest {
  name: string;
  plan_type?: string;
  user_id?: string;
  fiscal_year_id?: string;
  base_salary?: number;
  variable_compensation?: number;
  arr_variable_percentage?: number;
  wnc_variable_percentage?: number;
  arr_quota_annual?: number;
  wnc_quota_annual?: number;
  arr_quarterly_accelerator?: number;
  arr_annual_accelerator?: number;
  wnc_annual_accelerator?: number;
  status?: "draft" | "active" | "archived";
}
export interface UpdateCompPlanRequest {
  name?: string;
  plan_type?: string;
  user_id?: string;
  fiscal_year_id?: string;
  base_salary?: number;
  variable_compensation?: number;
  arr_variable_percentage?: number;
  wnc_variable_percentage?: number;
  arr_quota_annual?: number;
  wnc_quota_annual?: number;
  arr_quarterly_accelerator?: number;
  arr_annual_accelerator?: number;
  wnc_annual_accelerator?: number;
  status?: "draft" | "active" | "archived";
}
export interface AssignCompPlanRequest {
  user_ids: string[];
  effective_date: string;
}
export interface CloneCompPlanRequest {
  name: string;
}

// --- Deals ---
export interface Deal {
  id: string;
  organization_id: string;
  user_id: string;
  comp_plan_id: string;
  opportunity_name: string;
  customer_name: string | null;
  close_date: string;
  /** Contract term in months. Default: 12. */
  contract_term: number;
  arr_amount: number;
  machine_quantity: number;
  wnc_weight: number;
  wnc_points: number;
  arr_commission: number;
  wnc_commission: number;
  total_commission: number;
  deal_type: "new_business" | "renewal" | "expansion";
  primary_metric_value: number;
  secondary_metric_value: number;
  notes: string | null;
  status: "draft" | "pending" | "approved" | "rejected";
  is_sandbox: boolean;
  custom_fields: Record<string, unknown> | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}
export interface CreateDealRequest {
  comp_plan_id: string;
  opportunity_name: string;
  customer_name?: string;
  close_date: string;
  contract_term?: number;
  arr_amount?: number;
  notes?: string;
  deal_type?: "new_business" | "renewal" | "expansion";
  primary_metric_value?: number;
  secondary_metric_value?: number;
  custom_fields?: Record<string, unknown>;
}
export interface UpdateDealRequest {
  opportunity_name?: string;
  customer_name?: string;
  close_date?: string;
  contract_term?: number;
  arr_amount?: number;
  notes?: string;
  deal_type?: "new_business" | "renewal" | "expansion";
  primary_metric_value?: number;
  secondary_metric_value?: number;
  custom_fields?: Record<string, unknown>;
}

// --- Commissions ---
/** Commission records are derived from approved deals. */
export interface Commission {
  id: string;
  user_id: string;
  comp_plan_id: string;
  opportunity_name: string;
  close_date: string;
  total_commission: number;
  arr_commission: number;
  wnc_commission: number;
  primary_commission?: number;
  secondary_commission?: number;
  status: string;
}
export interface CommissionSummary {
  total_paid: number;
  total_pending: number;
  approved_deal_count: number;
  pending_deal_count: number;
  /** Keyed by YYYY-MM month string, value is total commission for that month. */
  by_month: Record<string, number>;
}
export interface SimulateCommissionRequest {
  user_id: string;
  comp_plan_id?: string;
  deals: Array<{
    arr_amount: number;
    deal_type?: "new_business" | "renewal" | "expansion";
  }>;
  include_existing?: boolean;
}
export interface SimulateCommissionResponse {
  rep_name: string;
  comp_plan: string;
  current_attainment: {
    quota: number;
    actual: number;
    percent: number;
  };
  simulated_attainment: {
    actual: number;
    percent: number;
  };
  commission_breakdown: Array<{
    deal_description: string;
    base_commission: number;
    accelerator_applied: string;
    final_commission: number;
  }>;
  total_additional_commission: number;
  total_commission_with_existing: number;
}

// --- SPIFFs ---
export interface Spiff {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  bonus_type: "per_deal" | "flat" | "tiered" | "team_pool";
  bonus_amount: number;
  /** JSON object storing qualifying criteria (deal_type, min_arr, min_deal_count, etc.). */
  criteria: Record<string, unknown> | null;
  /** JSON object storing payout caps (per_rep, total_budget, etc.). */
  caps: Record<string, unknown> | null;
  /** JSON object storing eligibility rules (all_reps, rep_ids, etc.). */
  eligibility: Record<string, unknown> | null;
  start_date: string;
  end_date: string;
  status: "draft" | "active" | "paused" | "completed";
  leaderboard?: Array<{
    rep_id: string;
    amount: number;
    status: string;
    rep?: { id: string; name: string; email: string };
  }>;
  created_at: string;
  updated_at: string;
}
export interface CreateSpiffRequest {
  name: string;
  description?: string;
  bonus_type: "per_deal" | "flat" | "tiered" | "team_pool";
  bonus_amount: number;
  criteria?: Record<string, unknown>;
  caps?: Record<string, unknown>;
  eligibility?: Record<string, unknown>;
  start_date: string;
  end_date: string;
  status?: "draft" | "active";
}
export interface UpdateSpiffRequest {
  name?: string;
  description?: string;
  bonus_type?: "per_deal" | "flat" | "tiered" | "team_pool";
  bonus_amount?: number;
  criteria?: Record<string, unknown>;
  caps?: Record<string, unknown>;
  eligibility?: Record<string, unknown>;
  start_date?: string;
  end_date?: string;
  status?: "draft" | "active" | "paused";
}

// --- Webhooks (backed by `webhook_subscriptions` table) ---
export interface Webhook {
  id: string;
  url: string;
  events: WebhookEvent[];
  /** Whether the webhook is currently active. */
  is_active: boolean;
  created_at: string;
  /** Only returned on creation — the HMAC signing secret for verifying payloads. */
  secret?: string;
}
export type WebhookEvent =
  | "deal.created"
  | "deal.approved"
  | "deal.rejected"
  | "commission.calculated"
  | "spiff.completed";
export interface CreateWebhookRequest {
  url: string;
  events: WebhookEvent[];
}
