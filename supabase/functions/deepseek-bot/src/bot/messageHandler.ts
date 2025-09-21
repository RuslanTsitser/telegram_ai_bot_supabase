import { Bot } from "https://deno.land/x/grammy@v1.8.3/mod.ts";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleFoodImage } from "../ai/handleFoodImage.ts";
import { BotConfig } from "../config/botConfig.ts";
import { insertFoodAnalysis, upsertFoodAnalysis } from "../db/foodAnalysis.ts";
import {
  getBotMessageId,
  insertMessageRelationship,
} from "../db/messageRelationships.ts";
import { processSuccessfulPayment } from "../db/processSuccessfulPayment.ts";
import {
  getSubscriptionPlanById,
  getSubscriptionPlans,
} from "../db/subscriptions.ts";
import { getUserByTelegramId, upsertUser } from "../db/upsertUser.ts";
import { checkUserLimits } from "../db/userLimits.ts";
import {
  getUserCalculations,
  getUserProfile,
  upsertUserProfile,
} from "../db/userProfile.ts";
import {
  deleteUserSession,
  getUserSession,
  upsertUserSession,
} from "../db/userSessions.ts";
import {
  FoodAnalysisData,
  MessageRelationship,
} from "../interfaces/Database.ts";
import {
  createSubscriptionInvoice,
  handleTrialSubscription,
} from "../telegram/subscriptionHandlers.ts";
import { formatFoodAnalysisMessage } from "../utils/formatFoodAnalysisMessage.ts";
import { selectOptimalPhoto } from "../utils/selectOptimalPhoto.ts";
import { onboarding } from "./onboarding.ts";

export function setupBotHandlers(
  bot: Bot,
  config: BotConfig,
  supabase: SupabaseClient,
) {
  bot.on("message", async (ctx) => {
    const chatType = ctx.message.chat.type;
    console.log(`${config.id} - ${chatType} message`, ctx.message.chat.id);

    // Обрабатываем пользователя при каждом сообщении
    await upsertUser(ctx, supabase);

    const userSession = await getUserSession(supabase, ctx.from.id);

    if (userSession) {
      if (ctx.message.text === "/cancel") {
        await deleteUserSession(supabase, ctx.from.id);
        return;
      }
      const userProfile = await getUserProfile(supabase, ctx.from.id);
      if (!userProfile) {
        await upsertUserProfile(supabase, ctx.from.id, {
          height_cm: 178,
          weight_kg: 80,
          target_weight_kg: 78,
          gender: 0,
          birth_year: 1996,
          activity_level: 1,
        });
      }
      if (userSession.current_state === "waiting_for_height") {
        if (ctx.message.text && !isNaN(Number(ctx.message.text))) {
          await upsertUserProfile(
            supabase,
            ctx.from.id,
            { height_cm: Number(ctx.message.text) },
          );
          await upsertUserSession(
            supabase,
            ctx.from.id,
            "waiting_for_weight",
          );
          await ctx.reply("⚖️ Теперь введите ваш вес в килограммах");
        } else {
          await ctx.reply(
            "📏 Пожалуйста, введите ваш рост в сантиметрах или введите /cancel для отмены",
          );
        }
      } else if (userSession.current_state === "waiting_for_weight") {
        if (ctx.message.text && !isNaN(Number(ctx.message.text))) {
          await upsertUserProfile(supabase, ctx.from.id, {
            weight_kg: Number(ctx.message.text),
          });
          await upsertUserSession(
            supabase,
            ctx.from.id,
            "waiting_for_target_weight",
          );
          await ctx.reply("🎯 Теперь введите вашу цель в килограммах");
        } else {
          await ctx.reply(
            "⚖️ Пожалуйста, введите ваш вес в килограммах или введите /cancel для отмены",
          );
        }
      } else if (userSession.current_state === "waiting_for_target_weight") {
        if (ctx.message.text && !isNaN(Number(ctx.message.text))) {
          await upsertUserProfile(supabase, ctx.from.id, {
            target_weight_kg: Number(ctx.message.text),
          });
          await upsertUserSession(supabase, ctx.from.id, "waiting_for_gender");
          await ctx.reply("👥 Теперь укажите ваш пол (М или Ж)");
        } else {
          await ctx.reply(
            "🎯 Пожалуйста, введите вашу цель в килограммах или введите /cancel для отмены",
          );
        }
      } else if (userSession.current_state === "waiting_for_gender") {
        if (ctx.message.text === "М" || ctx.message.text === "Ж") {
          await upsertUserProfile(supabase, ctx.from.id, {
            gender: ctx.message.text === "М" ? 0 : 1,
          });
          await upsertUserSession(supabase, ctx.from.id, "waiting_for_age");
          await ctx.reply("Теперь укажите ваш год рождения (например, 1996)");
        } else {
          await ctx.reply(
            "👥 Пожалуйста, укажите ваш пол (М или Ж) или введите /cancel для отмены",
          );
        }
      } else if (userSession.current_state === "waiting_for_age") {
        if (ctx.message.text && !isNaN(Number(ctx.message.text))) {
          await upsertUserProfile(supabase, ctx.from.id, {
            birth_year: Number(ctx.message.text),
          });
          await upsertUserSession(
            supabase,
            ctx.from.id,
            "waiting_for_activity_level",
          );
          await ctx.reply(`📏 Теперь укажите ваш уровень активности
0 - Низкая активность, сидячий образ жизни
1 - Легкая активность, прогулки, 1-3 тренировки в неделю
2 - Средняя активность, 3-5 тренировок в неделю
3 - Высокая активность, ежедневные тренировки
4 - Очень высокая активность, интенсивные ежедневные тренировки`);
        } else {
          await ctx.reply(
            "📅 Пожалуйста, укажите ваш год рождения (например, 1996) или введите /cancel для отмены",
          );
        }
      } else if (userSession.current_state === "waiting_for_activity_level") {
        if (
          ctx.message.text && !isNaN(Number(ctx.message.text)) &&
          Number(ctx.message.text) >= 0 && Number(ctx.message.text) <= 4
        ) {
          await upsertUserProfile(supabase, ctx.from.id, {
            activity_level: Number(ctx.message.text),
          });
          await deleteUserSession(supabase, ctx.from.id);
          const calculations = await getUserCalculations(supabase, ctx.from.id);
          await ctx.reply(`👤 Профиль успешно сохранен
Рост: ${userProfile?.height_cm} см
Вес: ${userProfile?.weight_kg} кг
Целевой вес: ${userProfile?.target_weight_kg} кг
Пол: ${userProfile?.gender === 0 ? "Мужской" : "Женский"}
Год рождения: ${userProfile?.birth_year}
Уровень активности: ${userProfile?.activity_level}

Индекс массы тела: ${calculations?.bmi}
Цель по калориям: ${calculations?.target_calories}
Цель по белкам: ${calculations?.target_protein_g} г
Цель по жирам: ${calculations?.target_fats_g} г
Цель по углеводам: ${calculations?.target_carbs_g} г

Вы можете изменить профиль с помощью команды /set_profile
Или в настройках профиля (кнопка Stats), вкладка "Профиль"`);
        } else {
          await ctx.reply(
            "💪 Пожалуйста, укажите ваш уровень активности (0-4) или введите /cancel для отмены",
          );
        }
      }
      return;
    }

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
        console.log(
          "Subscription activated for user:",
          userId,
          "plan:",
          planId,
        );
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

        await onboarding(ctx);

        return;
      }

      if (message === "/set_profile" && chatType === "private") {
        console.log("set_profile command");
        await ctx.reply(
          "📏 Введите ваш рост в сантиметрах или введите /cancel для отмены",
        );
        await upsertUserSession(supabase, ctx.from.id, "waiting_for_height");
        return;
      }

      if (message === "/get_profile" && chatType === "private") {
        console.log("stats command");
        const userProfile = await getUserProfile(supabase, ctx.from.id);
        const calculations = await getUserCalculations(supabase, ctx.from.id);
        await ctx.reply(
          `
📏 Рост: ${userProfile?.height_cm} см
⚖️ Вес: ${userProfile?.weight_kg} кг
🎯 Целевой вес: ${userProfile?.target_weight_kg} кг
👥 Пол: ${userProfile?.gender === 0 ? "Мужской" : "Женский"}
📅 Год рождения: ${userProfile?.birth_year}
💪 Уровень активности: ${userProfile?.activity_level}

📊 Индекс массы тела: ${calculations?.bmi}
🎯 Цель по калориям: ${calculations?.target_calories}
🥩 Цель по белкам: ${calculations?.target_protein_g} г
🥑 Цель по жирам: ${calculations?.target_fats_g} г
🍚 Цель по углеводам: ${calculations?.target_carbs_g} г
`,
        );

        return;
      }

      if (message === "/help" && chatType === "private") {
        console.log("help command");
        await onboarding(ctx);
        return;
      }

      if (
        (message === "/subscriptions" || message === "/subscriptions_test") &&
        chatType === "private"
      ) {
        console.log("subscriptions command");
        const inTest = message === "/subscriptions_test";

        const plans = await getSubscriptionPlans(supabase);

        if (!plans) {
          await ctx.reply("❌ Ошибка при получении тарифов");
          return;
        }

        const subscriptionMessage = "💳 Доступные тарифы:\n\n";

        // Создаем inline кнопки для каждого тарифа
        const keyboard = {
          inline_keyboard: plans?.map((plan) => [{
            text: plan.price === 0
              ? `🆓 Активировать ${plan.name}`
              : `💳 Купить ${plan.name} за ${plan.price}₽`,
            callback_data: inTest
              ? `subscription_test_${plan.id}`
              : `subscription_${plan.id}`,
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
      if (ctx.message.caption === "file_id" && chatType === "private") {
        const fileId = ctx.message.photo[0].file_id;
        await ctx.reply(fileId);
        return;
      }

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
        config.token,
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
        config.token,
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
    if (
      ctx.callbackQuery.data?.startsWith("subscription_") ||
      ctx.callbackQuery.data?.startsWith("subscription_test_")
    ) {
      let planId: string;
      let inTest = false;

      if (ctx.callbackQuery.data.startsWith("subscription_test_")) {
        planId = ctx.callbackQuery.data.replace("subscription_test_", "");
        inTest = true;
      } else {
        planId = ctx.callbackQuery.data.replace("subscription_", "");
        inTest = false;
      }

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
        await createSubscriptionInvoice(ctx, plan, inTest, config);
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
        await ctx.answerPreCheckoutQuery(
          false,
          "Тариф не найден или неактивен",
        );
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

  // Обработчик для редактированных сообщений
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
        config.token,
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
    } else if (edited.text) {
      const response = await handleFoodImage(
        null,
        edited.text || "",
        config.token,
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
}
