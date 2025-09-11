import { Context } from "https://deno.land/x/grammy@v1.8.3/mod.ts";
import SupabaseClient from "https://esm.sh/@supabase/supabase-js@2.49.4/dist/module/SupabaseClient.js";
import { DbUser } from "../interfaces/Database.ts";

// Простые функции для работы с пользователями
export async function upsertUser(ctx: Context, supabase: SupabaseClient) {
  if (!ctx.from) return;

  try {
    const { error } = await supabase
      .from("users")
      .upsert({
        telegram_user_id: ctx.from.id,
        username: ctx.from.username,
        first_name: ctx.from.first_name,
        last_name: ctx.from.last_name,
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
