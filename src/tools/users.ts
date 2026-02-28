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
      "List all sales reps and users in the Commish organization. Returns name, email, role (ae/sdr/manager/admin), assigned comp plan, status (active/inactive), and start date. Use when the user asks about team members, wants to find a rep's ID, or wants to see who is on the team.",
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
        const result = await commishClient.get<PaginatedResponse<User>>(
          "/users",
          { page: args.page, per_page: args.per_page }
        );
        return successResult(result);
      } catch (error) {
        return errorResult(error);
      }
    },
  },

  get_user: {
    description:
      "Get full details of a single user by ID. Returns name, email, role, assigned comp plan, status, and start date. Use when you need detailed information about a specific rep or user.",
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
      "Get commission history for a specific user/rep. Returns all commission records including deal name, ARR, commission amount, rate, accelerator applied, status (calculated/paid/pending), and period. Use when a user asks 'how much has [rep] earned?', 'show me [rep]'s commissions', or wants a rep's earnings history.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: {
          type: "string",
          description: "The unique user ID to get commissions for.",
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
      page?: number;
      per_page?: number;
    }): Promise<ToolResult> => {
      try {
        const result = await commishClient.get<PaginatedResponse<Commission>>(
          `/users/${args.id}/commissions`,
          { page: args.page, per_page: args.per_page }
        );
        return successResult(result);
      } catch (error) {
        return errorResult(error);
      }
    },
  },

  create_user: {
    description:
      "Create a new user/sales rep in Commish. Requires first name, last name, and email. Optionally assign a role and comp plan. Use when onboarding a new team member or adding a rep to the system.",
    inputSchema: {
      type: "object" as const,
      properties: {
        first_name: {
          type: "string",
          description: "User's first name.",
        },
        last_name: {
          type: "string",
          description: "User's last name.",
        },
        email: {
          type: "string",
          description:
            "User's email address. Must be unique within the organization.",
        },
        role: {
          type: "string",
          enum: ["ae", "sdr", "manager", "admin"],
          description:
            "User role. 'ae' = Account Executive, 'sdr' = Sales Development Rep, 'manager' = Sales Manager (can view/approve), 'admin' = Administrator (full access).",
        },
        comp_plan_id: {
          type: "string",
          description:
            "ID of the compensation plan to assign to this user immediately. Can be assigned later via assign_comp_plan.",
        },
        start_date: {
          type: "string",
          description:
            "User's start date in ISO 8601 format (YYYY-MM-DD). Used for quota proration and eligibility calculations.",
        },
      },
      required: ["first_name", "last_name", "email"],
    },
    handler: async (args: {
      first_name: string;
      last_name: string;
      email: string;
      role?: "ae" | "sdr" | "manager" | "admin";
      comp_plan_id?: string;
      start_date?: string;
    }): Promise<ToolResult> => {
      try {
        const body: CreateUserRequest = {
          first_name: args.first_name,
          last_name: args.last_name,
          email: args.email,
          role: args.role,
          comp_plan_id: args.comp_plan_id,
          start_date: args.start_date,
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
      "Update an existing user's information. Only provided fields will be changed. Use to update a rep's name, email, role, assigned comp plan, or status. Deactivate a user by setting status to 'inactive'.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: {
          type: "string",
          description: "The unique user ID to update.",
        },
        first_name: {
          type: "string",
          description: "Updated first name.",
        },
        last_name: {
          type: "string",
          description: "Updated last name.",
        },
        email: {
          type: "string",
          description: "Updated email address.",
        },
        role: {
          type: "string",
          enum: ["ae", "sdr", "manager", "admin"],
          description: "Updated role.",
        },
        comp_plan_id: {
          type: "string",
          description:
            "Updated comp plan ID. Use assign_comp_plan for effective-dated changes.",
        },
        status: {
          type: "string",
          enum: ["active", "inactive"],
          description:
            "Set to 'inactive' to deactivate a user who has left the team.",
        },
      },
      required: ["id"],
    },
    handler: async (args: {
      id: string;
      first_name?: string;
      last_name?: string;
      email?: string;
      role?: "ae" | "sdr" | "manager" | "admin";
      comp_plan_id?: string;
      status?: "active" | "inactive";
    }): Promise<ToolResult> => {
      try {
        const body: UpdateUserRequest = {
          first_name: args.first_name,
          last_name: args.last_name,
          email: args.email,
          role: args.role,
          comp_plan_id: args.comp_plan_id,
          status: args.status,
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
