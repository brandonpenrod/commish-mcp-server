import { commishClient, CommishApiRequestError } from "../client.js";
import type {
  PaginatedResponse,
  SingleResponse,
  User,
  Commission,
  CreateUserRequest,
  UpdateUserRequest,
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

export const userTools = {
  list_users: {
    description:
      "List all sales reps and users in the Commish organization. Returns name (single field, not split), email, role, title, start date, is_active status, and manager_id. Use when the user asks about team members, wants to find a rep's ID, or wants to see who is on the team. Filter by role (ae/sdr/manager/admin) or is_active (true/false).",
    inputSchema: {
      type: "object" as const,
      properties: {
        role: {
          type: "string",
          description:
            "Filter by user role: 'ae' = Account Executive, 'sdr' = Sales Development Rep, 'manager' = Sales Manager, 'admin' = Administrator.",
        },
        is_active: {
          type: "boolean",
          description:
            "Filter by active status. true = active users only, false = inactive/deactivated users only. Omit to return all.",
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
      role?: string;
      is_active?: boolean;
      page?: number;
      per_page?: number;
    }): Promise<ToolResult> => {
      try {
        const params: Record<string, string | number | boolean | undefined> = {
          page: args.page,
          per_page: args.per_page,
          role: args.role,
          is_active: args.is_active,
        };

        const result = await commishClient.get<PaginatedResponse<User>>(
          "/users",
          params
        );
        return successResult(result);
      } catch (error) {
        return errorResult(error);
      }
    },
  },

  get_user: {
    description:
      "Get full details of a single user by ID. Returns name, email, role, title, start_date, is_active status, and manager_id. Use when you need detailed information about a specific rep or user.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: {
          type: "string",
          description: "The unique user ID.",
        },
      },
      required: ["id"],
    },
    handler: async (args: { id: string }): Promise<ToolResult> => {
      try {
        const result = await commishClient.get<SingleResponse<User>>(
          `/users/${args.id}`
        );
        return successResult(result);
      } catch (error) {
        return errorResult(error);
      }
    },
  },

  get_user_commissions: {
    description:
      "Get commission history for a specific user/rep by filtering the commissions endpoint. Returns approved deal records showing opportunity name, close date, arr_commission, wnc_commission, and total_commission. Use when a user asks 'how much has [rep] earned?', 'show me [rep]'s commissions', or wants a rep's earnings history.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: {
          type: "string",
          description: "The unique user ID to get commissions for.",
        },
        comp_plan_id: {
          type: "string",
          description: "Optional: filter commissions for a specific comp plan.",
        },
        period: {
          type: "string",
          description:
            "Optional: filter by month in YYYY-MM format (e.g., '2025-03' for March 2025). Returns deals closed in that month.",
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
      required: ["id"],
    },
    handler: async (args: {
      id: string;
      comp_plan_id?: string;
      period?: string;
      page?: number;
      per_page?: number;
    }): Promise<ToolResult> => {
      try {
        const result = await commishClient.get<PaginatedResponse<Commission>>(
          "/commissions",
          {
            user_id: args.id,
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

  create_user: {
    description:
      "Create a new user/sales rep in Commish. Requires name (full name as a single string) and email. Optionally set role, title, start_date, is_active, and manager_id. Note: the backend uses a single 'name' field, not separate first/last name fields. Use when onboarding a new team member or adding a rep to the system.",
    inputSchema: {
      type: "object" as const,
      properties: {
        name: {
          type: "string",
          description:
            "User's full name as a single string (e.g., 'Jane Smith'). This is a single name field, not split into first/last.",
        },
        email: {
          type: "string",
          description:
            "User's email address. Must be unique within the organization.",
        },
        role: {
          type: "string",
          description:
            "User role. Common values: 'ae' = Account Executive, 'sdr' = Sales Development Rep, 'manager' = Sales Manager (can view/approve), 'admin' = Administrator (full access).",
        },
        title: {
          type: "string",
          description:
            "User's job title (e.g., 'Senior Account Executive', 'SDR Manager'). Optional.",
        },
        start_date: {
          type: "string",
          description:
            "User's start date in ISO 8601 format (YYYY-MM-DD). Used for quota proration and eligibility calculations.",
        },
        is_active: {
          type: "boolean",
          description:
            "Whether the user is active. Defaults to true. Set to false to create a deactivated user.",
        },
        manager_id: {
          type: "string",
          description:
            "ID of this user's manager (must be another user in the organization). Optional.",
        },
      },
      required: ["name", "email"],
    },
    handler: async (args: {
      name: string;
      email: string;
      role?: string;
      title?: string;
      start_date?: string;
      is_active?: boolean;
      manager_id?: string;
    }): Promise<ToolResult> => {
      try {
        const body: CreateUserRequest = {
          name: args.name,
          email: args.email,
          role: args.role,
          title: args.title,
          start_date: args.start_date,
          is_active: args.is_active,
          manager_id: args.manager_id,
        };
        const result = await commishClient.post<SingleResponse<User>>(
          "/users",
          body
        );
        return successResult(result);
      } catch (error) {
        return errorResult(error);
      }
    },
  },

  update_user: {
    description:
      "Update an existing user's information. Only provided fields will be changed. Use to update a rep's name, email, role, title, start_date, manager, or active status. To deactivate a user who left the team, set is_active to false. Note: use assign_comp_plan (not this tool) to change a user's comp plan assignment.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: {
          type: "string",
          description: "The unique user ID to update.",
        },
        name: {
          type: "string",
          description: "Updated full name as a single string.",
        },
        email: {
          type: "string",
          description: "Updated email address.",
        },
        role: {
          type: "string",
          description: "Updated role (e.g., 'ae', 'sdr', 'manager', 'admin').",
        },
        title: {
          type: "string",
          description: "Updated job title.",
        },
        start_date: {
          type: "string",
          description: "Updated start date in ISO 8601 format (YYYY-MM-DD).",
        },
        is_active: {
          type: "boolean",
          description:
            "Set to false to deactivate a user who has left the team. Set to true to reactivate.",
        },
        manager_id: {
          type: "string",
          description: "Updated manager ID.",
        },
      },
      required: ["id"],
    },
    handler: async (args: {
      id: string;
      name?: string;
      email?: string;
      role?: string;
      title?: string;
      start_date?: string;
      is_active?: boolean;
      manager_id?: string;
    }): Promise<ToolResult> => {
      try {
        const body: UpdateUserRequest = {
          name: args.name,
          email: args.email,
          role: args.role,
          title: args.title,
          start_date: args.start_date,
          is_active: args.is_active,
          manager_id: args.manager_id,
        };
        const result = await commishClient.patch<SingleResponse<User>>(
          `/users/${args.id}`,
          body
        );
        return successResult(result);
      } catch (error) {
        return errorResult(error);
      }
    },
  },
};
