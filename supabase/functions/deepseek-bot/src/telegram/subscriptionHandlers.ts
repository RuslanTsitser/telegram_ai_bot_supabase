import { Context } from "https://deno.land/x/grammy@v1.8.3/mod.ts";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { BotConfig } from "../config/botConfig.ts";
import { getSubscriptionPlans } from "../db/subscriptions.ts";
import { activateTrialByPromoCode } from "../db/upsertUser.ts";
import { SubscriptionPlan } from "../interfaces/Database.ts";
import { logEvent } from "../utils/analytics.ts";
import { formatWithDeclension } from "../utils/declension.ts";
import { I18n } from "../utils/i18n.ts";

// Обработка пробного периода
export async function handleTrialSubscription(
  ctx: Context,
  plan: SubscriptionPlan,
  supabase: SupabaseClient,
  i18n: I18n,
) {
  const userId = ctx.from?.id;
  if (!userId) return;

  // Получаем промокод пользователя
  const { data: user, error } = await supabase
    .from("users")
    .select("promo, used_promo")
    .eq("telegram_user_id", userId)
    .single();

  if (error) {
    await ctx.answerCallbackQuery(i18n.t("subscription_check_user_error"));
    return;
  }

  const userPromo = user.promo || "A";
  const usedPromo = (user.used_promo as string[]) || [];

  // Проверяем, не использован ли промокод уже
  if (usedPromo.includes(userPromo)) {
    await ctx.answerCallbackQuery(i18n.t("subscription_trial_already_used"));
    return;
  }

  // Используем новую функцию активации триала по промокоду
  const success = await activateTrialByPromoCode(
    supabase,
    userId,
    userPromo,
  );

  if (!success) {
    await ctx.answerCallbackQuery(
      i18n.t("subscription_trial_activation_error"),
    );
    return;
  }

  // Логируем активацию триала
  await logEvent(userId, "telegram", "trial_activated", {
    promo_code: userPromo,
    plan_id: plan.id,
  });

  // Получаем обновленную дату окончания премиума для отображения
  const { data: updatedUser } = await supabase
    .from("users")
    .select("premium_expires_at")
    .eq("telegram_user_id", userId)
    .single();

  const trialEndDate = updatedUser?.premium_expires_at
    ? new Date(updatedUser.premium_expires_at)
    : new Date();

  await ctx.answerCallbackQuery(i18n.t("subscription_trial_activated"));
  await ctx.editMessageText(
    i18n.t("subscription_trial_activated_message", {
      planName: plan.name,
      date: trialEndDate.toLocaleDateString(
        i18n.getLanguage() === "en" ? "en-US" : "ru-RU",
      ),
    }),
  );
}

// Создание invoice для платного тарифа
export async function createSubscriptionInvoice(
  ctx: Context,
  plan: SubscriptionPlan,
  test: boolean,
  botConfig: BotConfig,
  i18n: I18n,
) {
  const userId = ctx.from?.id;
  if (!userId) return;

  try {
    // Создаем invoice с правильными параметрами согласно документации
    await ctx.api.sendInvoice(
      ctx.chat?.id!,
      i18n.t("subscriptions_title") + ": " + plan.name,
      plan.description ||
        i18n.t("subscriptions_title") + " " +
          formatWithDeclension(
            plan.duration_days,
            i18n.t("subscription_days") as unknown as [string, string, string],
          ),
      `subscription_${plan.id}_${userId}`,
      test
        ? botConfig.youKassaProviderTestToken
        : botConfig.youKassaProviderToken,
      "RUB",
      [{
        label: plan.name,
        amount: Math.round(plan.price * 100), // в копейках
      }],
    );

    // Логируем создание invoice
    await logEvent(userId, "telegram", "subscription_invoice_created", {
      plan_id: plan.id,
      plan_name: plan.name,
      price: plan.price,
      is_test: test,
    });

    await ctx.answerCallbackQuery(i18n.t("subscription_invoice_created"));
  } catch (error) {
    console.error("Error creating invoice:", error);
    await ctx.answerCallbackQuery(i18n.t("subscription_invoice_error"));
  }
}

export async function activateTrialWithPromo(
  ctx: Context,
  _plan: SubscriptionPlan,
  supabase: SupabaseClient,
  i18n: I18n,
) {
  const userId = ctx.from?.id;
  if (!userId) return;

  // Получаем промокод пользователя
  const { data: user, error } = await supabase
    .from("users")
    .select("promo, used_promo")
    .eq("telegram_user_id", userId)
    .single();

  if (error) {
    await ctx.reply(i18n.t("subscription_check_user_error"));
    return;
  }

  const userPromo = user.promo || "A";
  const usedPromo = (user.used_promo as string[]) || [];

  // Проверяем, не использован ли промокод уже
  if (usedPromo.includes(userPromo)) {
    return;
  }

  // Используем новую функцию активации триала по промокоду
  const success = await activateTrialByPromoCode(
    supabase,
    userId,
    userPromo,
  );

  if (success) {
    await ctx.reply(i18n.t("subscription_trial_activated_reply"));
  } else {
    await ctx.reply(i18n.t("subscription_trial_activation_error_reply"));
  }
}

// Унифицированная отправка доступных подписок с инлайн-кнопками
export async function replyWithAvailableSubscriptions(
  ctx: Context,
  supabase: SupabaseClient,
  i18n: I18n,
  inTest = false,
): Promise<boolean> {
  const userId = ctx.from?.id;
  if (!userId) return false;

  const plans = await getSubscriptionPlans(supabase, userId);
  if (!plans || plans.length === 0) return false;

  const subscriptionMessage = i18n.t("subscriptions_title") + "\n\n";

  // Создаем inline-кнопки для каждого тарифа
  const keyboard = {
    inline_keyboard: plans.map((plan) => [{
      text: plan.price === 0
        ? `🆓 ${plan.name}`
        : `💳 ${plan.name} за ${plan.price}₽`,
      callback_data: inTest
        ? `subscription_test_${plan.id}`
        : `subscription_${plan.id}`,
    }]),
  };

  await ctx.reply(subscriptionMessage, { reply_markup: keyboard });
  return true;
}
