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
      "List and filter sales deals. Returns deal fields including opportunity_name, arr_amount, total_commission, arr_commission, wnc_commission, status (draft/pending/approved/rejected), user_id, comp_plan_id, customer_name, close_date, deal_type, and contract_term. Use when the user asks about deals, pipeline, revenue, or wants to see what's been closed, pending, or approved. Filter by status, user_id, or date range.",
    inputSchema: {
      type: "object" as const,
      properties: {
        status: {
          type: "string",
          enum: ["draft", "pending", "approved", "rejected"],
          description:
            "Filter by deal status. 'draft' = entered but not submitted, 'pending' = submitted awaiting approval, 'approved' = approved and commission calculated, 'rejected' = not counting toward commissions.",
        },
        user_id: {
          type: "string",
          description:
            "Filter deals by a specific sales rep's user ID. Use list_users to find user IDs.",
        },
        date_from: {
          type: "string",
          description:
            "Filter deals with close_date on or after this date (ISO 8601 format: YYYY-MM-DD).",
        },
        date_to: {
          type: "string",
          description:
            "Filter deals with close_date on or before this date (ISO 8601 format: YYYY-MM-DD).",
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
      date_from?: string;
      date_to?: string;
      page?: number;
      per_page?: number;
    }): Promise<ToolResult> => {
      try {
        const result = await commishClient.get<PaginatedResponse<Deal>>(
          "/deals",
          {
            status: args.status,
            user_id: args.user_id,
            date_from: args.date_from,
            date_to: args.date_to,
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
      "Get full details of a single deal by ID. Returns all deal fields including arr_amount, commission amounts, status, user_id, comp_plan, customer_name, close_date, deal_type, contract_term, notes, and any deal splits. Use when a user wants to see details about a specific deal.",
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
      "Create a new sales deal. Requires comp_plan_id, opportunity_name, and close_date. The rep (user_id) is automatically derived from the comp plan's assigned user. Deal starts in 'draft' status. Commission is calculated upon approval based on the comp plan's arr_variable_percentage and accelerators. Use when logging a newly closed deal or entering an opportunity.",
    inputSchema: {
      type: "object" as const,
      properties: {
        comp_plan_id: {
          type: "string",
          description:
            "ID of the compensation plan governing this deal. The rep's user_id is derived from this plan. Required.",
        },
        opportunity_name: {
          type: "string",
          description:
            "Name of the deal or opportunity (e.g., 'Acme Corp - Enterprise Plan'). Required.",
        },
        customer_name: {
          type: "string",
          description: "Name of the customer/account. Optional.",
        },
        close_date: {
          type: "string",
          description:
            "Deal close date in ISO 8601 format (YYYY-MM-DD). Required. Used for commission period calculations.",
        },
        contract_term: {
          type: "number",
          description:
            "Contract term length in months (e.g., 12 for annual, 24 for 2-year). Default: 12.",
        },
        arr_amount: {
          type: "number",
          description:
            "Annual Recurring Revenue amount in dollars (e.g., 50000 for $50,000 ARR). Default: 0.",
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
            "Type of deal. 'new_business' = net-new customer, 'renewal' = existing contract renewing, 'expansion' = upsell/add-on to existing customer. Default: 'new_business'.",
        },
        primary_metric_value: {
          type: "number",
          description:
            "Primary metric value for this deal (usage varies by plan type). Default: 0.",
        },
        secondary_metric_value: {
          type: "number",
          description:
            "Secondary metric value for this deal (usage varies by plan type). Default: 0.",
        },
        custom_fields: {
          type: "object",
          description:
            "Optional JSON object for any additional custom data fields associated with this deal.",
        },
      },
      required: ["comp_plan_id", "opportunity_name", "close_date"],
    },
    handler: async (args: {
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
    }): Promise<ToolResult> => {
      try {
        const body: CreateDealRequest = {
          comp_plan_id: args.comp_plan_id,
          opportunity_name: args.opportunity_name,
          customer_name: args.customer_name,
          close_date: args.close_date,
          contract_term: args.contract_term,
          arr_amount: args.arr_amount,
          notes: args.notes,
          deal_type: args.deal_type,
          primary_metric_value: args.primary_metric_value,
          secondary_metric_value: args.secondary_metric_value,
          custom_fields: args.custom_fields,
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
      "Update an existing deal's details. Only the following fields can be updated: opportunity_name, customer_name, close_date, contract_term, arr_amount, notes, deal_type, primary_metric_value, secondary_metric_value, custom_fields. The comp plan assignment and user cannot be changed here. Only provided fields will be updated.",
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
        customer_name: {
          type: "string",
          description: "Updated customer/account name.",
        },
        arr_amount: {
          type: "number",
          description: "Updated ARR amount in dollars.",
        },
        close_date: {
          type: "string",
          description: "Updated close date in ISO 8601 format (YYYY-MM-DD).",
        },
        contract_term: {
          type: "number",
          description: "Updated contract term in months.",
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
        primary_metric_value: {
          type: "number",
          description: "Updated primary metric value.",
        },
        secondary_metric_value: {
          type: "number",
          description: "Updated secondary metric value.",
        },
        custom_fields: {
          type: "object",
          description: "Updated custom fields JSON object.",
        },
      },
      required: ["id"],
    },
    handler: async (args: {
      id: string;
      opportunity_name?: string;
      customer_name?: string;
      arr_amount?: number;
      close_date?: string;
      contract_term?: number;
      notes?: string;
      deal_type?: "new_business" | "renewal" | "expansion";
      primary_metric_value?: number;
      secondary_metric_value?: number;
      custom_fields?: Record<string, unknown>;
    }): Promise<ToolResult> => {
      try {
        const body: UpdateDealRequest = {
          opportunity_name: args.opportunity_name,
          customer_name: args.customer_name,
          arr_amount: args.arr_amount,
          close_date: args.close_date,
          contract_term: args.contract_term,
          notes: args.notes,
          deal_type: args.deal_type,
          primary_metric_value: args.primary_metric_value,
          secondary_metric_value: args.secondary_metric_value,
          custom_fields: args.custom_fields,
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
      "Approve a deal in 'pending' or 'draft' status. Sets status to 'approved' and records the approval timestamp. This is an admin-level action. After approval, the deal's commission amounts (arr_commission, wnc_commission, total_commission) factor into the rep's attainment and accelerator calculations. Use when a manager approves a submitted deal.",
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
      "Reject a deal in 'pending' or 'draft' status. Sets status to 'rejected' and records the rejection reason. No commission will be paid for rejected deals. This is an admin-level action. Use when a deal should not count toward commissions (e.g., entered in error, did not close, or violates policy).",
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
            "Reason for rejection. Stored as rejection_reason on the deal record. Optional but recommended.",
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
