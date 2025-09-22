console.log(`Function "multi-bot" up and running!`);

import { webhookCallback } from "https://deno.land/x/grammy@v1.8.3/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { BotFactory } from "./src/bot/botFactory.ts";
import { setupBotHandlers } from "./src/bot/messageHandler.ts";
import { getAllBotConfigs } from "./src/config/botConfig.ts";

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

// Initialize all bots
const botConfigs = getAllBotConfigs();
const bots = new Map();

for (const config of botConfigs) {
  if (config.token) {
    const bot = BotFactory.createBot(config);
    setupBotHandlers(bot, config, supabase);
    bots.set(config.id, { bot, config });
    console.log(`Initialized bot: ${config.id}`);
  } else {
    console.warn(`Skipping bot ${config.id} - no token provided`);
  }
}

// Function to determine which bot should handle the request
function determineBot(req: Request): string | null {
  const url = new URL(req.url);
  const path = url.pathname;

  // Extract bot ID from path (e.g., /deepseek or /production)
  const pathParts = path.split("/").filter((part) => part);
  if (pathParts.length > 0) {
    const botId = pathParts[0];
    if (bots.has(botId)) {
      return botId;
    }
  }

  // Fallback: try to determine by secret parameter
  const secret = url.searchParams.get("secret");
  if (secret) {
    for (const [botId, { config }] of bots) {
      if (config.secret === secret) {
        return botId;
      }
    }
  }

  return null;
}

// Create webhook handlers for each bot
const webhookHandlers = new Map();

for (const [botId, { bot, config }] of bots) {
  const handleUpdate = webhookCallback(bot, "std/http", "throw", 4 * 60 * 1000);
  webhookHandlers.set(botId, handleUpdate);
  console.log(`Created webhook handler for bot: ${config.id}`);
}

Deno.serve(async (req) => {
  try {
    const botId = determineBot(req);

    if (!botId) {
      console.log("No bot found for request");
      return new Response("Bot not found", { status: 404 });
    }

    const { config } = bots.get(botId)!;
    const url = new URL(req.url);

    // Verify secret for the specific bot
    if (url.searchParams.get("secret") !== config.secret) {
      console.log(`Invalid secret for bot ${botId}`);
      return new Response("not allowed", { status: 405 });
    }

    const handleUpdate = webhookHandlers.get(botId);
    if (!handleUpdate) {
      console.log(`No webhook handler found for bot ${botId}`);
      return new Response("Handler not found", { status: 500 });
    }

    console.log(`Processing request for bot: ${config.id} (${botId})`);
    return await handleUpdate(req);
  } catch (err) {
    console.error("Error in webhook handler:", err);
    return new Response("Internal server error", { status: 500 });
  }
});
