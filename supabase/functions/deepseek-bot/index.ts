console.log(`Function "telegram-bot" up and running!`);

import { Bot, webhookCallback } from "https://deno.land/x/grammy@v1.8.3/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCalculateFood } from "./handle_calculate_food.ts";
import { handleFoodImage } from "./handle_food_image.ts";

const bot = new Bot(Deno.env.get("DEEPSEEK_BOT_TOKEN") || "");

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_ANON_KEY") ?? "",
);

bot.on("message:text", async (ctx) => {
  const message = ctx.message?.text || "";

  if (ctx.message.chat.type === "private") {
    console.log("private message", ctx.message.chat.id);
    if (message === "/start") {
      console.log("start message");
      ctx.reply(
        "👋 Привет! Я бот для анализа питания и подбора подарков.\n\n" +
          "📝 Вот что я умею:\n\n" +
          "🍽 Анализ рациона:\n" +
          '• Напишите "Оцени рацион" и опишите, что вы ели\n' +
          "• Я проанализирую питательную ценность и дам рекомендации\n\n" +
          "📸 Анализ фото еды:\n" +
          '• Отправьте фото блюда с подписью "Проанализируй изображение еды"\n' +
          "• Я оценю его питательную ценность\n\n" +
          "🎁 Подбор подарков:\n" +
          '• Напишите "Подскажи подарок" и опишите, кому ищете подарок\n' +
          "• Я предложу несколько вариантов с учетом ваших пожеланий\n\n" +
          "❓ Если у вас есть вопросы, просто напишите их мне!",
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

// Add photo message handler
bot.on("message:photo", async (ctx) => {
  const caption = ctx.message.caption || "";

  if (caption.includes("Проанализируй изображение еды")) {
    console.log("received food photo for analysis", ctx.message.chat.type);
    const photo = ctx.message.photo[ctx.message.photo.length - 1]; // Get the highest quality photo
    const response = await handleFoodImage(
      photo.file_id,
      Deno.env.get("DEEPSEEK_BOT_TOKEN") || "",
    );

    if (ctx.message.chat.type === "private") {
      const sentMessage = await ctx.reply(response);
      // Store the relationship in Supabase
      await supabase
        .from("message_relationships")
        .insert({
          user_message_id: ctx.message.message_id,
          bot_message_id: sentMessage.message_id,
          chat_id: ctx.chat.id,
        });
    } else if (ctx.message.chat.type === "supergroup") {
      const sentMessage = await ctx.api.sendMessage(
        ctx.message.chat.id,
        response,
        {
          reply_to_message_id: ctx.message.message_id,
        },
      );
      // Store the relationship in Supabase
      await supabase
        .from("message_relationships")
        .insert({
          user_message_id: ctx.message.message_id,
          bot_message_id: sentMessage.message_id,
          chat_id: ctx.chat.id,
        });
    }
  } else if (ctx.message.chat.type === "private") {
    await ctx.reply(
      'Пожалуйста, добавьте подпись "Проанализируй изображение еды" к фотографии для её анализа.',
    );
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
