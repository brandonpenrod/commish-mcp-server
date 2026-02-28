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
      "List all commission records across the organization. Returns commission amount, rate, deal name, rep name, accelerator applied, status (calculated/paid/pending), and period. Use when a user asks about commissions, earnings, payouts, or wants to see commission history across the team.",
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
        const result = await commishClient.get<PaginatedResponse<Commission>>(
          "/commissions",
          { page: args.page, per_page: args.per_page }
        );
        return successResult(result);
      } catch (error) {
        return errorResult(error);
      }
    },
  },

  get_commission_summary: {
    description:
      "Get an aggregated summary of all commissions across the organization. Returns total commissions, total paid, total pending, total deals, average commission, breakdown by rep (who earned what), and breakdown by period. Use when a user asks for an overview of commission spend, wants to see top earners, or needs a summary dashboard view.",
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
      "Simulate commission calculations for hypothetical deals without creating real records. Powerful what-if analysis tool for: (1) Forecasting how much a rep would earn from potential deals, (2) Comparing commission outcomes under different comp plans, (3) Showing a rep how close they are to an accelerator threshold, (4) Planning quota attainment scenarios. Returns current attainment, simulated attainment, deal-by-deal breakdown with accelerators applied, and total projected commission.",
    inputSchema: {
      type: "object" as const,
      properties: {
        user_id: {
          type: "string",
          description:
            "ID of the sales rep to run the simulation for. Their current quota attainment is used as the baseline.",
        },
        comp_plan_id: {
          type: "string",
          description:
            "Optional: override the comp plan used for simulation. If not provided, uses the rep's currently assigned plan. Use this to compare what they'd earn under a different plan.",
        },
        deals: {
          type: "array",
          description:
            "Array of hypothetical deals to simulate. Each deal needs an ARR amount and deal type.",
          items: {
            type: "object",
            properties: {
              arr_amount: {
                type: "number",
                description:
                  "ARR amount for this hypothetical deal in dollars (e.g., 50000 for $50K).",
              },
              deal_type: {
                type: "string",
                enum: ["new_business", "renewal", "expansion"],
                description: "Type of the hypothetical deal.",
              },
            },
            required: ["arr_amount", "deal_type"],
          },
        },
        include_existing: {
          type: "boolean",
          description:
            "Whether to include the rep's existing approved deals when calculating quota attainment for accelerator/decelerator thresholds. Default true. Set to false to simulate in isolation.",
        },
      },
      required: ["user_id", "deals"],
    },
    handler: async (args: {
      user_id: string;
      comp_plan_id?: string;
      deals: Array<{
        arr_amount: number;
        deal_type: "new_business" | "renewal" | "expansion";
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
