import { commishClient, CommishApiRequestError } from "../client.js";
import type {
  Webhook,
  WebhookEvent,
  CreateWebhookRequest,
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

export const webhookTools = {
  list_webhooks: {
    description:
      "List all configured webhooks for the Commish organization. Returns webhook URL, subscribed events, status (active/inactive), and creation date. Use when a user wants to see what integrations are set up or what systems are being notified of Commish events.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
    handler: async (_args: Record<string, never>): Promise<ToolResult> => {
      try {
        const result = await commishClient.get<Webhook[]>("/webhooks");
        return successResult(result);
      } catch (error) {
        return errorResult(error);
      }
    },
  },

  create_webhook: {
    description:
      "Create a new webhook to receive real-time notifications when events occur in Commish. Subscribe to deal events (created/approved/rejected), commission calculations, and SPIFF completions. Use when integrating Commish with Slack, Zapier, a CRM, or a custom backend system.",
    inputSchema: {
      type: "object" as const,
      properties: {
        url: {
          type: "string",
          description:
            "The HTTPS endpoint URL that will receive POST requests when events occur. Must be publicly accessible and return a 2xx response within 10 seconds.",
        },
        events: {
          type: "array",
          items: {
            type: "string",
            enum: [
              "deal.created",
              "deal.approved",
              "deal.rejected",
              "commission.calculated",
              "spiff.completed",
            ],
          },
          description:
            "Array of event types to subscribe to. Available events: 'deal.created' (new deal logged), 'deal.approved' (deal approved by admin), 'deal.rejected' (deal rejected), 'commission.calculated' (commission computed after deal approval), 'spiff.completed' (SPIFF program ended and payouts finalized).",
        },
      },
      required: ["url", "events"],
    },
    handler: async (args: {
      url: string;
      events: WebhookEvent[];
    }): Promise<ToolResult> => {
      try {
        const body: CreateWebhookRequest = {
          url: args.url,
          events: args.events,
        };
        const result = await commishClient.post<Webhook>("/webhooks", body);
        return successResult(result);
      } catch (error) {
        return errorResult(error);
      }
    },
  },

  delete_webhook: {
    description:
      "Delete a webhook endpoint. The endpoint will stop receiving event notifications immediately. Use when an integration is no longer needed or a webhook URL has changed.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: {
          type: "string",
          description: "The unique webhook ID to delete.",
        },
      },
      required: ["id"],
    },
    handler: async (args: { id: string }): Promise<ToolResult> => {
      try {
        await commishClient.delete<unknown>(`/webhooks/${args.id}`);
        return {
          content: [{ type: "text", text: "Webhook successfully deleted." }],
        };
      } catch (error) {
        return errorResult(error);
      }
    },
  },
};
