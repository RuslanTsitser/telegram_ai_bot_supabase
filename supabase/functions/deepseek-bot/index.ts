console.log(`Function "telegram-bot" up and running!`);

import { Bot, webhookCallback } from "https://deno.land/x/grammy@v1.8.3/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleFoodImage } from "./src/ai/handleFoodImage.ts";
import {
  insertFoodAnalysis,
  upsertFoodAnalysis,
} from "./src/db/foodAnalysis.ts";
import {
  getBotMessageId,
  insertMessageRelationship,
} from "./src/db/messageRelationships.ts";
import { getSubscriptionPlans } from "./src/db/subscriptions.ts";
import { upsertUser } from "./src/db/upsertUser.ts";
import {
  createSubscriptionInvoice,
  handleTrialSubscription,
} from "./src/telegram/subscriptionHandlers.ts";
import { formatFoodAnalysisMessage } from "./src/utils/formatFoodAnalysisMessage.ts";
import { selectOptimalPhoto } from "./src/utils/selectOptimalPhoto.ts";

const bot = new Bot(Deno.env.get("DEEPSEEK_BOT_TOKEN") || "");

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

bot.on("message", async (ctx) => {
  const chatType = ctx.message.chat.type;
  console.log(`${chatType} message`, ctx.message.chat.id);

  // Обрабатываем пользователя при каждом сообщении
  await upsertUser(ctx, supabase);

  // Handle successful payment
  if (ctx.message.successful_payment) {
    console.log("successful_payment received");

    try {
      const payment = ctx.message.successful_payment;
      const payload = payment.invoice_payload;
      const [type, planId, userId] = payload.split("_");

      if (type !== "subscription") {
        console.error("Invalid payment type:", type);
        return;
      }

      // Получаем информацию о тарифе
      const { data: plan, error: planError } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("id", planId)
        .single();

      if (planError || !plan) {
        console.error("Plan not found:", planId);
        return;
      }

      // Получаем пользователя по telegram_user_id
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("telegram_user_id", parseInt(userId))
        .single();

      if (userError || !user) {
        console.error("User not found:", userId);
        return;
      }

      // Вычисляем дату окончания подписки
      const subscriptionEndDate = new Date();
      subscriptionEndDate.setDate(
        subscriptionEndDate.getDate() + plan.duration_days,
      );

      // Обновляем пользователя
      const { error: updateError } = await supabase
        .from("users")
        .update({
          premium_expires_at: subscriptionEndDate.toISOString(),
        })
        .eq("id", user.id);

      if (updateError) {
        console.error("Error updating user:", updateError);
        return;
      }

      // Создаем запись о платеже
      const { error: paymentError } = await supabase
        .from("payments")
        .insert({
          user_id: user.id, // используем uuid из users
          plan_id: planId,
          yookassa_payment_id: payment.telegram_payment_charge_id,
          amount: payment.total_amount / 100, // конвертируем из копеек
          currency: payment.currency,
          status: "succeeded",
        });

      if (paymentError) {
        console.error("Error creating payment record:", paymentError);
      }

      // Отправляем сообщение об успешной активации
      await ctx.reply(
        `🎉 Подписка "${plan.name}" успешно активирована!\n\n` +
          `Доступен до: ${
            subscriptionEndDate.toLocaleDateString("ru-RU")
          }\n\n` +
          `Теперь у вас есть полный доступ ко всем функциям!`,
      );

      console.log("Subscription activated for user:", userId, "plan:", planId);
      return;
    } catch (error) {
      console.error("Error in successful_payment:", error);
      return;
    }
  }

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
        "• Я оценю его питательную ценность\n\n" +
        "💳 Подписки:\n" +
        "• /subscriptions - посмотреть доступные тарифы";

      await ctx.reply(welcomeMessage);
      return;
    }

    if (message === "/subscriptions" && chatType === "private") {
      console.log("subscriptions command");

      const { data: plans, error } = await getSubscriptionPlans(supabase);

      if (error) {
        console.error("Error getting subscription plans:", error);
        await ctx.reply("❌ Ошибка при получении тарифов");
        return;
      }

      let subscriptionMessage = "💳 Доступные тарифы:\n\n";

      plans?.forEach((plan) => {
        const emoji = plan.price === 0 ? "🆓" : "💳";
        subscriptionMessage +=
          `${emoji} ${plan.name} (${plan.duration_days} дней) - ${plan.price}₽\n`;
        if (plan.description) {
          subscriptionMessage += `   ${plan.description}\n`;
        }
        subscriptionMessage += "\n";
      });

      // Создаем inline кнопки для каждого тарифа
      const keyboard = {
        inline_keyboard: plans?.map((plan) => [{
          text: plan.price === 0
            ? `🆓 Активировать ${plan.name}`
            : `💳 Купить ${plan.name}`,
          callback_data: `subscription_${plan.id}`,
        }]) || [],
      };

      await ctx.reply(subscriptionMessage, { reply_markup: keyboard });
      return;
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
        await insertMessageRelationship(supabase, {
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
        const { data: analysisData, error: analysisError } =
          await insertFoodAnalysis(supabase, {
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
        await insertMessageRelationship(supabase, {
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
        const { data: analysisData, error: analysisError } =
          await insertFoodAnalysis(supabase, {
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

// Обработчик для inline кнопок подписок
bot.on("callback_query", async (ctx) => {
  if (ctx.callbackQuery.data?.startsWith("subscription_")) {
    const planId = ctx.callbackQuery.data.replace("subscription_", "");

    // Получаем информацию о тарифе
    const { data: plan, error } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("id", planId)
      .single();

    if (error || !plan) {
      await ctx.answerCallbackQuery("❌ Ошибка при получении тарифа");
      return;
    }

    if (plan.price === 0) {
      // Логика для пробного периода
      await handleTrialSubscription(ctx, plan, supabase);
    } else {
      // Создаем invoice для платного тарифа
      await createSubscriptionInvoice(ctx, plan);
    }
  }
});

// Webhook для проверки перед оплатой
bot.on("pre_checkout_query", async (ctx) => {
  console.log("pre_checkout_query received");

  try {
    // Получаем данные из payload
    const payload = ctx.preCheckoutQuery.invoice_payload;
    const [type, planId, userId] = payload.split("_");

    if (type !== "subscription") {
      await ctx.answerPreCheckoutQuery(false, "Неверный тип платежа");
      return;
    }

    // Проверяем, что план существует и активен
    const { data: plan, error } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("id", planId)
      .eq("is_active", true)
      .single();

    if (error || !plan) {
      await ctx.answerPreCheckoutQuery(false, "Тариф не найден или неактивен");
      return;
    }

    // Проверяем, что пользователь существует
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("telegram_user_id", parseInt(userId))
      .single();

    if (userError || !user) {
      await ctx.answerPreCheckoutQuery(false, "Пользователь не найден");
      return;
    }

    // Подтверждаем возможность оплаты
    await ctx.answerPreCheckoutQuery(true);
    console.log("Pre-checkout approved for plan:", planId);
  } catch (error) {
    console.error("Error in pre_checkout_query:", error);
    await ctx.answerPreCheckoutQuery(false, "Ошибка при проверке платежа");
  }
});

bot.on("edited_message", async (ctx) => {
  const edited = ctx.editedMessage;
  if (!edited) return;

  // Обрабатываем пользователя при каждом сообщении
  await upsertUser(ctx, supabase);

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

    const { data } = await getBotMessageId(
      supabase,
      edited.message_id,
      chat.id,
    );

    if (data?.bot_message_id) {
      await ctx.api.editMessageText(
        chat.id,
        data.bot_message_id,
        messageText,
      );

      // Update or insert food analysis data
      if (!response.error) {
        const { data: analysisData, error: analysisError } =
          await upsertFoodAnalysis(supabase, {
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

    const { data } = await getBotMessageId(
      supabase,
      edited.message_id,
      chat.id,
    );

    if (data?.bot_message_id) {
      await ctx.api.editMessageText(
        chat.id,
        data.bot_message_id,
        messageText,
      );

      // Update or insert food analysis data
      if (!response.error) {
        const { data: analysisData, error: analysisError } =
          await upsertFoodAnalysis(supabase, {
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
