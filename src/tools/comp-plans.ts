import { commishClient, CommishApiRequestError } from "../client.js";
import type {
  PaginatedResponse,
  SingleResponse,
  CompPlan,
  CreateCompPlanRequest,
  UpdateCompPlanRequest,
  AssignCompPlanRequest,
  CloneCompPlanRequest,
} from "../types/commish.js";

type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};

function successResult(data: unknown): ToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  };
}

function errorResult(error: unknown): ToolResult {
  if (error instanceof CommishApiRequestError) {
    return {
      content: [{ type: "text", text: error.toUserMessage() }],
      isError: true,
    };
  }
  const message =
    error instanceof Error ? error.message : "An unexpected error occurred.";
  return {
    content: [{ type: "text", text: message }],
    isError: true,
  };
}

export const compPlanTools = {
  list_comp_plans: {
    description:
      "List all compensation plans. Returns plan name, type, ARR/WNC commission rates, quota amounts, accelerator multipliers, assigned user, and status (draft/active/archived). Use when a user asks about comp plans, what commission structures exist, or wants to see all available plans. Filter by status or user_id to narrow results.",
    inputSchema: {
      type: "object" as const,
      properties: {
        status: {
          type: "string",
          enum: ["draft", "active", "archived"],
          description:
            "Filter by plan status. 'draft' = not yet live, 'active' = currently in use, 'archived' = retired plans.",
        },
        user_id: {
          type: "string",
          description:
            "Filter comp plans assigned to a specific user ID. Use list_users to find user IDs.",
        },
        page: {
          type: "number",
          description: "Page number for pagination (default: 1).",
        },
        per_page: {
          type: "number",
          description: "Number of results per page (default: 25, max: 100).",
        },
      },
    },
    handler: async (args: {
      status?: string;
      user_id?: string;
      page?: number;
      per_page?: number;
    }): Promise<ToolResult> => {
      try {
        const result = await commishClient.get<PaginatedResponse<CompPlan>>(
          "/comp-plans",
          {
            status: args.status,
            user_id: args.user_id,
            page: args.page,
            per_page: args.per_page,
          }
        );
        return successResult(result);
      } catch (error) {
        return errorResult(error);
      }
    },
  },

  get_comp_plan: {
    description:
      "Get complete details of a single compensation plan by ID. Returns all configuration: plan type, base salary, variable compensation target, ARR commission rate (arr_variable_percentage), WNC commission rate (wnc_variable_percentage), annual ARR quota (arr_quota_annual), accelerator multipliers, assigned user, and status. Use when a user wants to see the full details of a specific plan.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: {
          type: "string",
          description: "The unique compensation plan ID.",
        },
      },
      required: ["id"],
    },
    handler: async (args: { id: string }): Promise<ToolResult> => {
      try {
        const result = await commishClient.get<SingleResponse<CompPlan>>(
          `/comp-plans/${args.id}`
        );
        return successResult(result);
      } catch (error) {
        return errorResult(error);
      }
    },
  },

  create_comp_plan: {
    description:
      "Create a new compensation plan. Requires a name. All other fields are optional. Key fields: arr_variable_percentage (ARR commission rate as decimal, e.g. 0.10 = 10%), arr_quota_annual (annual ARR quota in dollars), arr_annual_accelerator (multiplier applied at 100% attainment, e.g. 2.0 = double rate), arr_quarterly_accelerator (multiplier at 75% attainment). WNC equivalents also available. Use when setting up a comp plan for a new rep or role.",
    inputSchema: {
      type: "object" as const,
      properties: {
        name: {
          type: "string",
          description:
            "Name of the compensation plan (e.g., 'AE Standard Plan FY2025', 'Enterprise AE Plan').",
        },
        plan_type: {
          type: "string",
          description:
            "Plan type identifier (e.g., 'ae', 'sdr', 'manager'). Default: 'ae'. Free-form string for categorization.",
        },
        user_id: {
          type: "string",
          description:
            "ID of the user (rep) this plan is assigned to. Can be left unset and assigned later via assign_comp_plan.",
        },
        fiscal_year_id: {
          type: "string",
          description:
            "ID of the fiscal year this plan belongs to. Optional — used to group plans by fiscal period.",
        },
        base_salary: {
          type: "number",
          description:
            "Annual base salary in dollars (e.g., 80000 for $80,000). Used for total compensation calculations.",
        },
        variable_compensation: {
          type: "number",
          description:
            "Target variable compensation in dollars at 100% quota attainment (e.g., 80000 for $80K OTE variable).",
        },
        arr_variable_percentage: {
          type: "number",
          description:
            "ARR commission rate as a decimal (e.g., 0.10 = 10%). Applied to ARR amount of qualifying deals. This is the base rate before accelerators.",
        },
        wnc_variable_percentage: {
          type: "number",
          description:
            "WNC (Wins & Contracts) commission rate as a decimal. Applied to WNC points on qualifying deals.",
        },
        arr_quota_annual: {
          type: "number",
          description:
            "Annual ARR quota in dollars (e.g., 1000000 for $1M quota). Used to calculate attainment percentage and trigger accelerators.",
        },
        wnc_quota_annual: {
          type: "number",
          description:
            "Annual WNC quota (units or points). Used to calculate WNC attainment percentage.",
        },
        arr_quarterly_accelerator: {
          type: "number",
          description:
            "ARR accelerator multiplier applied when quarterly attainment milestone is hit (e.g., 1.5 = 1.5× the base ARR rate). Typical range: 1.0–3.0.",
        },
        arr_annual_accelerator: {
          type: "number",
          description:
            "ARR accelerator multiplier applied when 100% annual quota is reached (e.g., 2.0 = double the base ARR rate). Typical range: 1.0–3.0.",
        },
        wnc_annual_accelerator: {
          type: "number",
          description:
            "WNC accelerator multiplier applied when 100% annual WNC quota is reached (e.g., 2.0 = double the base WNC rate).",
        },
        ramp_months: {
          type: "number",
          description:
            "Number of months for quota ramp-up period (e.g., 3 = 3-month ramp). During ramp, quota is prorated. Default: 0 (no ramp).",
        },
        effective_start_date: {
          type: "string",
          description:
            "Plan effective start date in ISO 8601 format (YYYY-MM-DD). When the plan takes effect.",
        },
        status: {
          type: "string",
          enum: ["draft", "active", "archived"],
          description:
            "Initial plan status. 'draft' = not yet live (default), 'active' = currently in use, 'archived' = retired.",
        },
      },
      required: [],
    },
    handler: async (args: {
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
      ramp_months?: number;
      effective_start_date?: string;
      status?: "draft" | "active" | "archived";
    }): Promise<ToolResult> => {
      try {
        const body: CreateCompPlanRequest = {
          plan_type: args.plan_type,
          fiscal_year_id: args.fiscal_year_id,
          user_id: args.user_id,
          base_salary: args.base_salary,
          variable_compensation: args.variable_compensation,
          arr_variable_percentage: args.arr_variable_percentage,
          wnc_variable_percentage: args.wnc_variable_percentage,
          arr_quota_annual: args.arr_quota_annual,
          wnc_quota_annual: args.wnc_quota_annual,
          arr_quarterly_accelerator: args.arr_quarterly_accelerator,
          arr_annual_accelerator: args.arr_annual_accelerator,
          wnc_annual_accelerator: args.wnc_annual_accelerator,
          ramp_months: args.ramp_months,
          effective_start_date: args.effective_start_date,
          status: args.status,
        };
        const result = await commishClient.post<SingleResponse<CompPlan>>(
          "/comp-plans",
          body
        );
        return successResult(result);
      } catch (error) {
        return errorResult(error);
      }
    },
  },

  update_comp_plan: {
    description:
      "Update an existing compensation plan. Only provided fields will be updated — all other fields remain unchanged. Use when adjusting commission rates, quota amounts, accelerator multipliers, assigned user, fiscal year, or plan status. For example: increase arr_variable_percentage, update arr_quota_annual, or set status to 'active'.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: {
          type: "string",
          description: "The unique compensation plan ID to update.",
        },
        name: {
          type: "string",
          description: "Updated plan name.",
        },
        plan_type: {
          type: "string",
          description: "Updated plan type identifier (e.g., 'ae', 'sdr', 'manager').",
        },
        user_id: {
          type: "string",
          description: "Updated user ID to (re)assign the plan to.",
        },
        fiscal_year_id: {
          type: "string",
          description: "Updated fiscal year ID.",
        },
        base_salary: {
          type: "number",
          description: "Updated annual base salary in dollars.",
        },
        variable_compensation: {
          type: "number",
          description: "Updated variable compensation target in dollars.",
        },
        arr_variable_percentage: {
          type: "number",
          description:
            "Updated ARR commission rate as a decimal (e.g., 0.10 = 10%).",
        },
        wnc_variable_percentage: {
          type: "number",
          description: "Updated WNC commission rate as a decimal.",
        },
        arr_quota_annual: {
          type: "number",
          description: "Updated annual ARR quota in dollars.",
        },
        wnc_quota_annual: {
          type: "number",
          description: "Updated annual WNC quota.",
        },
        arr_quarterly_accelerator: {
          type: "number",
          description: "Updated ARR quarterly accelerator multiplier.",
        },
        arr_annual_accelerator: {
          type: "number",
          description: "Updated ARR annual accelerator multiplier.",
        },
        wnc_annual_accelerator: {
          type: "number",
          description: "Updated WNC annual accelerator multiplier.",
        },
        status: {
          type: "string",
          enum: ["draft", "active", "archived"],
          description:
            "Updated plan status. Set to 'active' to make the plan live, 'archived' to retire it.",
        },
      },
      required: ["id"],
    },
    handler: async (args: {
      id: string;
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
    }): Promise<ToolResult> => {
      try {
        const body: UpdateCompPlanRequest = {
          name: args.name,
          plan_type: args.plan_type,
          user_id: args.user_id,
          fiscal_year_id: args.fiscal_year_id,
          base_salary: args.base_salary,
          variable_compensation: args.variable_compensation,
          arr_variable_percentage: args.arr_variable_percentage,
          wnc_variable_percentage: args.wnc_variable_percentage,
          arr_quota_annual: args.arr_quota_annual,
          wnc_quota_annual: args.wnc_quota_annual,
          arr_quarterly_accelerator: args.arr_quarterly_accelerator,
          arr_annual_accelerator: args.arr_annual_accelerator,
          wnc_annual_accelerator: args.wnc_annual_accelerator,
          status: args.status,
        };
        const result = await commishClient.patch<SingleResponse<CompPlan>>(
          `/comp-plans/${args.id}`,
          body
        );
        return successResult(result);
      } catch (error) {
        return errorResult(error);
      }
    },
  },

  assign_comp_plan: {
    description:
      "Assign a compensation plan to one or more users, effective from a specified date. The system will archive any existing active comp plan for each user and clone the source plan for them. Use when onboarding a new rep, promoting someone to a new role, or rolling out a new comp plan to a team.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: {
          type: "string",
          description: "The unique compensation plan ID to assign.",
        },
        user_ids: {
          type: "array",
          items: { type: "string" },
          description:
            "Array of user IDs to assign this comp plan to. Can assign to multiple reps at once.",
        },
        effective_date: {
          type: "string",
          description:
            "Date the assignment takes effect in ISO 8601 format (YYYY-MM-DD). Commission calculations from this date forward will use the new plan.",
        },
      },
      required: ["id", "user_ids", "effective_date"],
    },
    handler: async (args: {
      id: string;
      user_ids: string[];
      effective_date: string;
    }): Promise<ToolResult> => {
      try {
        const body: AssignCompPlanRequest = {
          user_ids: args.user_ids,
          effective_date: args.effective_date,
        };
        const result = await commishClient.post<unknown>(
          `/comp-plans/${args.id}/assign`,
          body
        );
        return successResult(result);
      } catch (error) {
        return errorResult(error);
      }
    },
  },

  clone_comp_plan: {
    description:
      "Clone an existing compensation plan with a new name. All settings (commission rates, quota amounts, accelerator multipliers, plan type, fiscal year) are copied to the new plan, which starts as a 'draft' with no user assigned. Use when creating a variation of an existing plan or preparing a plan for a new fiscal period with minor adjustments.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: {
          type: "string",
          description: "The unique compensation plan ID to clone.",
        },
        name: {
          type: "string",
          description:
            "Name for the new cloned plan (e.g., 'AE Standard Plan FY2026').",
        },
      },
      required: ["id", "name"],
    },
    handler: async (args: { id: string; name: string }): Promise<ToolResult> => {
      try {
        const body: CloneCompPlanRequest = { name: args.name };
        const result = await commishClient.post<SingleResponse<CompPlan>>(
          `/comp-plans/${args.id}/clone`,
          body
        );
        return successResult(result);
      } catch (error) {
        return errorResult(error);
      }
    },
  },
};
