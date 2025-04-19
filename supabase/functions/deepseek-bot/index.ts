console.log(`Function "telegram-bot" up and running!`);

import { Bot, webhookCallback } from "https://deno.land/x/grammy@v1.8.3/mod.ts";
import { handleCalculateFood } from "./handle_calculate_food.ts";
import { handleGiftSuggestion } from "./handle_gift_suggestion.ts";

const bot = new Bot(Deno.env.get("DEEPSEEK_BOT_TOKEN") || "");

bot.on("message", async (ctx) => {
  const message = ctx.message?.text || "";

  if (message === "/start") {
    ctx.reply(
      'Привет! Я могу оценить рацион по питанию или помочь с выбором подарка. Напиши "Оцени рацион" или "Подскажи подарок".',
    );
  } else if (message.includes("Оцени рацион")) {
    const response = await handleCalculateFood(message);
    ctx.reply(response);
  } else if (message.includes("Подскажи подарок")) {
    const response = await handleGiftSuggestion(message);
    ctx.reply(response);
  }
});

/// set up the webhook and timout for the bot 4 minutes
const handleUpdate = webhookCallback(bot, "std/http", "throw", 4 * 60 * 1000);

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    if (
      url.searchParams.get("secret") !==
        Deno.env.get("DEEPSEEK_BOT_FUNCTION_SECRET")
    ) {
      return new Response("not allowed", { status: 405 });
    }

    return await handleUpdate(req);
  } catch (err) {
    console.error(err);
  }
});
