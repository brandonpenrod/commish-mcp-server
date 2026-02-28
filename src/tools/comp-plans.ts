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
      "List all compensation plans. Returns plan name, type (standard/executive/custom), base commission rate, deal type rates, quota, accelerators, decelerators, and assigned users. Use this when a user asks about comp plans, what commission structures exist, or wants to see all available plans.",
    inputSchema: {
      type: "object" as const,
      properties: {
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
      page?: number;
      per_page?: number;
    }): Promise<ToolResult> => {
      try {
        const result = await commishClient.get<PaginatedResponse<CompPlan>>(
          "/comp-plans",
          { page: args.page, per_page: args.per_page }
        );
        return successResult(result);
      } catch (error) {
        return errorResult(error);
      }
    },
  },

  get_comp_plan: {
    description:
      "Get complete details of a single compensation plan by ID. Returns all configuration including deal type rates, quota settings, accelerator tiers, decelerator tiers, caps, and assigned users. Use when a user wants to see the full details of a specific plan.",
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
      "Create a new compensation plan with full configuration including base rates, deal type rates, quota, accelerators, decelerators, and commission caps. Use when a user wants to set up a new comp plan for their sales team or a new role.",
    inputSchema: {
      type: "object" as const,
      properties: {
        name: {
          type: "string",
          description:
            "Name of the compensation plan (e.g., 'AE Standard Plan Q1 2025', 'Enterprise AE Plan').",
        },
        plan_type: {
          type: "string",
          enum: ["standard", "executive", "custom"],
          description:
            "Type of plan. 'standard' = typical AE/SDR plan, 'executive' = VP/Director level plan, 'custom' = fully custom structure.",
        },
        effective_date: {
          type: "string",
          description:
            "Date the plan becomes effective in ISO 8601 format (YYYY-MM-DD). Required.",
        },
        end_date: {
          type: "string",
          description:
            "Date the plan expires in ISO 8601 format (YYYY-MM-DD). Null or omit for open-ended plans.",
          nullable: true,
        },
        base_commission_rate: {
          type: "number",
          description:
            "Base commission rate as a decimal (e.g., 0.10 = 10%, 0.08 = 8%). This is the default rate before deal-type-specific rates or accelerators apply.",
        },
        deal_types: {
          type: "object",
          description:
            "Commission rates per deal type as decimals. These override the base rate for specific deal types.",
          properties: {
            new_business: {
              type: "number",
              description:
                "Commission rate for new customer deals as a decimal (e.g., 0.10 = 10%).",
            },
            renewal: {
              type: "number",
              description:
                "Commission rate for renewal deals as a decimal (e.g., 0.05 = 5%, typically lower than new business).",
            },
            expansion: {
              type: "number",
              description:
                "Commission rate for expansion/upsell deals as a decimal (e.g., 0.08 = 8%).",
            },
          },
          required: ["new_business", "renewal", "expansion"],
        },
        quota: {
          type: "object",
          description:
            "Quota configuration. Used to calculate attainment percentage and trigger accelerators/decelerators.",
          properties: {
            period: {
              type: "string",
              enum: ["monthly", "quarterly", "annual"],
              description: "Quota measurement period.",
            },
            amount: {
              type: "number",
              description:
                "Quota amount in dollars of ARR (e.g., 500000 for $500K quota).",
            },
          },
          required: ["period", "amount"],
        },
        accelerators: {
          type: "array",
          description:
            "Accelerator tiers that increase commission rates when quota attainment exceeds thresholds. List in ascending threshold order.",
          items: {
            type: "object",
            properties: {
              threshold_percent: {
                type: "number",
                description:
                  "Quota attainment percentage to trigger this accelerator (e.g., 100 = 100% of quota, 125 = 125%).",
              },
              commission_rate: {
                type: "number",
                description:
                  "Commission rate to apply above this threshold as a decimal (e.g., 0.15 = 15%).",
              },
            },
            required: ["threshold_percent", "commission_rate"],
          },
        },
        decelerators: {
          type: "array",
          description:
            "Decelerator tiers that reduce commission rates when quota attainment is below thresholds. List in descending threshold order.",
          items: {
            type: "object",
            properties: {
              threshold_percent: {
                type: "number",
                description:
                  "Quota attainment percentage below which this decelerator applies (e.g., 50 = below 50% of quota).",
              },
              commission_rate: {
                type: "number",
                description:
                  "Reduced commission rate as a decimal (e.g., 0.05 = 5%).",
              },
            },
            required: ["threshold_percent", "commission_rate"],
          },
        },
        caps: {
          type: "object",
          description: "Commission caps to limit maximum payout.",
          properties: {
            per_deal_max: {
              type: "number",
              description:
                "Maximum commission payout per individual deal in dollars. Null for no per-deal cap.",
              nullable: true,
            },
            period_max: {
              type: "number",
              description:
                "Maximum total commission payout for the entire quota period in dollars. Null for no period cap.",
              nullable: true,
            },
          },
        },
      },
      required: ["name", "effective_date", "deal_types"],
    },
    handler: async (args: {
      name: string;
      plan_type?: "standard" | "executive" | "custom";
      effective_date: string;
      end_date?: string | null;
      base_commission_rate?: number;
      deal_types: { new_business: number; renewal: number; expansion: number };
      quota?: { period: "monthly" | "quarterly" | "annual"; amount: number };
      accelerators?: Array<{
        threshold_percent: number;
        commission_rate: number;
      }>;
      decelerators?: Array<{
        threshold_percent: number;
        commission_rate: number;
      }>;
      caps?: { per_deal_max?: number | null; period_max?: number | null };
    }): Promise<ToolResult> => {
      try {
        const body: CreateCompPlanRequest = {
          name: args.name,
          plan_type: args.plan_type,
          effective_date: args.effective_date,
          end_date: args.end_date,
          base_commission_rate: args.base_commission_rate,
          deal_types: args.deal_types,
          quota: args.quota,
          accelerators: args.accelerators,
          decelerators: args.decelerators,
          caps: args.caps,
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
      "Update an existing compensation plan. Only provided fields will be updated — all other fields remain unchanged. Use when a user wants to adjust rates, quotas, accelerators, or any other aspect of an existing plan.",
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
          enum: ["standard", "executive", "custom"],
          description: "Updated plan type.",
        },
        effective_date: {
          type: "string",
          description: "Updated effective date in ISO 8601 format (YYYY-MM-DD).",
        },
        end_date: {
          type: "string",
          description: "Updated end date in ISO 8601 format (YYYY-MM-DD). Set to null to remove the end date.",
          nullable: true,
        },
        base_commission_rate: {
          type: "number",
          description: "Updated base commission rate as a decimal (e.g., 0.10 = 10%).",
        },
        deal_types: {
          type: "object",
          description: "Updated deal type commission rates (partial update supported).",
          properties: {
            new_business: { type: "number", description: "New business rate as decimal." },
            renewal: { type: "number", description: "Renewal rate as decimal." },
            expansion: { type: "number", description: "Expansion rate as decimal." },
          },
        },
        quota: {
          type: "object",
          description: "Updated quota configuration.",
          properties: {
            period: { type: "string", enum: ["monthly", "quarterly", "annual"] },
            amount: { type: "number", description: "Quota amount in dollars." },
          },
        },
        accelerators: {
          type: "array",
          description: "Replacement accelerator tiers (replaces all existing accelerators).",
          items: {
            type: "object",
            properties: {
              threshold_percent: { type: "number" },
              commission_rate: { type: "number" },
            },
          },
        },
        decelerators: {
          type: "array",
          description: "Replacement decelerator tiers (replaces all existing decelerators).",
          items: {
            type: "object",
            properties: {
              threshold_percent: { type: "number" },
              commission_rate: { type: "number" },
            },
          },
        },
        caps: {
          type: "object",
          description: "Updated commission caps.",
          properties: {
            per_deal_max: { type: "number", nullable: true },
            period_max: { type: "number", nullable: true },
          },
        },
      },
      required: ["id"],
    },
    handler: async (args: {
      id: string;
      name?: string;
      plan_type?: "standard" | "executive" | "custom";
      effective_date?: string;
      end_date?: string | null;
      base_commission_rate?: number;
      deal_types?: { new_business?: number; renewal?: number; expansion?: number };
      quota?: { period?: "monthly" | "quarterly" | "annual"; amount?: number };
      accelerators?: Array<{ threshold_percent: number; commission_rate: number }>;
      decelerators?: Array<{ threshold_percent: number; commission_rate: number }>;
      caps?: { per_deal_max?: number | null; period_max?: number | null };
    }): Promise<ToolResult> => {
      try {
        const body: UpdateCompPlanRequest = {
          name: args.name,
          plan_type: args.plan_type,
          effective_date: args.effective_date,
          end_date: args.end_date,
          base_commission_rate: args.base_commission_rate,
          deal_types: args.deal_types,
          quota: args.quota,
          accelerators: args.accelerators,
          decelerators: args.decelerators,
          caps: args.caps,
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
      "Assign a compensation plan to one or more users, effective from a specified date. This determines which comp plan governs commission calculations for those users going forward. Use when onboarding a new rep, promoting someone to a new role, or rolling out a new comp plan to a team.",
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
      "Clone an existing compensation plan with a new name. All settings (rates, quota, accelerators, decelerators, caps) are copied to the new plan. The new plan starts unassigned. Use when creating a variation of an existing plan or preparing a plan for a new quarter with minor adjustments.",
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
            "Name for the new cloned plan (e.g., 'AE Standard Plan Q2 2025').",
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
