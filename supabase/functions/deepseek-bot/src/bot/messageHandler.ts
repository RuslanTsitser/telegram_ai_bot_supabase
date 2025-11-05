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
  getSubscriptionPlanByPromoCode,
} from "../db/subscriptions.ts";
import {
  getUserByTelegramId,
  getUserLanguage,
  updateUserLanguage,
  updateUserPromo,
  updateUserTrafficSource,
  upsertUser,
} from "../db/upsertUser.ts";
import { checkUserLimits } from "../db/userLimits.ts";
import { getUserCalculations, getUserProfile } from "../db/userProfile.ts";
import { upsertUserSession } from "../db/userSessions.ts";
import {
  FoodAnalysisData,
  MessageRelationship,
} from "../interfaces/Database.ts";
import { getImageUrlFromTelegram } from "../telegram/getImageUrlFromTelegram.ts";
import {
  activateTrialWithPromo,
  createSubscriptionInvoice,
  handleTrialSubscription,
  replyWithAvailableSubscriptions,
} from "../telegram/subscriptionHandlers.ts";
import { formatFoodAnalysisMessage } from "../utils/formatFoodAnalysisMessage.ts";
import { createI18n } from "../utils/i18n.ts";
import { selectOptimalPhoto } from "../utils/selectOptimalPhoto.ts";
import { handleUserSession } from "./handleUserSessions.ts";
import { onboarding } from "./onboarding.ts";
import { onboardingSimple } from "./onboarding_simple.ts";

// helper вынесен в ../telegram/subscriptionHandlers.ts

export function setupBotHandlers(
  bot: Bot,
  config: BotConfig,
  supabase: SupabaseClient,
) {
  bot.on("message", async (ctx) => {
    const chatType = ctx.message.chat.type;
    console.log(`${config.id} - ${chatType} message`, ctx.message.chat.id);

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
    // ОБРАБОТКА СЕССИЙ ПОЛЬЗОВАТЕЛЯ
    // ----------------------------------------------------------------------------
    const sessionHandled = await handleUserSession(ctx, supabase, i18n);
    if (sessionHandled) {
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
      );
      if (commandHandled) {
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
            i18n.t("image_analysis_limit_reached") + "\n\n" +
              i18n.t("image_analysis_subscribe"),
          );
          await replyWithAvailableSubscriptions(ctx, supabase, i18n);
          return;
        } else {
          await ctx.reply(i18n.t("access_check_error"));
          return;
        }
      }

      const caption = ctx.message.caption || "";
      // Выбираем PhotoSize с разрешением близким к 1024×1024
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
        userLanguage,
      );

      const messageText = formatFoodAnalysisMessage(response, userLanguage);

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
          bot_id: config.id,
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
          const imageUrl = await getImageUrlFromTelegram(
            optimalPhoto.file_id,
            config.token,
          );
          const foodAnalysisData: FoodAnalysisData = {
            chat_id: ctx.chat.id,
            user_id: ctx.from.id,
            message_id: ctx.message.message_id,
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
            has_image: true,
            image_file_id: optimalPhoto.file_id,
            image_url: imageUrl || undefined,
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

      // Проверяем, является ли текст - промокодом
      const plans = await getSubscriptionPlanByPromoCode(
        supabase,
        ctx.message.text,
      );

      if (plans && plans.length > 0) {
        // активируем промо

        const success = await updateUserPromo(
          supabase,
          ctx.from.id,
          ctx.message.text,
        );

        if (success) {
          await ctx.reply(
            i18n.t("promo_code_updated", { code: ctx.message.text }),
          );
        } else {
          await ctx.reply(i18n.t("promo_code_update_error"));
        }

        const trialPlan = plans.find((plan) => plan.price === 0);
        if (trialPlan) {
          await activateTrialWithPromo(ctx, trialPlan, supabase, i18n);
        }
        return;
      }

      if (!userLimits.canAnalyzeText) {
        if (!userLimits.isPremium) {
          await ctx.reply(i18n.t("text_analysis_limit_reached"));
          const ok = await replyWithAvailableSubscriptions(
            ctx,
            supabase,
            i18n,
          );
          if (!ok) {
            await ctx.reply(i18n.t("text_analysis_subscribe"));
          }
          return;
        } else {
          await ctx.reply(i18n.t("access_check_error"));
          return;
        }
      }

      console.log("received food text for analysis", chatType);
      const response = await handleFoodImage(
        null,
        ctx.message.text,
        config.token,
        userLanguage,
      );

      const messageText = formatFoodAnalysisMessage(response, userLanguage);

      let sentMessage;
      if (chatType === "private") {
        sentMessage = await ctx.reply(messageText);
      }

      console.log("sentMessage food text", sentMessage);

      // Store the relationship in Supabase
      if (sentMessage) {
        // Store message relationship
        const relationship: MessageRelationship = {
          user_message_id: ctx.message.message_id,
          bot_message_id: sentMessage.message_id,
          chat_id: ctx.chat.id,
          bot_id: config.id,
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

  // Webhook для проверки перед оплатой
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

  // Обработчик для редактированных сообщений
  bot.on("edited_message", async (ctx) => {
    const edited = ctx.editedMessage;
    if (!edited) return;

    // Обрабатываем только личные чаты
    if (edited.chat.type !== "private") {
      return;
    }

    // Обрабатываем пользователя при каждом сообщении
    await upsertUser(ctx, supabase);

    // Получаем язык пользователя (для будущего использования)
    const _userLanguage = await getUserLanguage(supabase, ctx.from.id);

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
        _userLanguage,
      );

      const messageText = formatFoodAnalysisMessage(response, _userLanguage);

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
        );

        // Update or insert food analysis data
        if (!response.error) {
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
        }
      }
    } else if (edited.text) {
      const response = await handleFoodImage(
        null,
        edited.text || "",
        config.token,
        _userLanguage,
      );

      const messageText = formatFoodAnalysisMessage(response, _userLanguage);

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
        );

        // Update or insert food analysis data
        if (!response.error) {
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
          await upsertFoodAnalysis(
            supabase,
            foodAnalysisData,
          );
        }
      }
    }
  });
}
