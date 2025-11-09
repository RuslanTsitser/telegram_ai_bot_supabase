import { Bot } from "https://deno.land/x/grammy@v1.8.3/mod.ts";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleFoodImage } from "../ai/handleFoodImage.ts";
import { BotConfig } from "../config/botConfig.ts";
import { updateUserStreaks, upsertFoodAnalysis } from "../db/foodAnalysis.ts";
import { getBotMessageId } from "../db/messageRelationships.ts";
import { upsertPhysicalActivity } from "../db/physicalActivity.ts";
import { processSuccessfulPayment } from "../db/processSuccessfulPayment.ts";
import { getSubscriptionPlanById } from "../db/subscriptions.ts";
import {
  getUserByTelegramId,
  getUserLanguage,
  updateUserLanguage,
  upsertUser,
} from "../db/upsertUser.ts";
import { getUserProfile } from "../db/userProfile.ts";
import { insertWaterIntake } from "../db/waterIntake.ts";
import {
  FoodAnalysisData,
  PhysicalActivityData,
} from "../interfaces/Database.ts";
import { getImageUrlFromTelegram } from "../telegram/getImageUrlFromTelegram.ts";
import {
  createSubscriptionInvoice,
  handleTrialSubscription,
} from "../telegram/subscriptionHandlers.ts";
import { logEvent } from "../utils/analytics.ts";
import { formatFoodAnalysisMessage } from "../utils/formatFoodAnalysisMessage.ts";
import { createI18n } from "../utils/i18n.ts";
import { selectOptimalPhoto } from "../utils/selectOptimalPhoto.ts";
import { handleCommand } from "./handleCommands.ts";
import { handleFoodImageAnalysis } from "./handleFoodImageAnalysis.ts";
import { handleFoodTextAnalysis } from "./handleFoodTextAnalysis.ts";
import { handleSupportDiscussionMessage } from "./handleSupportDiscussionMessages.ts";
import { handleUserSession } from "./handleUserSessions.ts";

// helper вынесен в ../telegram/subscriptionHandlers.ts

export function setupBotHandlers(
  bot: Bot,
  config: BotConfig,
  supabase: SupabaseClient,
) {
  // ============================================================================
  // ОБРАБОТЧИК ОБЫЧНЫХ СООБЩЕНИЙ
  // ============================================================================
  bot.on("message", async (ctx) => {
    const chatType = ctx.message.chat.type;
    const chatId = ctx.message.chat.id;
    // message_thread_id доступен для форумов (групп с тредами)
    const messageThreadId = "message_thread_id" in ctx.message
      ? (ctx.message as { message_thread_id?: number }).message_thread_id
      : undefined;
    const fromId = ctx.from?.id;
    const fromUsername = ctx.from?.username;

    // Логирование для всех типов чатов
    if (chatType === "private") {
      console.log(
        `${config.id} - [PRIVATE] chat_id: ${chatId}, user_id: ${fromId}, username: @${
          fromUsername || "none"
        }`,
      );
    } else {
      // Подробное логирование для групп и каналов
      const isSupportChannel = config.supportChannelId === chatId;
      const isDiscussionGroup = config.supportDiscussionGroupId === chatId;
      const replyToMessageId = ctx.message.reply_to_message?.message_id;

      let logPrefix = "[GROUP/CHANNEL]";
      if (isSupportChannel) {
        logPrefix = "[SUPPORT_CHANNEL]";
      } else if (isDiscussionGroup) {
        logPrefix = "[SUPPORT_DISCUSSION_GROUP]";
      }

      console.log(
        `${config.id} - ${logPrefix} chat_id: ${chatId}, chat_type: ${chatType}, thread_id: ${
          messageThreadId || "none"
        }, reply_to_message_id: ${
          replyToMessageId || "none"
        }, user_id: ${fromId}, username: @${fromUsername || "none"}, text: ${
          ctx.message.text
            ? ctx.message.text.substring(0, 50) + "..."
            : "no text"
        }`,
      );
    }

    // ----------------------------------------------------------------------------
    // ОБРАБОТКА СООБЩЕНИЙ ИЗ ГРУППЫ ОБСУЖДЕНИЙ
    // ----------------------------------------------------------------------------
    const discussionHandled = await handleSupportDiscussionMessage(
      ctx,
      config,
      supabase,
    );
    if (discussionHandled) {
      return;
    }

    // Обрабатываем только личные чаты
    if (chatType !== "private") {
      return;
    }

    // Обрабатываем пользователя при каждом сообщении
    await upsertUser(ctx, supabase);

    // Получаем язык пользователя и создаем i18n экземпляр
    const userLanguage = await getUserLanguage(supabase, ctx.from.id);
    const i18n = createI18n(userLanguage);

    // ----------------------------------------------------------------------------
    // ОБРАБОТКА ПЛАТЕЖЕЙ
    // ----------------------------------------------------------------------------
    if (ctx.message.successful_payment) {
      console.log("successful_payment received");

      const result = await processSuccessfulPayment(
        ctx.message.successful_payment,
        supabase,
      );

      if (result.success) {
        // Отправляем сообщение об успешной активации
        await ctx.reply(
          i18n.t("subscription_activated", {
            planName: result.planName || "Unknown",
          }) +
            "\n\n" +
            i18n.t("subscription_expires", {
              date: result.subscriptionEndDate!.toLocaleDateString("ru-RU"),
            }) + "\n\n" +
            i18n.t("subscription_full_access"),
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
        await ctx.reply(i18n.t("payment_error"));
      }
      return;
    }

    // ----------------------------------------------------------------------------
    // ОБРАБОТКА КОМАНД
    // ----------------------------------------------------------------------------
    if (ctx.message.text) {
      const message = ctx.message.text;
      const commandHandled = await handleCommand(
        ctx,
        message,
        chatType,
        supabase,
        i18n,
        config,
      );
      if (commandHandled) {
        return;
      }
    }

    // ----------------------------------------------------------------------------
    // ОБРАБОТКА СЕССИЙ ПОЛЬЗОВАТЕЛЯ И ПОДДЕРЖКИ
    // ----------------------------------------------------------------------------
    const sessionHandled = await handleUserSession(ctx, supabase, i18n, config);
    if (sessionHandled) {
      return;
    }

    // ----------------------------------------------------------------------------
    // ОБРАБОТКА АНАЛИЗА ФОТОГРАФИЙ
    // ----------------------------------------------------------------------------
    if (ctx.message.photo) {
      const handled = await handleFoodImageAnalysis(
        ctx,
        config,
        supabase,
        i18n,
        userLanguage,
        chatType,
      );
      if (handled) {
        return;
      }
    }

    // ----------------------------------------------------------------------------
    // ОБРАБОТКА АНАЛИЗА ТЕКСТОВЫХ СООБЩЕНИЙ (без команд)
    // ----------------------------------------------------------------------------
    if (ctx.message.text && !ctx.message.text.startsWith("/")) {
      const handled = await handleFoodTextAnalysis(
        ctx,
        config,
        supabase,
        i18n,
        userLanguage,
        chatType,
      );
      if (handled) {
        return;
      }
    }
  });

  // ============================================================================
  // ОБРАБОТЧИК CALLBACK QUERY (INLINE КНОПКИ)
  // ============================================================================
  bot.on("callback_query", async (ctx) => {
    // Получаем язык пользователя для callback обработчиков
    const userLanguage = await getUserLanguage(supabase, ctx.from.id);
    const i18n = createI18n(userLanguage);

    // Обработка смены языка
    if (ctx.callbackQuery.data?.startsWith("language_")) {
      const language = ctx.callbackQuery.data.replace("language_", "");
      const success = await updateUserLanguage(supabase, ctx.from.id, language);

      if (success) {
        const newI18n = createI18n(language);
        await ctx.answerCallbackQuery(newI18n.t("language_changed"));
      } else {
        await ctx.answerCallbackQuery(i18n.t("error"));
      }
      return;
    }

    // Обработка кнопок воды
    if (
      ctx.callbackQuery.data === "water_sips" ||
      ctx.callbackQuery.data === "water_glass"
    ) {
      if (!ctx.from) {
        await ctx.answerCallbackQuery(i18n.t("error"));
        return;
      }

      const amount = ctx.callbackQuery.data === "water_sips" ? "sips" : "glass";
      const success = await insertWaterIntake(supabase, ctx.from.id, amount);

      if (success) {
        // Логируем событие
        await logEvent(ctx.from.id, "telegram", "water_intake_recorded", {
          amount: amount,
        });

        // Удаляем сообщение-напоминание
        try {
          if (
            ctx.callbackQuery.message &&
            "message_id" in ctx.callbackQuery.message
          ) {
            await ctx.api.deleteMessage(
              ctx.callbackQuery.message.chat.id,
              ctx.callbackQuery.message.message_id,
            );
          }
        } catch (error) {
          console.error("Error deleting message:", error);
          // Игнорируем ошибку удаления, так как это не критично
        }
        await ctx.answerCallbackQuery(i18n.t("water_recorded"));
      } else {
        await ctx.answerCallbackQuery(i18n.t("water_error"));
      }
      return;
    }

    // Обработка кнопок оценки анализа (лайк/дизлайк)
    if (
      ctx.callbackQuery.data === "analysis_like" ||
      ctx.callbackQuery.data === "analysis_dislike"
    ) {
      if (!ctx.from) {
        await ctx.answerCallbackQuery(i18n.t("error"));
        return;
      }

      const feedback = ctx.callbackQuery.data === "analysis_like"
        ? "like"
        : "dislike";

      // Удаляем кнопки из сообщения
      try {
        if (
          ctx.callbackQuery.message &&
          "message_id" in ctx.callbackQuery.message
        ) {
          await ctx.api.editMessageReplyMarkup(
            ctx.callbackQuery.message.chat.id,
            ctx.callbackQuery.message.message_id,
            { reply_markup: { inline_keyboard: [] } },
          );
        }
      } catch (error) {
        console.error("Error removing buttons:", error);
        // Игнорируем ошибку удаления кнопок, так как это не критично
      }

      // Логируем событие
      await logEvent(ctx.from.id, "telegram", "analysis_feedback", {
        feedback: feedback,
      });

      await ctx.answerCallbackQuery();
      return;
    }

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
        await handleTrialSubscription(ctx, plan, supabase, i18n);
      } else {
        await createSubscriptionInvoice(ctx, plan, inTest, config, i18n);
      }
    }
  });

  // ============================================================================
  // ОБРАБОТЧИК PRE-CHECKOUT QUERY (ПРОВЕРКА ПЕРЕД ОПЛАТОЙ)
  // ============================================================================
  bot.on("pre_checkout_query", async (ctx) => {
    console.log("pre_checkout_query received");

    // Получаем язык пользователя для pre_checkout обработчика
    const userLanguage = await getUserLanguage(supabase, ctx.from.id);
    const i18n = createI18n(userLanguage);

    try {
      // Получаем данные из payload
      const payload = ctx.preCheckoutQuery.invoice_payload;
      const [type, planId, userId] = payload.split("_");

      if (type !== "subscription") {
        await ctx.answerPreCheckoutQuery(false, i18n.t("error"));
        return;
      }

      // Проверяем, что план существует и активен
      const plan = await getSubscriptionPlanById(supabase, planId);

      if (!plan) {
        await ctx.answerPreCheckoutQuery(
          false,
          i18n.t("error"),
        );
        return;
      }

      // Проверяем, что пользователь существует
      const user = await getUserByTelegramId(supabase, parseInt(userId));

      if (!user) {
        await ctx.answerPreCheckoutQuery(false, i18n.t("error"));
        return;
      }

      // Подтверждаем возможность оплаты
      await ctx.answerPreCheckoutQuery(true);
      console.log("Pre-checkout approved for plan:", planId);
    } catch (error) {
      console.error("Error in pre_checkout_query:", error);
      await ctx.answerPreCheckoutQuery(false, i18n.t("error"));
    }
  });

  // ============================================================================
  // ОБРАБОТЧИК РЕДАКТИРОВАННЫХ СООБЩЕНИЙ
  // ============================================================================
  bot.on("edited_message", async (ctx) => {
    const edited = ctx.editedMessage;
    if (!edited) return;

    const chatType = edited.chat.type;
    const chatId = edited.chat.id;
    const fromId = ctx.from?.id;

    // Логирование отредактированных сообщений
    if (chatType === "private") {
      console.log(
        `${config.id} - [EDITED_PRIVATE] chat_id: ${chatId}, user_id: ${fromId}`,
      );
    } else {
      console.log(
        `${config.id} - [EDITED_${chatType.toUpperCase()}] chat_id: ${chatId}, user_id: ${fromId}`,
      );
    }

    // Обрабатываем только личные чаты
    if (edited.chat.type !== "private") {
      return;
    }

    // Обрабатываем пользователя при каждом сообщении
    await upsertUser(ctx, supabase);

    // Получаем язык пользователя и создаем i18n экземпляр
    const _userLanguage = await getUserLanguage(supabase, ctx.from.id);
    const _i18n = createI18n(_userLanguage);

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

      // Получаем профиль пользователя для расчета калорий при активности
      const userProfile = await getUserProfile(supabase, edited.from.id);

      const response = await handleFoodImage(
        optimalPhoto.file_id,
        caption,
        config.token,
        _userLanguage,
        userProfile
          ? {
            height_cm: userProfile.height_cm,
            weight_kg: userProfile.weight_kg,
            gender: userProfile.gender,
            birth_year: userProfile.birth_year,
          }
          : null,
      );

      const messageText = formatFoodAnalysisMessage(response, _userLanguage);

      // Создаем инлайн кнопки для оценки анализа
      const replyMarkup = {
        inline_keyboard: [
          [
            { text: _i18n.t("analysis_like"), callback_data: "analysis_like" },
            {
              text: _i18n.t("analysis_dislike"),
              callback_data: "analysis_dislike",
            },
          ],
        ],
      };

      const { data } = await getBotMessageId(
        supabase,
        edited.message_id,
        edited.chat.id,
        config.id,
      );

      if (data?.bot_message_id) {
        await ctx.api.editMessageText(
          edited.chat.id,
          data.bot_message_id,
          messageText,
          {
            reply_markup: replyMarkup,
          },
        );

        // Update or insert analysis data (food or activity)
        if (!response.error) {
          if (response.content_type === "activity") {
            // Сохраняем физическую активность
            const imageUrl = await getImageUrlFromTelegram(
              optimalPhoto.file_id,
              config.token,
            );
            const activityData: PhysicalActivityData = {
              chat_id: edited.chat.id,
              user_id: edited.from.id,
              message_id: edited.message_id,
              bot_id: config.id,
              description: response.description,
              calories: response.calories,
              recommendation: response.recommendation,
              has_image: true,
              image_file_id: optimalPhoto.file_id,
              image_url: imageUrl || undefined,
              user_text: caption,
            };
            await upsertPhysicalActivity(supabase, activityData);
          } else {
            // Сохраняем анализ еды
            const imageUrl = await getImageUrlFromTelegram(
              optimalPhoto.file_id,
              config.token,
            );
            const foodAnalysisData: FoodAnalysisData = {
              chat_id: edited.chat.id,
              user_id: edited.from.id,
              message_id: edited.message_id,
              bot_id: config.id,
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
              image_url: imageUrl || undefined,
              user_text: caption,
              has_image: true,
            };
            await upsertFoodAnalysis(supabase, foodAnalysisData);
            // Обновляем стрики пользователя
            await updateUserStreaks(supabase, edited.from.id);
          }
        }
      }
    } else if (edited.text) {
      // Получаем профиль пользователя для расчета калорий при активности
      const userProfile = await getUserProfile(supabase, edited.from.id);

      const response = await handleFoodImage(
        null,
        edited.text || "",
        config.token,
        _userLanguage,
        userProfile
          ? {
            height_cm: userProfile.height_cm,
            weight_kg: userProfile.weight_kg,
            gender: userProfile.gender,
            birth_year: userProfile.birth_year,
          }
          : null,
      );

      const messageText = formatFoodAnalysisMessage(response, _userLanguage);

      // Создаем инлайн кнопки для оценки анализа
      const replyMarkup = {
        inline_keyboard: [
          [
            { text: _i18n.t("analysis_like"), callback_data: "analysis_like" },
            {
              text: _i18n.t("analysis_dislike"),
              callback_data: "analysis_dislike",
            },
          ],
        ],
      };

      const { data } = await getBotMessageId(
        supabase,
        edited.message_id,
        edited.chat.id,
        config.id,
      );

      if (data?.bot_message_id) {
        await ctx.api.editMessageText(
          edited.chat.id,
          data.bot_message_id,
          messageText,
          {
            reply_markup: replyMarkup,
          },
        );

        // Update or insert analysis data (food or activity)
        if (!response.error) {
          if (response.content_type === "activity") {
            // Сохраняем физическую активность
            const activityData: PhysicalActivityData = {
              chat_id: edited.chat.id,
              user_id: edited.from.id,
              message_id: edited.message_id,
              bot_id: config.id,
              description: response.description,
              calories: response.calories,
              recommendation: response.recommendation,
              has_image: false,
              user_text: edited.text || "",
            };
            await upsertPhysicalActivity(supabase, activityData);
          } else {
            // Сохраняем анализ еды
            const foodAnalysisData: FoodAnalysisData = {
              chat_id: edited.chat.id,
              user_id: edited.from.id,
              message_id: edited.message_id,
              bot_id: config.id,
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
            await upsertFoodAnalysis(supabase, foodAnalysisData);
            // Обновляем стрики пользователя
            await updateUserStreaks(supabase, edited.from.id);
          }
        }
      }
    }
  });
}
