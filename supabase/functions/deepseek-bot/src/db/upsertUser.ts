import { Context } from "https://deno.land/x/grammy@v1.8.3/mod.ts";
import SupabaseClient from "https://esm.sh/@supabase/supabase-js@2.49.4/dist/module/SupabaseClient.js";
import { DbUser } from "../interfaces/Database.ts";

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

    if (error) console.error("Ошибка upsert пользователя:", error);
    else console.log("Пользователь обработан:", ctx.from.id);
  } catch (error) {
    console.error("Ошибка обработки пользователя:", error);
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
