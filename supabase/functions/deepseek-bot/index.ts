console.log(`Function "telegram-bot" up and running!`);

import { Bot, webhookCallback } from "https://deno.land/x/grammy@v1.8.3/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  formatFoodAnalysisMessage,
  handleFoodImage,
} from "./handle_food_image.ts";
import { selectOptimalPhoto } from "./select_optimal_photo.ts";

const bot = new Bot(Deno.env.get("DEEPSEEK_BOT_TOKEN") || "");

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

bot.on("message", async (ctx) => {
  const chatType = ctx.message.chat.type;
  console.log(`${chatType} message`, ctx.message.chat.id);

  // Handle text messages
  if (ctx.message.text) {
    const message = ctx.message.text;

    if (message === "/start" && chatType === "private") {
      console.log("start message");
      const welcomeMessage = "👋 Привет! Я бот для анализа питания.\n\n" +
        "📝 Вот что я умею:\n\n" +
        "🍽 Анализ рациона:\n" +
        "• Я проанализирую питательную ценность и дам рекомендации\n\n" +
        "📸 Анализ фото еды:\n" +
        '• Отправьте фото блюда с подписью "Проанализируй изображение еды"\n' +
        "• Я оценю его питательную ценность";

      await ctx.reply(welcomeMessage);
    }
  }

  // Handle photo messages
  if (ctx.message.photo) {
    const caption = ctx.message.caption || "";
    // Выбираем PhotoSize с разрешением близким к 320×320
    const photoSizes = ctx.message.photo.map((p) => ({
      file_id: p.file_id,
      width: p.width,
      height: p.height,
    }));
    const optimalPhoto = selectOptimalPhoto(photoSizes);

    console.log("received food photo for analysis", chatType);
    const response = await handleFoodImage(
      optimalPhoto.file_id,
      caption,
      Deno.env.get("DEEPSEEK_BOT_TOKEN") || "",
    );

    const messageText = formatFoodAnalysisMessage(response);

    let sentMessage;
    if (chatType === "private") {
      sentMessage = await ctx.reply(messageText);
    }

    console.log("sentMessage food image", sentMessage);

    // Store the relationship in Supabase
    if (sentMessage) {
      // Store message relationship
      const { data: relationshipData, error: relationshipError } =
        await supabase
          .from("message_relationships")
          .insert({
            user_message_id: ctx.message.message_id,
            bot_message_id: sentMessage.message_id,
            chat_id: ctx.chat.id,
          });

      console.log(
        "message_relationships food image",
        relationshipData,
        relationshipError,
      );

      // Store food analysis data
      if (!response.error) {
        const { data: analysisData, error: analysisError } = await supabase
          .from("food_analysis")
          .insert({
            chat_id: ctx.chat.id,
            user_id: ctx.from.id,
            message_id: ctx.message.message_id,
            description: response.description,
            mass: response.mass,
            calories: response.calories,
            protein: response.protein,
            carbs: response.carbs,
            sugar: response.sugar,
            fats: response.fats,
            saturated_fats: response.saturated_fats,
            fiber: response.fiber,
            nutrition_score: response.nutrition_score,
            recommendation: response.recommendation,
            has_image: true,
            image_file_id: optimalPhoto.file_id,
            user_text: caption,
          });

        console.log("food_analysis", analysisData, analysisError);
      }
    }
  }

  // Handle text messages for food analysis (без фотографии)
  if (ctx.message.text) {
    console.log("received food text for analysis", chatType);
    const response = await handleFoodImage(
      null,
      ctx.message.text,
      Deno.env.get("DEEPSEEK_BOT_TOKEN") || "",
    );

    const messageText = formatFoodAnalysisMessage(response);

    let sentMessage;
    if (chatType === "private") {
      sentMessage = await ctx.reply(messageText);
    }

    console.log("sentMessage food text", sentMessage);

    // Store the relationship in Supabase
    if (sentMessage) {
      // Store message relationship
      const { data: relationshipData, error: relationshipError } =
        await supabase
          .from("message_relationships")
          .insert({
            user_message_id: ctx.message.message_id,
            bot_message_id: sentMessage.message_id,
            chat_id: ctx.chat.id,
          });

      console.log(
        "message_relationships food text",
        relationshipData,
        relationshipError,
      );

      // Store food analysis data
      if (!response.error) {
        const { data: analysisData, error: analysisError } = await supabase
          .from("food_analysis")
          .insert({
            chat_id: ctx.chat.id,
            user_id: ctx.from.id,
            message_id: ctx.message.message_id,
            description: response.description,
            mass: response.mass,
            calories: response.calories,
            protein: response.protein,
            carbs: response.carbs,
            sugar: response.sugar,
            fats: response.fats,
            saturated_fats: response.saturated_fats,
            fiber: response.fiber,
            nutrition_score: response.nutrition_score,
            recommendation: response.recommendation,
            has_image: false,
            user_text: ctx.message.text,
          });

        console.log("food_analysis", analysisData, analysisError);
      }
    }
  }
});

bot.on("edited_message", async (ctx) => {
  const edited = ctx.editedMessage;
  if (!edited) return;

  const message = edited.text || "";
  const chat = edited.chat;
  const chatType = chat.type;
  console.log("edited message", chat.id, chatType);

  // Handle edited photo caption
  if (edited.photo) {
    const caption = edited.caption || "";
    // Снова выбираем оптимальное разрешение
    const photoSizes = edited.photo.map((p) => ({
      file_id: p.file_id,
      width: p.width,
      height: p.height,
    }));
    const optimalPhoto = selectOptimalPhoto(photoSizes);

    console.log(`edited food photo caption in ${chatType}`);
    const response = await handleFoodImage(
      optimalPhoto.file_id,
      caption,
      Deno.env.get("DEEPSEEK_BOT_TOKEN") || "",
    );

    const messageText = formatFoodAnalysisMessage(response);

    const { data } = await supabase
      .from("message_relationships")
      .select("bot_message_id")
      .eq("user_message_id", edited.message_id)
      .eq("chat_id", chat.id)
      .single();

    if (data?.bot_message_id) {
      await ctx.api.editMessageText(
        chat.id,
        data.bot_message_id,
        messageText,
      );

      // Update or insert food analysis data
      if (!response.error) {
        const { data: analysisData, error: analysisError } = await supabase
          .from("food_analysis")
          .upsert({
            chat_id: chat.id,
            user_id: edited.from.id,
            message_id: edited.message_id,
            description: response.description,
            mass: response.mass,
            calories: response.calories,
            protein: response.protein,
            carbs: response.carbs,
            sugar: response.sugar,
            fats: response.fats,
            saturated_fats: response.saturated_fats,
            fiber: response.fiber,
            nutrition_score: response.nutrition_score,
            recommendation: response.recommendation,
            image_file_id: optimalPhoto.file_id,
            user_text: caption,
            has_image: true,
          }, {
            onConflict: "message_id,chat_id",
          });

        console.log("upserted food_analysis", analysisData, analysisError);
      }
    }
  } else {
    console.log(`edited food analysis message in ${chatType}`);
    const response = await handleFoodImage(
      null,
      message,
      Deno.env.get("DEEPSEEK_BOT_TOKEN") || "",
    );

    const messageText = formatFoodAnalysisMessage(response);

    const { data } = await supabase
      .from("message_relationships")
      .select("bot_message_id")
      .eq("user_message_id", edited.message_id)
      .eq("chat_id", chat.id)
      .single();

    if (data?.bot_message_id) {
      await ctx.api.editMessageText(
        chat.id,
        data.bot_message_id,
        messageText,
      );

      // Update or insert food analysis data
      if (!response.error) {
        const { data: analysisData, error: analysisError } = await supabase
          .from("food_analysis")
          .upsert({
            chat_id: chat.id,
            user_id: edited.from.id,
            message_id: edited.message_id,
            description: response.description,
            mass: response.mass,
            calories: response.calories,
            protein: response.protein,
            carbs: response.carbs,
            sugar: response.sugar,
            fats: response.fats,
            saturated_fats: response.saturated_fats,
            fiber: response.fiber,
            nutrition_score: response.nutrition_score,
            recommendation: response.recommendation,
            user_text: message,
            has_image: false,
          }, {
            onConflict: "message_id,chat_id",
          });

        console.log("upserted food_analysis", analysisData, analysisError);
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
