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

// --- Deals ---
export interface Deal {
  id: string;
  opportunity_name: string;
  arr_amount: number;
  total_commission: number;
  status: "pending" | "approved" | "rejected";
  rep_id: string;
  rep_name?: string;
  close_date: string;
  notes?: string;
  deal_type?: "new_business" | "renewal" | "expansion";
  created_at: string;
  updated_at: string;
}
export interface CreateDealRequest {
  opportunity_name: string;
  arr_amount: number;
  rep_id?: string;
  close_date?: string;
  notes?: string;
  deal_type?: "new_business" | "renewal" | "expansion";
}
export interface UpdateDealRequest {
  opportunity_name?: string;
  arr_amount?: number;
  rep_id?: string;
  close_date?: string;
  notes?: string;
  deal_type?: "new_business" | "renewal" | "expansion";
}

// --- Comp Plans ---
export interface AcceleratorTier {
  threshold_percent: number;
  commission_rate: number;
}
export interface CompPlan {
  id: string;
  name: string;
  plan_type: "standard" | "executive" | "custom";
  effective_date: string;
  end_date: string | null;
  base_commission_rate: number;
  deal_types: {
    new_business: number;
    renewal: number;
    expansion: number;
  };
  quota: {
    period: "monthly" | "quarterly" | "annual";
    amount: number;
  } | null;
  accelerators: AcceleratorTier[];
  decelerators: AcceleratorTier[];
  caps: {
    per_deal_max: number | null;
    period_max: number | null;
  };
  assigned_users: string[];
  created_at: string;
  updated_at: string;
}
export interface CreateCompPlanRequest {
  name: string;
  plan_type?: "standard" | "executive" | "custom";
  effective_date: string;
  end_date?: string | null;
  base_commission_rate?: number;
  deal_types: {
    new_business: number;
    renewal: number;
    expansion: number;
  };
  quota?: {
    period: "monthly" | "quarterly" | "annual";
    amount: number;
  };
  accelerators?: AcceleratorTier[];
  decelerators?: AcceleratorTier[];
  caps?: {
    per_deal_max?: number | null;
    period_max?: number | null;
  };
}
export interface UpdateCompPlanRequest {
  name?: string;
  plan_type?: "standard" | "executive" | "custom";
  effective_date?: string;
  end_date?: string | null;
  base_commission_rate?: number;
  deal_types?: {
    new_business?: number;
    renewal?: number;
    expansion?: number;
  };
  quota?: {
    period?: "monthly" | "quarterly" | "annual";
    amount?: number;
  };
  accelerators?: AcceleratorTier[];
  decelerators?: AcceleratorTier[];
  caps?: {
    per_deal_max?: number | null;
    period_max?: number | null;
  };
}
export interface AssignCompPlanRequest {
  user_ids: string[];
  effective_date: string;
}
export interface CloneCompPlanRequest {
  name: string;
}

// --- Users ---
export interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: "ae" | "sdr" | "manager" | "admin";
  comp_plan_id: string | null;
  comp_plan_name?: string;
  status: "active" | "inactive";
  start_date: string;
  created_at: string;
  updated_at: string;
}
export interface CreateUserRequest {
  first_name: string;
  last_name: string;
  email: string;
  role?: "ae" | "sdr" | "manager" | "admin";
  comp_plan_id?: string;
  start_date?: string;
}
export interface UpdateUserRequest {
  first_name?: string;
  last_name?: string;
  email?: string;
  role?: "ae" | "sdr" | "manager" | "admin";
  comp_plan_id?: string;
  status?: "active" | "inactive";
}

// --- Commissions ---
export interface Commission {
  id: string;
  deal_id: string;
  deal_name: string;
  user_id: string;
  rep_name: string;
  arr_amount: number;
  commission_amount: number;
  commission_rate: number;
  accelerator_applied?: string;
  status: "calculated" | "paid" | "pending";
  period: string;
  created_at: string;
}
export interface CommissionSummary {
  total_commissions: number;
  total_paid: number;
  total_pending: number;
  total_deals: number;
  average_commission: number;
  by_rep: Array<{
    user_id: string;
    rep_name: string;
    total_commission: number;
    deal_count: number;
  }>;
  by_period: Array<{
    period: string;
    total_commission: number;
    deal_count: number;
  }>;
}
export interface SimulateCommissionRequest {
  user_id: string;
  comp_plan_id?: string;
  deals: Array<{
    arr_amount: number;
    deal_type: "new_business" | "renewal" | "expansion";
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
  name: string;
  description: string;
  bonus_type: "per_deal" | "flat" | "tiered" | "team_pool";
  bonus_amount: number;
  criteria: {
    deal_type: "new_business" | "renewal" | "expansion" | "any";
    min_arr: number | null;
    min_deal_count: number | null;
  };
  caps: {
    per_rep: number | null;
    total_budget: number | null;
  };
  eligibility: {
    all_reps: boolean;
    rep_ids: string[];
  };
  start_date: string;
  end_date: string;
  status: "draft" | "active" | "paused" | "completed";
  leaderboard?: Array<{
    user_id: string;
    rep_name: string;
    qualifying_deals: number;
    earned: number;
  }>;
  created_at: string;
  updated_at: string;
}
export interface CreateSpiffRequest {
  name: string;
  description?: string;
  bonus_type: "per_deal" | "flat" | "tiered" | "team_pool";
  bonus_amount: number;
  criteria: {
    deal_type: "new_business" | "renewal" | "expansion" | "any";
    min_arr?: number;
    min_deal_count?: number;
  };
  caps?: {
    per_rep?: number | null;
    total_budget?: number | null;
  };
  eligibility?: {
    all_reps?: boolean;
    rep_ids?: string[];
  };
  start_date: string;
  end_date: string;
  status?: "draft" | "active";
}
export interface UpdateSpiffRequest {
  name?: string;
  description?: string;
  bonus_type?: "per_deal" | "flat" | "tiered" | "team_pool";
  bonus_amount?: number;
  criteria?: {
    deal_type?: "new_business" | "renewal" | "expansion" | "any";
    min_arr?: number;
    min_deal_count?: number;
  };
  caps?: {
    per_rep?: number | null;
    total_budget?: number | null;
  };
  eligibility?: {
    all_reps?: boolean;
    rep_ids?: string[];
  };
  start_date?: string;
  end_date?: string;
  status?: "draft" | "active" | "paused";
}

// --- Webhooks ---
export interface Webhook {
  id: string;
  url: string;
  events: WebhookEvent[];
  status: "active" | "inactive";
  created_at: string;
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
