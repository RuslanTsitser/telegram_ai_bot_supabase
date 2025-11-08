import { Context } from "https://deno.land/x/grammy@v1.8.3/mod.ts";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { BotConfig } from "../config/botConfig.ts";
import {
  getOrCreateSupportThread,
  getSupportThread,
} from "../db/supportThreads.ts";
import {
  activateTrialByPromoCode,
  getUserByTelegramId,
  getUserLanguage,
  updateUserTrafficSource,
} from "../db/upsertUser.ts";
import { checkUserLimits } from "../db/userLimits.ts";
import { getUserCalculations, getUserProfile } from "../db/userProfile.ts";
import { deleteUserSession, upsertUserSession } from "../db/userSessions.ts";
import {
  replyWithAvailableSubscriptions,
} from "../telegram/subscriptionHandlers.ts";
import { logEvent } from "../utils/analytics.ts";
import { createI18n, I18n } from "../utils/i18n.ts";
import { onboarding } from "./onboarding.ts";
import { onboardingSimple } from "./onboarding_simple.ts";

export async function handleCommand(
  ctx: Context,
  message: string,
  chatType: string,
  supabase: SupabaseClient,
  i18n: I18n,
  config?: BotConfig,
): Promise<boolean> {
  // Проверка наличия пользователя
  if (!ctx.from) {
    return false;
  }

  // Команда /start
  if (message.startsWith("/start") && chatType === "private") {
    console.log("start message");

    // Извлекаем параметр из команды /start (например, /start channel_name)
    const startParts = message.trim().split(/\s+/);
    let trafficSource: string | undefined;
    if (startParts.length > 1) {
      trafficSource = startParts[1];
      if (trafficSource) {
        console.log("traffic_source из команды /start:", trafficSource);

        // Сохраняем traffic_source (только если поле еще не заполнено)
        await updateUserTrafficSource(supabase, ctx.from.id, trafficSource);
      }
    }

    // Логируем событие команды /start
    await logEvent(ctx.from.id, "telegram", "command_executed", {
      command: "/start",
      traffic_source: trafficSource,
    });

    await onboardingSimple(ctx, supabase);

    // Проверяем, есть ли промокод пользователя в used_promo, и активируем триал, если его нет
    const user = await getUserByTelegramId(supabase, ctx.from.id);
    if (user) {
      const userRecord = user as typeof user & { used_promo?: string[] };
      const usedPromo = userRecord.used_promo || [];
      const userPromo = user.promo || "A";
      if (!usedPromo.includes(userPromo)) {
        const trialActivated = await activateTrialByPromoCode(
          supabase,
          ctx.from.id,
          userPromo,
        );
        if (trialActivated) {
          // Логируем активацию триала
          await logEvent(ctx.from.id, "telegram", "trial_activated", {
            promo_code: userPromo,
          });

          // Получаем обновленную дату окончания премиума
          const updatedUser = await getUserByTelegramId(supabase, ctx.from.id);
          if (updatedUser?.premium_expires_at) {
            const userLanguage = await getUserLanguage(supabase, ctx.from.id);
            const i18n = createI18n(userLanguage);
            const trialEndDate = new Date(updatedUser.premium_expires_at);
            await ctx.reply(
              i18n.t("subscription_trial_activated_reply") + "\n\n" +
                i18n.t("subscription_expires", {
                  date: trialEndDate.toLocaleDateString(
                    userLanguage === "en" ? "en-US" : "ru-RU",
                  ),
                }),
            );
          }
        }
      }
    }
    return true;
  }

  // Команда /set_profile
  if (message === "/set_profile" && chatType === "private") {
    console.log("set_profile command");
    await ctx.reply(i18n.t("enter_height"));
    await upsertUserSession(supabase, ctx.from.id, "waiting_for_height");
    return true;
  }

  // Команда /get_profile
  if (message === "/get_profile" && chatType === "private") {
    console.log("stats command");
    const userProfile = await getUserProfile(supabase, ctx.from.id);
    const calculations = await getUserCalculations(supabase, ctx.from.id);
    await ctx.reply(
      `
${i18n.t("profile_height")}: ${userProfile?.height_cm} ${i18n.t("cm")}
${i18n.t("profile_weight")}: ${userProfile?.weight_kg} ${i18n.t("kg")}
${i18n.t("profile_target_weight")}: ${userProfile?.target_weight_kg} ${
        i18n.t("kg")
      }
${i18n.t("profile_gender")}: ${
        userProfile?.gender === 0
          ? i18n.t("profile_male")
          : i18n.t("profile_female")
      }
${i18n.t("profile_birth_year")}: ${userProfile?.birth_year}
${i18n.t("profile_activity_level")}: ${userProfile?.activity_level}

${i18n.t("bmi")}: ${calculations?.bmi}
${i18n.t("target_calories")}: ${calculations?.target_calories}
${i18n.t("target_protein")}: ${calculations?.target_protein_g} ${i18n.t("g")}
${i18n.t("target_fats")}: ${calculations?.target_fats_g} ${i18n.t("g")}
${i18n.t("target_carbs")}: ${calculations?.target_carbs_g} ${i18n.t("g")}
`,
    );
    return true;
  }

  // Команда /help
  if (message === "/help" && chatType === "private") {
    console.log("help command");
    await onboarding(ctx, supabase);
    return true;
  }

  // Команды /subscriptions и /subscriptions_test
  if (
    (message === "/subscriptions" || message === "/subscriptions_test") &&
    chatType === "private"
  ) {
    console.log("subscriptions command");
    const inTest = message === "/subscriptions_test";

    // Логируем просмотр подписок
    await logEvent(ctx.from.id, "telegram", "subscription_viewed", {
      is_test: inTest,
    });

    const ok = await replyWithAvailableSubscriptions(
      ctx,
      supabase,
      i18n,
      inTest,
    );
    if (!ok) {
      await ctx.reply(i18n.t("error"));
    }
    return true;
  }

  // Команда /limits
  if (message === "/limits" && chatType === "private") {
    console.log("limits command");

    const userLimits = await checkUserLimits(ctx.from.id, supabase);

    let limitsMessage = i18n.t("limits_title") + "\n\n";

    if (userLimits.isPremium) {
      limitsMessage += i18n.t("premium_active") + "\n" +
        i18n.t("premium_unlimited") + "\n" +
        i18n.t("premium_text_analysis") + "\n" +
        i18n.t("premium_image_analysis") + "\n\n";
    } else {
      limitsMessage += i18n.t("free_account") + "\n" +
        i18n.t("free_features") + "\n" +
        i18n.t("free_text_analysis") + " " +
        (userLimits.dailyTextAnalysesLeft > 0
          ? `${userLimits.dailyTextAnalysesLeft} ${
            i18n.t("free_text_analysis_limit")
          }`
          : i18n.t("free_text_analysis_exhausted")) +
        "\n" +
        i18n.t("free_image_analysis") + "\n\n" +
        i18n.t("subscribe_prompt");
    }

    await ctx.reply(limitsMessage);
    return true;
  }

  // Команда /language
  if (message === "/language" && chatType === "private") {
    console.log("language command");

    const keyboard = {
      inline_keyboard: [
        [{ text: "🇷🇺 Русский", callback_data: "language_ru" }],
        [{ text: "🇺🇸 English", callback_data: "language_en" }],
      ],
    };

    await ctx.reply(i18n.t("select_language"), { reply_markup: keyboard });
    return true;
  }

  // Команда /set_promo
  if (message === "/set_promo" && chatType === "private") {
    console.log("set_promo command");
    await ctx.reply(i18n.t("enter_promo_code"));
    return true;
  }

  // Команда /support
  if (message === "/support" && chatType === "private") {
    console.log("support command");

    if (!config || !config.supportChannelId) {
      await ctx.reply("❌ Канал поддержки не настроен.");
      return true;
    }

    // Проверяем, есть ли уже пост для пользователя
    const existingThread = await getSupportThread(
      supabase,
      ctx.from.id,
      config.id,
    );

    if (!existingThread || !existingThread.post_id) {
      // Если поста нет, создаем новый пост в канале
      const user = await getUserByTelegramId(supabase, ctx.from.id);

      if (!user) {
        await ctx.reply("❌ Ошибка: пользователь не найден.");
        return true;
      }

      const userName = user.first_name || user.username ||
        `User ${ctx.from.id}`;
      const userInfo = `👤 ${userName}${
        user.username ? ` (@${user.username})` : ""
      }\nID: ${ctx.from.id}`;

      try {
        const channelPost = await ctx.api.sendMessage(
          config.supportChannelId,
          userInfo,
        );

        if (channelPost) {
          // Сохраняем связь user_id -> post_id в БД
          await getOrCreateSupportThread(
            supabase,
            ctx.from.id,
            config.id,
            channelPost.message_id,
          );

          console.log(
            "Support post created:",
            channelPost.message_id,
            "for user:",
            ctx.from.id,
          );
        }
      } catch (error) {
        console.error("Error creating support post:", error);
        await ctx.reply("❌ Ошибка при создании поста поддержки.");
        return true;
      }
    }

    // Активируем режим поддержки
    await upsertUserSession(supabase, ctx.from.id, "support_mode");

    // Логируем активацию режима поддержки
    await logEvent(ctx.from.id, "telegram", "support_mode_activated", {
      has_existing_thread: !!existingThread,
    });

    // Добавляем reply кнопку для остановки режима поддержки
    const supportKeyboard = {
      keyboard: [[{ text: "/stop_support" }]],
      resize_keyboard: true,
      one_time_keyboard: false,
    };

    await ctx.reply(i18n.t("support_mode_activated"), {
      reply_markup: supportKeyboard,
    });
    return true;
  }

  // Команда /stop_support
  if (message === "/stop_support" && chatType === "private") {
    console.log("stop_support command");
    await deleteUserSession(supabase, ctx.from.id);

    // Удаляем reply кнопку
    await ctx.reply(i18n.t("support_mode_deactivated"), {
      reply_markup: { remove_keyboard: true },
    });
    return true;
  }

  return false;
}
