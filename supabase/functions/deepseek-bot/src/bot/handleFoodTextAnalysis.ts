import { Context } from "https://deno.land/x/grammy@v1.8.3/mod.ts";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleFoodImage } from "../ai/handleFoodImage.ts";
import { BotConfig } from "../config/botConfig.ts";
import { insertFoodAnalysis, updateUserStreaks } from "../db/foodAnalysis.ts";
import { insertMessageRelationship } from "../db/messageRelationships.ts";
import { createReminderIfNeeded } from "../db/reminders.ts";
import { getSubscriptionPlanByPromoCode } from "../db/subscriptions.ts";
import {
  activateTrialByPromoCode,
  getUserByTelegramId,
  tryActivateTrialIfAvailable,
  updateUserPromo,
} from "../db/upsertUser.ts";
import { checkUserLimits } from "../db/userLimits.ts";
import {
  FoodAnalysisData,
  MessageRelationship,
} from "../interfaces/Database.ts";
import { replyWithAvailableSubscriptions } from "../telegram/subscriptionHandlers.ts";
import { logEvent } from "../utils/analytics.ts";
import { formatFoodAnalysisMessage } from "../utils/formatFoodAnalysisMessage.ts";
import { I18n } from "../utils/i18n.ts";

export async function handleFoodTextAnalysis(
  ctx: Context,
  config: BotConfig,
  supabase: SupabaseClient,
  i18n: I18n,
  userLanguage: string,
  chatType: string,
): Promise<boolean> {
  // Проверка наличия сообщения, текста, пользователя и чата
  if (!ctx.message || !ctx.message.text || !ctx.from || !ctx.chat) {
    return false;
  }

  // Проверяем лимиты пользователя
  const userLimits = await checkUserLimits(ctx.from.id, supabase);

  // Проверяем, является ли текст - промокодом
  const plans = await getSubscriptionPlanByPromoCode(
    supabase,
    ctx.message.text,
  );

  if (plans && plans.length > 0) {
    // Проверяем, не использован ли промокод уже
    const user = await getUserByTelegramId(supabase, ctx.from.id);
    const usedPromo = user?.used_promo || [];

    if (usedPromo.includes(ctx.message.text)) {
      await ctx.reply(i18n.t("subscription_trial_already_used"));
      return true;
    }

    // Обновляем промокод пользователя
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
      return true;
    }

    // Активируем триал по промокоду
    const trialActivated = await activateTrialByPromoCode(
      supabase,
      ctx.from.id,
      ctx.message.text,
    );

    if (trialActivated) {
      // Логируем активацию триала по промокоду
      await logEvent(ctx.from.id, "telegram", "trial_activated", {
        promo_code: ctx.message.text,
      });

      // Получаем обновленную дату окончания премиума
      const updatedUser = await getUserByTelegramId(supabase, ctx.from.id);
      if (updatedUser?.premium_expires_at) {
        const trialEndDate = new Date(updatedUser.premium_expires_at);
        await ctx.reply(
          i18n.t("subscription_trial_activated_reply") + "\n\n" +
            i18n.t("subscription_expires", {
              date: trialEndDate.toLocaleDateString(
                userLanguage === "en" ? "en-US" : "ru-RU",
              ),
            }),
        );
      } else {
        await ctx.reply(i18n.t("subscription_trial_activated_reply"));
      }
    }
    return true;
  }

  if (!userLimits.canAnalyzeText) {
    // Логируем достижение лимита
    await logEvent(ctx.from.id, "telegram", "limit_reached", {
      limit_type: "text",
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
        if (updatedLimits.canAnalyzeText) {
          // Продолжаем анализ, если теперь есть доступ
          // (код продолжит выполнение после этого блока)
        } else {
          // Если все еще нет доступа - показываем сообщение
          await ctx.reply(i18n.t("text_analysis_limit_reached"));
          const ok = await replyWithAvailableSubscriptions(
            ctx,
            supabase,
            i18n,
          );
          if (!ok) {
            await ctx.reply(i18n.t("text_analysis_subscribe"));
          }
          return true;
        }
      } else {
        // Триал недоступен - показываем сообщение о подписке
        await ctx.reply(i18n.t("text_analysis_limit_reached"));
        const ok = await replyWithAvailableSubscriptions(
          ctx,
          supabase,
          i18n,
        );
        if (!ok) {
          await ctx.reply(i18n.t("text_analysis_subscribe"));
        }
        return true;
      }
    } else {
      await ctx.reply(i18n.t("access_check_error"));
      return true;
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
      const inserted = await insertFoodAnalysis(
        supabase,
        foodAnalysisData,
      );

      // Обновляем стрики пользователя
      if (inserted) {
        await updateUserStreaks(supabase, ctx.from.id);
      }

      // Логируем успешный анализ текста
      await logEvent(ctx.from.id, "telegram", "food_analysis_text", {
        has_error: false,
        calories: response.calories,
        nutrition_score: response.nutrition_score,
      });

      // Создаем напоминание о еде, если у пользователя его еще нет
      await createReminderIfNeeded(supabase, ctx.from.id);
    } else {
      // Логируем ошибку анализа
      await logEvent(ctx.from.id, "telegram", "food_analysis_text", {
        has_error: true,
        error: response.error,
      });
    }
  }

  return true;
}
