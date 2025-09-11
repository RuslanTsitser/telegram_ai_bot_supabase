import { Context } from "https://deno.land/x/grammy@v1.8.3/mod.ts";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SubscriptionPlan } from "../interfaces/Database.ts";
import { formatWithDeclension } from "../utils/declension.ts";

// Обработка пробного периода
export async function handleTrialSubscription(
  ctx: Context,
  plan: SubscriptionPlan,
  supabase: SupabaseClient,
) {
  const userId = ctx.from?.id;
  if (!userId) return;

  // Проверяем, использовал ли пользователь пробный период
  const { data: user, error } = await supabase
    .from("users")
    .select("trial_used")
    .eq("telegram_user_id", userId)
    .single();

  if (error) {
    await ctx.answerCallbackQuery("❌ Ошибка при проверке пользователя");
    return;
  }

  if (user.trial_used) {
    await ctx.answerCallbackQuery("❌ Пробный период уже использован");
    return;
  }

  // Активируем пробный период
  const trialEndDate = new Date();
  trialEndDate.setDate(trialEndDate.getDate() + plan.duration_days);

  const { error: updateError } = await supabase
    .from("users")
    .update({
      trial_used: true,
      premium_expires_at: trialEndDate.toISOString(),
    })
    .eq("telegram_user_id", userId);

  if (updateError) {
    await ctx.answerCallbackQuery("❌ Ошибка при активации пробного периода");
    return;
  }

  await ctx.answerCallbackQuery("✅ Пробный период активирован!");
  await ctx.editMessageText(
    `🎉 Пробный период "${plan.name}" активирован!\n\n` +
      `Доступен до: ${trialEndDate.toLocaleDateString("ru-RU")}\n\n` +
      `Теперь у вас есть полный доступ ко всем функциям!`,
  );
}

// Создание invoice для платного тарифа
export async function createSubscriptionInvoice(
  ctx: Context,
  plan: SubscriptionPlan,
  test: boolean,
) {
  const userId = ctx.from?.id;
  if (!userId) return;

  try {
    // Создаем invoice с правильными параметрами согласно документации
    await ctx.api.sendInvoice(
      ctx.chat?.id!,
      `Подписка: ${plan.name}`,
      plan.description ||
        `Подписка на ${
          formatWithDeclension(plan.duration_days, ["день", "дня", "дней"])
        }`,
      `subscription_${plan.id}_${userId}`,
      test
        ? Deno.env.get("YOOKASSA_PROVIDER_TOKEN_TEST") || ""
        : Deno.env.get("YOOKASSA_PROVIDER_TOKEN") || "",
      "RUB",
      [{
        label: plan.name,
        amount: Math.round(plan.price * 100), // в копейках
      }],
    );

    await ctx.answerCallbackQuery("✅ Создан счет для оплаты");
  } catch (error) {
    console.error("Error creating invoice:", error);
    await ctx.answerCallbackQuery("❌ Ошибка при создании счета");
  }
}
