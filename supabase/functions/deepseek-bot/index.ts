console.log(`Function "telegram-bot" up and running!`);

import { Bot, webhookCallback } from "https://deno.land/x/grammy@v1.8.3/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCalculateFood } from "./handle_calculate_food.ts";
import { handleGiftSuggestion } from "./handle_gift_suggestion.ts";

const bot = new Bot(Deno.env.get("DEEPSEEK_BOT_TOKEN") || "");

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_ANON_KEY") ?? "",
);

bot.on("message", async (ctx) => {
  const message = ctx.message?.text || "";

  if (ctx.message.chat.type === "private") {
    console.log("private message", ctx.message.chat.id);
    if (message === "/start") {
      console.log("start message");
      ctx.reply(
        'Привет! Я могу оценить рацион по питанию или помочь с выбором подарка. Напиши "Оцени рацион" или "Подскажи подарок".',
      );
    } else if (message.includes("Оцени рацион")) {
      console.log("calculate food message");
      const response = await handleCalculateFood(message);
      const sentMessage = await ctx.reply(response);
      // Store the relationship in Supabase
      await supabase
        .from("message_relationships")
        .insert({
          user_message_id: ctx.message.message_id,
          bot_message_id: sentMessage.message_id,
          chat_id: ctx.chat.id,
        });
    } else if (message.includes("Подскажи подарок")) {
      console.log("gift suggestion message");
      const response = await handleGiftSuggestion(message);
      const sentMessage = await ctx.reply(response);
      // Store the relationship in Supabase
      await supabase
        .from("message_relationships")
        .insert({
          user_message_id: ctx.message.message_id,
          bot_message_id: sentMessage.message_id,
          chat_id: ctx.chat.id,
        });
    }
  }
  if (ctx.message.chat.type === "supergroup") {
    console.log("group message", ctx.message.chat.id);
    if (message.includes("Оцени рацион")) {
      console.log("calculate food message in supergroup");
      const response = await handleCalculateFood(message);
      console.log("calculate food message in supergroup response");
      const sentMessage = await ctx.api.sendMessage(
        ctx.message.chat.id,
        response,
        {
          reply_to_message_id: ctx.message.message_id,
        },
      );
      console.log("calculate food message in supergroup sent message");
      // Store the relationship in Supabase
      await supabase
        .from("message_relationships")
        .insert({
          user_message_id: ctx.message.message_id,
          bot_message_id: sentMessage.message_id,
          chat_id: ctx.chat.id,
        });
    }
  }
});

bot.on("edited_message", async (ctx) => {
  const message = ctx.editedMessage?.text || "";
  console.log(
    "edited message",
    ctx.editedMessage?.chat.id,
    ctx.editedMessage?.chat.type,
  );

  if (ctx.editedMessage?.chat.type === "private") {
    if (message.includes("Оцени рацион")) {
      console.log("edited calculate food message in private");
      const response = await handleCalculateFood(message);
      console.log("edited calculate food message in private response");
      // Get the bot's message ID from Supabase
      const { data } = await supabase
        .from("message_relationships")
        .select("bot_message_id")
        .eq("user_message_id", ctx.editedMessage.message_id)
        .eq("chat_id", ctx.editedMessage.chat.id)
        .single();

      if (data?.bot_message_id) {
        await ctx.api.editMessageText(
          ctx.editedMessage.chat.id,
          data.bot_message_id,
          response,
        );
      }
    } else if (message.includes("Подскажи подарок")) {
      console.log("edited gift suggestion message in private");
      const response = await handleGiftSuggestion(message);
      console.log("edited gift suggestion message in private response");
      const { data } = await supabase
        .from("message_relationships")
        .select("bot_message_id")
        .eq("user_message_id", ctx.editedMessage.message_id)
        .eq("chat_id", ctx.editedMessage.chat.id)
        .single();

      if (data?.bot_message_id) {
        await ctx.api.editMessageText(
          ctx.editedMessage.chat.id,
          data.bot_message_id,
          response,
        );
      }
    }
  }
  if (ctx.editedMessage?.chat.type === "supergroup") {
    if (message.includes("Оцени рацион")) {
      console.log("edited calculate food message in supergroup");
      const response = await handleCalculateFood(message);
      console.log("edited calculate food message in supergroup response");
      const { data } = await supabase
        .from("message_relationships")
        .select("bot_message_id")
        .eq("user_message_id", ctx.editedMessage.message_id)
        .eq("chat_id", ctx.editedMessage.chat.id)
        .single();

      console.log("edited calculate food message in supergroup data", data);

      if (data?.bot_message_id) {
        await ctx.api.editMessageText(
          ctx.editedMessage.chat.id,
          data.bot_message_id,
          response,
        );
      }
    }
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
