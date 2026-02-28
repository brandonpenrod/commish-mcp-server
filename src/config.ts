export const config = {
  apiBaseUrl: process.env.COMMISH_API_URL || "https://app.getcommish.io/api/v1",
  apiKey: process.env.COMMISH_API_KEY || "",
  maxRetries: 3,
  retryBaseDelayMs: 1000,
};

export function validateConfig(): void {
  if (!config.apiKey) {
    console.error(
      "ERROR: COMMISH_API_KEY environment variable is required.\n" +
        "Get your API key from https://app.getcommish.io/admin/settings/api-keys\n" +
        "Then set it in your MCP client configuration."
    );
    process.exit(1);
  }
  if (
    !config.apiKey.startsWith("cm_live_") &&
    !config.apiKey.startsWith("cm_test_")
  ) {
    console.error(
      "ERROR: Invalid API key format. Keys should start with 'cm_live_' or 'cm_test_'."
    );
    process.exit(1);
  }
}
