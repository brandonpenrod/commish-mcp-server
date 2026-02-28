import { dealTools } from "./deals.js";
import { compPlanTools } from "./comp-plans.js";
import { userTools } from "./users.js";
import { commissionTools } from "./commissions.js";
import { spiffTools } from "./spiffs.js";
import { webhookTools } from "./webhooks.js";

export const allTools = {
  ...dealTools,
  ...compPlanTools,
  ...userTools,
  ...commissionTools,
  ...spiffTools,
  ...webhookTools,
};

export type ToolName = keyof typeof allTools;
