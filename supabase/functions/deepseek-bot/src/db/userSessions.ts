import SupabaseClient from "https://esm.sh/@supabase/supabase-js@2.49.4/dist/module/SupabaseClient.js";
import { UserSession } from "../interfaces/UserSession.ts";

// Создание или обновление сессии пользователя
export async function upsertUserSession(
  supabase: SupabaseClient,
  telegramUserId: number,
  currentState: UserSession["current_state"] = "waiting_for_height",
): Promise<UserSession | null> {
  try {
    const { data, error } = await supabase
      .from("user_sessions")
      .upsert({
        telegram_user_id: telegramUserId,
        current_state: currentState,
        updated_at: new Date().toISOString(),
      }, { onConflict: "telegram_user_id" })
      .select()
      .single();

    if (error) {
      console.error("Ошибка upsert сессии пользователя:", error);
      return null;
    }

    console.log("Сессия пользователя обработана:", telegramUserId);
    return data;
  } catch (error) {
    console.error("Ошибка обработки сессии пользователя:", error);
    return null;
  }
}

// Получение текущей сессии пользователя
export async function getUserSession(
  supabase: SupabaseClient,
  telegramUserId: number,
): Promise<UserSession | null> {
  try {
    const { data, error } = await supabase
      .from("user_sessions")
      .select("*")
      .eq("telegram_user_id", telegramUserId)
      .single();

    if (error) {
      console.error("Ошибка получения сессии пользователя:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Ошибка получения сессии пользователя:", error);
    return null;
  }
}

// Удаление сессии пользователя (опционально)
export async function deleteUserSession(
  supabase: SupabaseClient,
  telegramUserId: number,
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("user_sessions")
      .delete()
      .eq("telegram_user_id", telegramUserId);

    if (error) {
      console.error("Ошибка удаления сессии:", error);
      return false;
    }

    console.log("Сессия пользователя удалена:", telegramUserId);
    return true;
  } catch (error) {
    console.error("Ошибка удаления сессии:", error);
    return false;
  }
}
