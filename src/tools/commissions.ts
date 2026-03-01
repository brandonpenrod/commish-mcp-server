import { commishClient, CommishApiRequestError } from "../client.js";
import type {
  PaginatedResponse,
  Commission,
  CommissionSummary,
  SimulateCommissionRequest,
  SimulateCommissionResponse,
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

export const commissionTools = {
  list_commissions: {
    description:
      "List all approved commission-generating deals across the organization. Returns deal records with user_id, comp_plan_id, opportunity_name, close_date, arr_commission, wnc_commission, total_commission, and status. Only approved deals appear here. Filter by user_id, comp_plan_id, or period (YYYY-MM month) to narrow results. Use when a user asks about commissions, earnings, payouts, or wants to see commission history.",
    inputSchema: {
      type: "object" as const,
      properties: {
        user_id: {
          type: "string",
          description:
            "Filter commissions for a specific sales rep by their user ID. Use list_users to find user IDs.",
        },
        comp_plan_id: {
          type: "string",
          description:
            "Filter commissions for deals under a specific comp plan.",
        },
        period: {
          type: "string",
          description:
            "Filter by month in YYYY-MM format (e.g., '2025-03' for March 2025). Returns deals closed in that month.",
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
      user_id?: string;
      comp_plan_id?: string;
      period?: string;
      page?: number;
      per_page?: number;
    }): Promise<ToolResult> => {
      try {
        const result = await commishClient.get<PaginatedResponse<Commission>>(
          "/commissions",
          {
            user_id: args.user_id,
            comp_plan_id: args.comp_plan_id,
            period: args.period,
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

  get_commission_summary: {
    description:
      "Get an aggregated commission summary across the organization. Returns: total_paid (sum of all approved deal commissions), total_pending (sum of pending deal commissions), approved_deal_count, pending_deal_count, and by_month (commission totals keyed by YYYY-MM month). Use when a user asks for an overview of commission spend, wants to see monthly trends, or needs a high-level dashboard view.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
    handler: async (_args: Record<string, never>): Promise<ToolResult> => {
      try {
        const result = await commishClient.get<CommissionSummary>(
          "/commissions/summary"
        );
        return successResult(result);
      } catch (error) {
        return errorResult(error);
      }
    },
  },

  simulate_commission: {
    description:
      "Simulate commission calculations for hypothetical deals without creating real records. Uses the rep's current active comp plan (or a specified one) and their existing YTD approved deals as baseline attainment. Returns: current quota attainment, projected attainment after simulated deals, deal-by-deal commission breakdown showing which accelerator tier applies, and total projected additional commission. Powerful for: (1) Forecasting rep earnings, (2) Showing how close a rep is to an accelerator threshold, (3) Comparing commission under different comp plans, (4) Planning quota scenarios. The arr_variable_percentage and arr_quarterly/annual_accelerator from the comp plan drive the calculations.",
    inputSchema: {
      type: "object" as const,
      properties: {
        user_id: {
          type: "string",
          description:
            "ID of the sales rep to run the simulation for. Their current quota attainment (YTD approved deals) is used as the baseline.",
        },
        comp_plan_id: {
          type: "string",
          description:
            "Optional: override which comp plan to use for simulation. If not provided, uses the rep's currently active plan. Use to compare what they'd earn under a different plan.",
        },
        deals: {
          type: "array",
          description:
            "Array of hypothetical deals to simulate. Each deal needs an ARR amount.",
          items: {
            type: "object",
            properties: {
              arr_amount: {
                type: "number",
                description:
                  "ARR amount for this hypothetical deal in dollars (e.g., 50000 for $50K ARR).",
              },
              deal_type: {
                type: "string",
                enum: ["new_business", "renewal", "expansion"],
                description:
                  "Type of the hypothetical deal. Optional — defaults to 'new_business'.",
              },
            },
            required: ["arr_amount"],
          },
        },
        include_existing: {
          type: "boolean",
          description:
            "Whether to include the rep's existing approved YTD deals when calculating quota attainment for accelerator thresholds. Default: true. Set to false to simulate in isolation (as if starting from 0% attainment).",
        },
      },
      required: ["user_id", "deals"],
    },
    handler: async (args: {
      user_id: string;
      comp_plan_id?: string;
      deals: Array<{
        arr_amount: number;
        deal_type?: "new_business" | "renewal" | "expansion";
      }>;
      include_existing?: boolean;
    }): Promise<ToolResult> => {
      try {
        const body: SimulateCommissionRequest = {
          user_id: args.user_id,
          comp_plan_id: args.comp_plan_id,
          deals: args.deals,
          include_existing: args.include_existing,
        };
        const result = await commishClient.post<SimulateCommissionResponse>(
          "/commissions/simulate",
          body
        );
        return successResult(result);
      } catch (error) {
        return errorResult(error);
      }
    },
  },
};
