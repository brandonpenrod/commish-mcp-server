import { commishClient, CommishApiRequestError } from "../client.js";
import type {
  PaginatedResponse,
  SingleResponse,
  Spiff,
  CreateSpiffRequest,
  UpdateSpiffRequest,
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

export const spiffTools = {
  list_spiffs: {
    description:
      "List all SPIFFs (Sales Performance Incentive Fund Programs). Returns SPIFF name, bonus type, bonus amount, criteria, eligibility, status (draft/active/paused/completed), start/end dates, and leaderboard if available. Use when a user asks about SPIFFs, bonuses, incentive programs, contests, or leaderboards.",
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
        const result = await commishClient.get<PaginatedResponse<Spiff>>(
          "/spiffs",
          { page: args.page, per_page: args.per_page }
        );
        return successResult(result);
      } catch (error) {
        return errorResult(error);
      }
    },
  },

  get_spiff: {
    description:
      "Get full details of a specific SPIFF by ID, including bonus configuration, eligibility rules, leaderboard standings, and status. Use when a user wants to see the details or current standings of a specific SPIFF.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: {
          type: "string",
          description: "The unique SPIFF ID.",
        },
      },
      required: ["id"],
    },
    handler: async (args: { id: string }): Promise<ToolResult> => {
      try {
        const result = await commishClient.get<SingleResponse<Spiff>>(
          `/spiffs/${args.id}`
        );
        return successResult(result);
      } catch (error) {
        return errorResult(error);
      }
    },
  },

  create_spiff: {
    description:
      "Create a new SPIFF (Sales Performance Incentive Fund Program) to motivate reps with bonus payouts for specific deal activity. Supports per-deal bonuses, flat bonuses, tiered bonuses, and team pool distributions. Set criteria to target specific deal types, ARR thresholds, or deal counts. Use when launching a new sales contest, incentive program, or short-term promotion.",
    inputSchema: {
      type: "object" as const,
      properties: {
        name: {
          type: "string",
          description:
            "Name of the SPIFF (e.g., 'Q1 New Business Blitz', 'Enterprise Deal Contest').",
        },
        description: {
          type: "string",
          description:
            "Human-readable description of the SPIFF rules and goals, shown to reps.",
        },
        bonus_type: {
          type: "string",
          enum: ["per_deal", "flat", "tiered", "team_pool"],
          description:
            "How the bonus is structured. 'per_deal' = fixed amount per qualifying deal, 'flat' = one-time bonus for hitting a milestone, 'tiered' = different amounts at different thresholds, 'team_pool' = shared pool split among qualifying reps.",
        },
        bonus_amount: {
          type: "number",
          description:
            "Bonus amount in dollars. For per_deal: dollars per deal. For flat/team_pool: total pool. For tiered: base tier amount (tiers configured separately).",
        },
        criteria: {
          type: "object",
          description: "Qualifying criteria that deals must meet to count toward this SPIFF.",
          properties: {
            deal_type: {
              type: "string",
              enum: ["new_business", "renewal", "expansion", "any"],
              description:
                "Deal type that qualifies. Use 'any' to count all deal types.",
            },
            min_arr: {
              type: "number",
              description:
                "Minimum ARR amount (in dollars) for a deal to qualify. Null for no minimum.",
            },
            min_deal_count: {
              type: "number",
              description:
                "Minimum number of qualifying deals before the SPIFF pays out. For flat bonuses: rep must close this many deals to earn the bonus.",
            },
          },
          required: ["deal_type"],
        },
        caps: {
          type: "object",
          description: "Caps to limit total SPIFF payout.",
          properties: {
            per_rep: {
              type: "number",
              description:
                "Maximum total payout per individual rep for this SPIFF in dollars. Null for no cap.",
              nullable: true,
            },
            total_budget: {
              type: "number",
              description:
                "Total SPIFF budget in dollars. Once exhausted, no additional payouts are made. Null for no budget limit.",
              nullable: true,
            },
          },
        },
        eligibility: {
          type: "object",
          description: "Which reps are eligible to participate in this SPIFF.",
          properties: {
            all_reps: {
              type: "boolean",
              description:
                "If true, all active reps are eligible. If false, only reps in rep_ids are eligible.",
            },
            rep_ids: {
              type: "array",
              items: { type: "string" },
              description:
                "Specific rep user IDs to include (only used if all_reps is false).",
            },
          },
        },
        start_date: {
          type: "string",
          description:
            "SPIFF start date in ISO 8601 format (YYYY-MM-DD). Deals closed on or after this date qualify.",
        },
        end_date: {
          type: "string",
          description:
            "SPIFF end date in ISO 8601 format (YYYY-MM-DD). Deals must close on or before this date to qualify.",
        },
        status: {
          type: "string",
          enum: ["draft", "active"],
          description:
            "Initial status. 'draft' to save without activating, 'active' to launch immediately.",
        },
      },
      required: ["name", "bonus_type", "bonus_amount", "criteria", "start_date", "end_date"],
    },
    handler: async (args: {
      name: string;
      description?: string;
      bonus_type: "per_deal" | "flat" | "tiered" | "team_pool";
      bonus_amount: number;
      criteria: {
        deal_type: "new_business" | "renewal" | "expansion" | "any";
        min_arr?: number;
        min_deal_count?: number;
      };
      caps?: { per_rep?: number | null; total_budget?: number | null };
      eligibility?: { all_reps?: boolean; rep_ids?: string[] };
      start_date: string;
      end_date: string;
      status?: "draft" | "active";
    }): Promise<ToolResult> => {
      try {
        const body: CreateSpiffRequest = {
          name: args.name,
          description: args.description,
          bonus_type: args.bonus_type,
          bonus_amount: args.bonus_amount,
          criteria: args.criteria,
          caps: args.caps,
          eligibility: args.eligibility,
          start_date: args.start_date,
          end_date: args.end_date,
          status: args.status,
        };
        const result = await commishClient.post<SingleResponse<Spiff>>(
          "/spiffs",
          body
        );
        return successResult(result);
      } catch (error) {
        return errorResult(error);
      }
    },
  },

  update_spiff: {
    description:
      "Update an existing SPIFF. Only provided fields will be changed. Can update name, description, bonus amount, criteria, caps, eligibility, dates, and status. Use to pause an active SPIFF (set status to 'paused'), adjust bonus amounts, or extend end dates. Cannot update completed SPIFFs.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: {
          type: "string",
          description: "The unique SPIFF ID to update.",
        },
        name: { type: "string", description: "Updated SPIFF name." },
        description: { type: "string", description: "Updated description." },
        bonus_type: {
          type: "string",
          enum: ["per_deal", "flat", "tiered", "team_pool"],
          description: "Updated bonus type.",
        },
        bonus_amount: {
          type: "number",
          description: "Updated bonus amount in dollars.",
        },
        criteria: {
          type: "object",
          description: "Updated qualifying criteria.",
          properties: {
            deal_type: {
              type: "string",
              enum: ["new_business", "renewal", "expansion", "any"],
            },
            min_arr: { type: "number" },
            min_deal_count: { type: "number" },
          },
        },
        caps: {
          type: "object",
          description: "Updated payout caps.",
          properties: {
            per_rep: { type: "number", nullable: true },
            total_budget: { type: "number", nullable: true },
          },
        },
        eligibility: {
          type: "object",
          description: "Updated eligibility rules.",
          properties: {
            all_reps: { type: "boolean" },
            rep_ids: { type: "array", items: { type: "string" } },
          },
        },
        start_date: {
          type: "string",
          description: "Updated start date in ISO 8601 format.",
        },
        end_date: {
          type: "string",
          description: "Updated end date in ISO 8601 format.",
        },
        status: {
          type: "string",
          enum: ["draft", "active", "paused"],
          description:
            "Updated status. Set to 'paused' to temporarily suspend the SPIFF.",
        },
      },
      required: ["id"],
    },
    handler: async (args: {
      id: string;
      name?: string;
      description?: string;
      bonus_type?: "per_deal" | "flat" | "tiered" | "team_pool";
      bonus_amount?: number;
      criteria?: {
        deal_type?: "new_business" | "renewal" | "expansion" | "any";
        min_arr?: number;
        min_deal_count?: number;
      };
      caps?: { per_rep?: number | null; total_budget?: number | null };
      eligibility?: { all_reps?: boolean; rep_ids?: string[] };
      start_date?: string;
      end_date?: string;
      status?: "draft" | "active" | "paused";
    }): Promise<ToolResult> => {
      try {
        const body: UpdateSpiffRequest = {
          name: args.name,
          description: args.description,
          bonus_type: args.bonus_type,
          bonus_amount: args.bonus_amount,
          criteria: args.criteria,
          caps: args.caps,
          eligibility: args.eligibility,
          start_date: args.start_date,
          end_date: args.end_date,
          status: args.status,
        };
        const result = await commishClient.patch<SingleResponse<Spiff>>(
          `/spiffs/${args.id}`,
          body
        );
        return successResult(result);
      } catch (error) {
        return errorResult(error);
      }
    },
  },

  delete_spiff: {
    description:
      "Delete a SPIFF permanently. Only SPIFFs in 'draft' or 'paused' status can be deleted. Active or completed SPIFFs cannot be deleted to preserve payout records. Use when a SPIFF was created in error or is no longer needed.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: {
          type: "string",
          description: "The unique SPIFF ID to delete.",
        },
      },
      required: ["id"],
    },
    handler: async (args: { id: string }): Promise<ToolResult> => {
      try {
        await commishClient.delete<unknown>(`/spiffs/${args.id}`);
        return {
          content: [{ type: "text", text: "SPIFF successfully deleted." }],
        };
      } catch (error) {
        return errorResult(error);
      }
    },
  },
};
