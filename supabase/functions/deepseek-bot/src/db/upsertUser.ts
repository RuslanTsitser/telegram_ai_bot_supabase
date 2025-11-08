import { Context } from "https://deno.land/x/grammy@v1.8.3/mod.ts";
import SupabaseClient from "https://esm.sh/@supabase/supabase-js@2.49.4/dist/module/SupabaseClient.js";
import { DbUser } from "../interfaces/Database.ts";
import { getSubscriptionPlanByPromoCode } from "./subscriptions.ts";

// Простые функции для работы с пользователями
export async function upsertUser(
  ctx: Context,
  supabase: SupabaseClient,
) {
  if (!ctx.from) return;

  try {
    // Определяем язык пользователя из Telegram
    console.log("ctx.from.language_code", ctx.from.language_code);
    const userLanguage = ctx.from.language_code || "ru";
    const supportedLanguage = userLanguage.startsWith("en") ? "en" : "ru";

    const { error } = await supabase
      .from("users")
      .upsert({
        telegram_user_id: ctx.from.id,
        username: ctx.from.username,
        first_name: ctx.from.first_name,
        last_name: ctx.from.last_name,
        language: supportedLanguage,
        last_activity: new Date().toISOString(),
      }, { onConflict: "telegram_user_id" })
      .select()
      .single();

    if (error) {
      console.error("Ошибка upsert пользователя:", error);
      return;
    }

    console.log("Пользователь обработан:", ctx.from.id);
  } catch (error) {
    console.error("Ошибка обработки пользователя:", error);
  }
}

// Активация триала по промокоду
// Находит самый долгий бесплатный план по промокоду и активирует его
// Суммирует время премиума, если оно уже есть
// Добавляет промокод в used_promo
export async function activateTrialByPromoCode(
  supabase: SupabaseClient,
  userId: number,
  promoCode: string,
): Promise<boolean> {
  try {
    // Получаем пользователя
    const user = await getUserByTelegramId(supabase, userId);
    if (!user) {
      console.error("Пользователь не найден:", userId);
      return false;
    }

    // Проверяем, не использован ли промокод уже
    const userRecord = user as DbUser & { used_promo?: string[] };
    const usedPromo = userRecord.used_promo || [];
    if (usedPromo.includes(promoCode)) {
      console.log(
        `Промокод ${promoCode} уже использован пользователем ${userId}`,
      );
      return false;
    }

    // Получаем планы по промокоду
    const plans = await getSubscriptionPlanByPromoCode(supabase, promoCode);
    if (!plans || plans.length === 0) {
      console.log(`Планы не найдены для промокода ${promoCode}`);
      return false;
    }

    // Находим самый долгий бесплатный план (price === 0)
    const freePlans = plans.filter((plan) => plan.price === 0);
    if (freePlans.length === 0) {
      console.log(`Бесплатные планы не найдены для промокода ${promoCode}`);
      return false;
    }

    // Выбираем план с максимальной длительностью
    const trialPlan = freePlans.reduce((max, plan) =>
      plan.duration_days > max.duration_days ? plan : max
    );

    // Вычисляем новую дату окончания премиума
    let newPremiumExpiresAt: Date;
    const currentPremiumExpiresAt = user.premium_expires_at
      ? new Date(user.premium_expires_at)
      : null;

    if (currentPremiumExpiresAt && currentPremiumExpiresAt > new Date()) {
      // Если премиум еще активен - суммируем время
      newPremiumExpiresAt = new Date(currentPremiumExpiresAt);
      newPremiumExpiresAt.setDate(
        newPremiumExpiresAt.getDate() + trialPlan.duration_days,
      );
    } else {
      // Если премиум не активен - устанавливаем новую дату
      newPremiumExpiresAt = new Date();
      newPremiumExpiresAt.setDate(
        newPremiumExpiresAt.getDate() + trialPlan.duration_days,
      );
    }

    // Добавляем промокод в used_promo
    const updatedUsedPromo = [...usedPromo, promoCode];

    // Обновляем пользователя
    const { error: updateError } = await supabase
      .from("users")
      .update({
        premium_expires_at: newPremiumExpiresAt.toISOString(),
        used_promo: updatedUsedPromo,
      })
      .eq("telegram_user_id", userId);

    if (updateError) {
      console.error(
        "Ошибка активации триала по промокоду:",
        updateError,
      );
      return false;
    }

    console.log(
      `Триал активирован для пользователя ${userId} по промокоду ${promoCode} до ${newPremiumExpiresAt.toISOString()}`,
    );
    return true;
  } catch (error) {
    console.error("Ошибка при активации триала по промокоду:", error);
    return false;
  }
}

export async function getUserByTelegramId(
  supabase: SupabaseClient,
  userId: number,
): Promise<DbUser | null> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("telegram_user_id", userId)
    .single();

  if (error) {
    console.error("Ошибка получения пользователя:", error);
    return null;
  }

  return data;
}

export async function updateUserLanguage(
  supabase: SupabaseClient,
  userId: number,
  language: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("users")
    .update({ language })
    .eq("telegram_user_id", userId);

  if (error) {
    console.error("Ошибка обновления языка пользователя:", error);
    return false;
  }

  return true;
}

export async function getUserLanguage(
  supabase: SupabaseClient,
  userId: number,
): Promise<string> {
  const { data, error } = await supabase
    .from("users")
    .select("language")
    .eq("telegram_user_id", userId)
    .single();

  if (error || !data) {
    console.error("Ошибка получения языка пользователя:", error);
    return "ru"; // По умолчанию русский
  }

  return data.language || "ru";
}

export async function updateUserPromo(
  supabase: SupabaseClient,
  userId: number,
  promo: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("users")
    .update({ promo })
    .eq("telegram_user_id", userId);

  if (error) {
    console.error("Ошибка обновления промо-кода пользователя:", error);
    return false;
  }

  return true;
}

export async function updateUserTrafficSource(
  supabase: SupabaseClient,
  userId: number,
  trafficSource: string,
): Promise<boolean> {
  // Проверяем, существует ли пользователь и не заполнено ли уже поле traffic_source
  const existingUser = await getUserByTelegramId(supabase, userId);

  if (!existingUser) {
    console.error("Пользователь не найден для обновления traffic_source");
    return false;
  }

  // Обновляем только если поле еще не заполнено
  if (existingUser.traffic_source) {
    console.log("traffic_source уже заполнен, пропускаем обновление");
    return true;
  }

  const { error } = await supabase
    .from("users")
    .update({ traffic_source: trafficSource })
    .eq("telegram_user_id", userId);

  if (error) {
    console.error("Ошибка обновления traffic_source пользователя:", error);
    return false;
  }

  return true;
}
