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
import { processSuccessfulPayment } from "./src/db/processSuccessfulPayment.ts";
import {
  getSubscriptionPlanById,
  getSubscriptionPlans,
} from "./src/db/subscriptions.ts";
import { getUserByTelegramId, upsertUser } from "./src/db/upsertUser.ts";
import { checkUserLimits } from "./src/db/userLimits.ts";
import {
  FoodAnalysisData,
  MessageRelationship,
} from "./src/interfaces/Database.ts";
import {
  createSubscriptionInvoice,
  handleTrialSubscription,
} from "./src/telegram/subscriptionHandlers.ts";
import { formatWithDeclension } from "./src/utils/declension.ts";
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

    const result = await processSuccessfulPayment(
      ctx.message.successful_payment,
      supabase,
    );

    if (result.success) {
      // Отправляем сообщение об успешной активации
      await ctx.reply(
        `🎉 Подписка "${result.planName}" успешно активирована!\n\n` +
          `Доступен до: ${
            result.subscriptionEndDate!.toLocaleDateString("ru-RU")
          }\n\n` +
          `Теперь у вас есть полный доступ ко всем функциям!`,
      );

      const payload = ctx.message.successful_payment.invoice_payload;
      const [, planId, userId] = payload.split("_");
      console.log("Subscription activated for user:", userId, "plan:", planId);
    } else {
      console.error("Error processing payment:", result.error);
      await ctx.reply("❌ Произошла ошибка при обработке платежа");
    }
    return;
  }

  // Handle text messages
  if (ctx.message.text) {
    const message = ctx.message.text;

    if (message === "/start" && chatType === "private") {
      console.log("start message");

      // Проверяем статус пользователя для персонализированного сообщения
      const userLimits = await checkUserLimits(ctx.from.id, supabase);

      let welcomeMessage = "👋 Привет! Я бот для анализа питания.\n\n" +
        "📝 Вот что я умею:\n\n" +
        "🍽 Анализ рациона по тексту:\n" +
        "• Опишите блюдо текстом\n" +
        "• Я проанализирую питательную ценность и дам рекомендации\n\n";

      if (userLimits.isPremium) {
        welcomeMessage += "📸 Анализ фото еды:\n" +
          "• Отправьте фото блюда\n" +
          "• Я оценю его питательную ценность\n\n" +
          "✅ У вас премиум доступ - без ограничений!\n\n";
      } else {
        welcomeMessage += "📊 Лимиты для бесплатных пользователей:\n" +
          "• Текстовый анализ: 5 раз в день\n" +
          "• Анализ изображений: только для премиум\n\n" +
          `📈 Осталось анализов сегодня: ${userLimits.dailyTextAnalysesLeft}\n\n`;
      }

      welcomeMessage += "💳 Команды:\n" +
        "• /subscriptions - посмотреть доступные тарифы\n" +
        "• /limits - проверить текущие лимиты";

      await ctx.reply(welcomeMessage);
      return;
    }

    if (message === "/subscriptions" && chatType === "private") {
      console.log("subscriptions command");

      const plans = await getSubscriptionPlans(supabase);

      if (!plans) {
        await ctx.reply("❌ Ошибка при получении тарифов");
        return;
      }

      let subscriptionMessage = "💳 Доступные тарифы:\n\n";

      plans?.forEach((plan) => {
        const emoji = plan.price === 0 ? "🆓" : "💳";
        subscriptionMessage += `${emoji} ${plan.name} (${
          formatWithDeclension(plan.duration_days, ["день", "дня", "дней"])
        }) - ${plan.price}₽\n`;
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

    if (message === "/limits" && chatType === "private") {
      console.log("limits command");

      const userLimits = await checkUserLimits(ctx.from.id, supabase);

      let limitsMessage = "📊 Ваши текущие лимиты:\n\n";

      if (userLimits.isPremium) {
        limitsMessage += "✅ Премиум статус активен\n" +
          "🎉 Безлимитный доступ ко всем функциям:\n" +
          "• Анализ по тексту: без ограничений\n" +
          "• Анализ по изображениям: без ограничений\n\n";
      } else {
        limitsMessage += "🆓 Бесплатный аккаунт\n" +
          "📝 Доступные функции:\n" +
          "• Анализ по тексту: " + (userLimits.dailyTextAnalysesLeft > 0
            ? `${userLimits.dailyTextAnalysesLeft} из 5 в день`
            : "лимит исчерпан") +
          "\n" +
          "• Анализ по изображениям: только для премиум\n\n" +
          "💎 Оформите подписку командой /subscriptions для получения полного доступа";
      }

      await ctx.reply(limitsMessage);
      return;
    }
  }

  // Handle photo messages
  if (ctx.message.photo) {
    // Проверяем лимиты пользователя
    const userLimits = await checkUserLimits(ctx.from.id, supabase);

    if (!userLimits.canAnalyzeImage) {
      if (!userLimits.isPremium) {
        await ctx.reply(
          "🚫 Анализ изображений доступен только премиум пользователям!\n\n" +
            "💎 Оформите подписку командой /subscriptions для получения полного доступа ко всем функциям.",
        );
        return;
      } else {
        await ctx.reply("❌ Произошла ошибка при проверке доступа");
        return;
      }
    }

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
      const relationship: MessageRelationship = {
        user_message_id: ctx.message.message_id,
        bot_message_id: sentMessage.message_id,
        chat_id: ctx.chat.id,
      };
      const { data, error } = await insertMessageRelationship(
        supabase,
        relationship,
      );

      console.log(
        "message_relationships food image",
        data,
        error,
      );

      // Store food analysis data
      if (!response.error) {
        const foodAnalysisData: FoodAnalysisData = {
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
        };
        await insertFoodAnalysis(
          supabase,
          foodAnalysisData,
        );
      }
    }
  }

  // Handle text messages for food analysis (без фотографии)
  if (ctx.message.text && !ctx.message.text.startsWith("/")) {
    // Проверяем лимиты пользователя
    const userLimits = await checkUserLimits(ctx.from.id, supabase);

    if (!userLimits.canAnalyzeText) {
      if (!userLimits.isPremium) {
        await ctx.reply(
          `🚫 Достигнут дневной лимит анализов!\n\n` +
            `📊 Осталось анализов сегодня: ${userLimits.dailyTextAnalysesLeft}\n\n` +
            `💎 Оформите подписку командой /subscriptions для получения безлимитного доступа.`,
        );
        return;
      } else {
        await ctx.reply("❌ Произошла ошибка при проверке доступа");
        return;
      }
    }

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

      // Добавляем информацию о лимитах для бесплатных пользователей
      if (!userLimits.isPremium && userLimits.dailyTextAnalysesLeft > 0) {
        await ctx.reply(
          `📊 Осталось анализов сегодня: ${userLimits.dailyTextAnalysesLeft}\n\n` +
            `💎 Оформите подписку командой /subscriptions для безлимитного доступа!`,
        );
      }
    }

    console.log("sentMessage food text", sentMessage);

    // Store the relationship in Supabase
    if (sentMessage) {
      // Store message relationship
      const relationship: MessageRelationship = {
        user_message_id: ctx.message.message_id,
        bot_message_id: sentMessage.message_id,
        chat_id: ctx.chat.id,
      };
      const { data, error } = await insertMessageRelationship(
        supabase,
        relationship,
      );

      console.log(
        "message_relationships food text",
        data,
        error,
      );

      // Store food analysis data
      if (!response.error) {
        const foodAnalysisData: FoodAnalysisData = {
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
        };
        await insertFoodAnalysis(
          supabase,
          foodAnalysisData,
        );
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
    const plan = await getSubscriptionPlanById(supabase, planId);

    if (!plan) {
      await ctx.answerPreCheckoutQuery(false, "Тариф не найден или неактивен");
      return;
    }

    // Проверяем, что пользователь существует
    const user = await getUserByTelegramId(supabase, parseInt(userId));

    if (!user) {
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

    const response = await handleFoodImage(
      optimalPhoto.file_id,
      caption,
      Deno.env.get("DEEPSEEK_BOT_TOKEN") || "",
    );

    const messageText = formatFoodAnalysisMessage(response);

    const { data } = await getBotMessageId(
      supabase,
      edited.message_id,
      edited.chat.id,
    );

    if (data?.bot_message_id) {
      await ctx.api.editMessageText(
        edited.chat.id,
        data.bot_message_id,
        messageText,
      );

      // Update or insert food analysis data
      if (!response.error) {
        const foodAnalysisData: FoodAnalysisData = {
          chat_id: edited.chat.id,
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
        };

        await upsertFoodAnalysis(supabase, foodAnalysisData);
      }
    }
  } else {
    const response = await handleFoodImage(
      null,
      edited.text || "",
      Deno.env.get("DEEPSEEK_BOT_TOKEN") || "",
    );

    const messageText = formatFoodAnalysisMessage(response);

    const { data } = await getBotMessageId(
      supabase,
      edited.message_id,
      edited.chat.id,
    );

    if (data?.bot_message_id) {
      await ctx.api.editMessageText(
        edited.chat.id,
        data.bot_message_id,
        messageText,
      );

      // Update or insert food analysis data
      if (!response.error) {
        const foodAnalysisData: FoodAnalysisData = {
          chat_id: edited.chat.id,
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
          user_text: edited.text || "",
          has_image: false,
        };
        await upsertFoodAnalysis(
          supabase,
          foodAnalysisData,
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
