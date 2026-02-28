#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { config, validateConfig } from "./config.js";
import { allTools } from "./tools/index.js";

validateConfig();

const server = new Server(
  {
    name: "commish",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List tools handler — returns all tools with their raw JSON schema
server.setRequestHandler(ListToolsRequestSchema, async () => {
  const tools = Object.entries(allTools).map(([name, toolDef]) => ({
    name,
    description: toolDef.description,
    inputSchema: toolDef.inputSchema,
  }));

  return { tools };
});

// Call tool handler — dispatches to the appropriate tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const toolDef = allTools[name as keyof typeof allTools];

  if (!toolDef) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Unknown tool: ${name}. Available tools: ${Object.keys(allTools).join(", ")}`,
        },
      ],
      isError: true,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return await toolDef.handler((args ?? {}) as any);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`Commish MCP Server v1.0.0 started`);
  console.error(`Connected to: ${config.apiBaseUrl}`);
  console.error(`Tools registered: ${Object.keys(allTools).length}`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
