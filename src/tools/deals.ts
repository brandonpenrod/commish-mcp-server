import { commishClient, CommishApiRequestError } from "../client.js";
import type {
  PaginatedResponse,
  SingleResponse,
  Deal,
  CreateDealRequest,
  UpdateDealRequest,
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

export const dealTools = {
  list_deals: {
    description:
      "List and filter sales deals. Returns deal name, ARR amount, commission amount, status, assigned rep, and close date. Use this when the user asks about deals, pipeline, revenue, or wants to see what's been closed, pending, or approved. Supports filtering by status (pending/approved/rejected) and by rep ID. Supports pagination.",
    inputSchema: {
      type: "object" as const,
      properties: {
        status: {
          type: "string",
          enum: ["pending", "approved", "rejected"],
          description:
            "Filter by deal status. Use 'pending' for deals awaiting approval, 'approved' for approved deals, 'rejected' for rejected deals.",
        },
        rep_id: {
          type: "string",
          description:
            "Filter deals by a specific sales rep's user ID. Use get_user or list_users to find rep IDs.",
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
      rep_id?: string;
      page?: number;
      per_page?: number;
    }): Promise<ToolResult> => {
      try {
        const result = await commishClient.get<PaginatedResponse<Deal>>(
          "/deals",
          {
            status: args.status,
            rep_id: args.rep_id,
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

  get_deal: {
    description:
      "Get full details of a single deal by ID, including ARR amount, commission amount, status, assigned rep, deal type, close date, and notes. Use this when a user wants to see details about a specific deal.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: {
          type: "string",
          description: "The unique deal ID.",
        },
      },
      required: ["id"],
    },
    handler: async (args: { id: string }): Promise<ToolResult> => {
      try {
        const result = await commishClient.get<SingleResponse<Deal>>(
          `/deals/${args.id}`
        );
        return successResult(result);
      } catch (error) {
        return errorResult(error);
      }
    },
  },

  create_deal: {
    description:
      "Create a new sales deal. Requires at minimum the opportunity name and ARR amount. The deal will be created in 'pending' status awaiting approval. Use when a user says they closed a deal, wants to log a new deal, or enter a new opportunity. Commission will be calculated automatically upon approval based on the rep's comp plan.",
    inputSchema: {
      type: "object" as const,
      properties: {
        opportunity_name: {
          type: "string",
          description:
            "Name of the deal or opportunity (e.g., 'Acme Corp - Enterprise Plan').",
        },
        arr_amount: {
          type: "number",
          description:
            "Annual Recurring Revenue amount in dollars (e.g., 50000 for $50,000 ARR).",
        },
        rep_id: {
          type: "string",
          description:
            "ID of the sales rep to assign the deal to. If not provided, may default to the authenticated user.",
        },
        close_date: {
          type: "string",
          description:
            "Deal close date in ISO 8601 format (YYYY-MM-DD). Defaults to today if not provided.",
        },
        notes: {
          type: "string",
          description:
            "Optional notes or context about the deal (e.g., deal terms, customer details).",
        },
        deal_type: {
          type: "string",
          enum: ["new_business", "renewal", "expansion"],
          description:
            "Type of deal. 'new_business' = net-new customer, 'renewal' = existing contract renewing, 'expansion' = upsell/add-on to existing customer.",
        },
      },
      required: ["opportunity_name", "arr_amount"],
    },
    handler: async (args: {
      opportunity_name: string;
      arr_amount: number;
      rep_id?: string;
      close_date?: string;
      notes?: string;
      deal_type?: "new_business" | "renewal" | "expansion";
    }): Promise<ToolResult> => {
      try {
        const body: CreateDealRequest = {
          opportunity_name: args.opportunity_name,
          arr_amount: args.arr_amount,
          rep_id: args.rep_id,
          close_date: args.close_date,
          notes: args.notes,
          deal_type: args.deal_type,
        };
        const result = await commishClient.post<SingleResponse<Deal>>(
          "/deals",
          body
        );
        return successResult(result);
      } catch (error) {
        return errorResult(error);
      }
    },
  },

  update_deal: {
    description:
      "Update an existing deal's details such as ARR amount, assigned rep, close date, notes, or deal type. Use when a user wants to edit or correct deal information. Only provided fields will be updated.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: {
          type: "string",
          description: "The unique deal ID to update.",
        },
        opportunity_name: {
          type: "string",
          description: "Updated name of the opportunity.",
        },
        arr_amount: {
          type: "number",
          description: "Updated ARR amount in dollars.",
        },
        rep_id: {
          type: "string",
          description: "Updated sales rep ID to reassign the deal.",
        },
        close_date: {
          type: "string",
          description: "Updated close date in ISO 8601 format (YYYY-MM-DD).",
        },
        notes: {
          type: "string",
          description: "Updated notes for the deal.",
        },
        deal_type: {
          type: "string",
          enum: ["new_business", "renewal", "expansion"],
          description: "Updated deal type.",
        },
      },
      required: ["id"],
    },
    handler: async (args: {
      id: string;
      opportunity_name?: string;
      arr_amount?: number;
      rep_id?: string;
      close_date?: string;
      notes?: string;
      deal_type?: "new_business" | "renewal" | "expansion";
    }): Promise<ToolResult> => {
      try {
        const body: UpdateDealRequest = {
          opportunity_name: args.opportunity_name,
          arr_amount: args.arr_amount,
          rep_id: args.rep_id,
          close_date: args.close_date,
          notes: args.notes,
          deal_type: args.deal_type,
        };
        const result = await commishClient.patch<SingleResponse<Deal>>(
          `/deals/${args.id}`,
          body
        );
        return successResult(result);
      } catch (error) {
        return errorResult(error);
      }
    },
  },

  approve_deal: {
    description:
      "Approve a pending deal. This triggers commission calculation for the assigned rep based on their comp plan. Only deals in 'pending' status can be approved. This is an admin-level action. After approval, the commission record is created and the rep can see their earnings.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: {
          type: "string",
          description: "The unique deal ID to approve.",
        },
      },
      required: ["id"],
    },
    handler: async (args: { id: string }): Promise<ToolResult> => {
      try {
        const result = await commishClient.post<SingleResponse<Deal>>(
          `/deals/${args.id}/approve`
        );
        return successResult(result);
      } catch (error) {
        return errorResult(error);
      }
    },
  },

  reject_deal: {
    description:
      "Reject a pending deal. The deal status will be set to 'rejected' and no commission will be paid. Only deals in 'pending' status can be rejected. This is an admin-level action. Use when a deal should not count toward commissions (e.g., entered in error, did not close, or violates policy).",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: {
          type: "string",
          description: "The unique deal ID to reject.",
        },
        reason: {
          type: "string",
          description:
            "Optional reason for rejection, which may be stored in deal notes.",
        },
      },
      required: ["id"],
    },
    handler: async (args: { id: string; reason?: string }): Promise<ToolResult> => {
      try {
        const result = await commishClient.post<SingleResponse<Deal>>(
          `/deals/${args.id}/reject`,
          args.reason ? { reason: args.reason } : undefined
        );
        return successResult(result);
      } catch (error) {
        return errorResult(error);
      }
    },
  },
};
