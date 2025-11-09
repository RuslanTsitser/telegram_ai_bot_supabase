import { Context } from "https://deno.land/x/grammy@v1.8.3/mod.ts";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleFoodImage } from "../ai/handleFoodImage.ts";
import { BotConfig } from "../config/botConfig.ts";
import { insertFoodAnalysis, updateUserStreaks } from "../db/foodAnalysis.ts";
import { insertMessageRelationship } from "../db/messageRelationships.ts";
import { createReminderIfNeeded } from "../db/reminders.ts";
import {
  getUserByTelegramId,
  tryActivateTrialIfAvailable,
} from "../db/upsertUser.ts";
import { checkUserLimits } from "../db/userLimits.ts";
import {
  FoodAnalysisData,
  MessageRelationship,
} from "../interfaces/Database.ts";
import { getImageUrlFromTelegram } from "../telegram/getImageUrlFromTelegram.ts";
import {
  replyWithAvailableSubscriptions,
} from "../telegram/subscriptionHandlers.ts";
import { logEvent } from "../utils/analytics.ts";
import { formatFoodAnalysisMessage } from "../utils/formatFoodAnalysisMessage.ts";
import { I18n } from "../utils/i18n.ts";
import { selectOptimalPhoto } from "../utils/selectOptimalPhoto.ts";

export async function handleFoodImageAnalysis(
  ctx: Context,
  config: BotConfig,
  supabase: SupabaseClient,
  i18n: I18n,
  userLanguage: string,
  chatType: string,
): Promise<boolean> {
  // Проверка наличия сообщения, фотографии, пользователя и чата
  if (!ctx.message || !ctx.message.photo || !ctx.from || !ctx.chat) {
    return false;
  }

  // Специальная проверка для file_id
  if (ctx.message.caption === "file_id" && chatType === "private") {
    const fileId = ctx.message.photo[0].file_id;
    await ctx.reply(fileId);
    return true;
  }

  // Проверяем лимиты пользователя
  const userLimits = await checkUserLimits(ctx.from.id, supabase);

  if (!userLimits.canAnalyzeImage) {
    // Логируем достижение лимита
    await logEvent(ctx.from.id, "telegram", "limit_reached", {
      limit_type: "image",
      is_premium: userLimits.isPremium,
    });

    if (!userLimits.isPremium) {
      // Пытаемся автоматически активировать триал, если доступен
      const trialActivated = await tryActivateTrialIfAvailable(
        supabase,
        ctx.from.id,
      );

      if (trialActivated) {
        // Логируем автоматическую активацию триала
        await logEvent(ctx.from.id, "telegram", "trial_activated", {
          auto_activated: true,
        });

        // Получаем обновленную дату окончания премиума для уведомления
        const updatedUser = await getUserByTelegramId(supabase, ctx.from.id);
        if (updatedUser?.premium_expires_at) {
          const trialEndDate = new Date(updatedUser.premium_expires_at);
          await ctx.reply(
            i18n.t("subscription_trial_auto_activated") + "\n\n" +
              i18n.t("subscription_expires", {
                date: trialEndDate.toLocaleDateString(
                  userLanguage === "en" ? "en-US" : "ru-RU",
                ),
              }),
          );
        } else {
          await ctx.reply(i18n.t("subscription_trial_auto_activated"));
        }

        // Повторно проверяем лимиты (теперь пользователь премиум)
        const updatedLimits = await checkUserLimits(ctx.from.id, supabase);
        if (updatedLimits.canAnalyzeImage) {
          // Продолжаем анализ, если теперь есть доступ
          // (код продолжит выполнение после этого блока)
        } else {
          // Если все еще нет доступа - показываем сообщение
          await ctx.reply(
            i18n.t("image_analysis_limit_reached") + "\n\n" +
              i18n.t("image_analysis_subscribe"),
          );
          await replyWithAvailableSubscriptions(ctx, supabase, i18n);
          return true;
        }
      } else {
        // Триал недоступен - показываем сообщение о подписке
        await ctx.reply(
          i18n.t("image_analysis_limit_reached") + "\n\n" +
            i18n.t("image_analysis_subscribe"),
        );
        await replyWithAvailableSubscriptions(ctx, supabase, i18n);
        return true;
      }
    } else {
      await ctx.reply(i18n.t("access_check_error"));
      return true;
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

  // Создаем инлайн кнопки для оценки анализа
  const replyMarkup = {
    inline_keyboard: [
      [
        { text: i18n.t("analysis_like"), callback_data: "analysis_like" },
        { text: i18n.t("analysis_dislike"), callback_data: "analysis_dislike" },
      ],
    ],
  };

  let sentMessage;
  if (chatType === "private") {
    sentMessage = await ctx.reply(messageText, {
      reply_markup: replyMarkup,
    });
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

      // Обновляем стрики пользователя
      await updateUserStreaks(supabase, ctx.from.id);

      // Логируем успешный анализ изображения
      await logEvent(ctx.from.id, "telegram", "food_analysis_image", {
        has_error: false,
        has_caption: !!caption,
        calories: response.calories,
        nutrition_score: response.nutrition_score,
      });

      // Создаем напоминание о еде, если у пользователя его еще нет
      await createReminderIfNeeded(supabase, ctx.from.id);
    } else {
      // Логируем ошибку анализа
      await logEvent(ctx.from.id, "telegram", "food_analysis_image", {
        has_error: true,
        error: response.error,
      });
    }
  }

  return true;
}
