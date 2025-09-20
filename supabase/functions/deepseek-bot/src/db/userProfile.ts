import SupabaseClient from "https://esm.sh/@supabase/supabase-js@2.49.4/dist/module/SupabaseClient.js";
import { UserProfile } from "../interfaces/Database.ts";

// Создание или обновление профиля пользователя
export async function upsertUserProfile(
  supabase: SupabaseClient,
  telegramUserId: number,
  profileData: {
    height_cm?: number | null;
    weight_kg?: number | null;
    target_weight_kg?: number | null;
    gender?: number | null;
    birth_year?: number | null;
    activity_level?: number | null;
  },
): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .upsert({
        telegram_user_id: telegramUserId,
        height_cm: profileData.height_cm,
        weight_kg: profileData.weight_kg,
        target_weight_kg: profileData.target_weight_kg,
        gender: profileData.gender,
        birth_year: profileData.birth_year,
        activity_level: profileData.activity_level,
        updated_at: new Date().toISOString(),
      }, { onConflict: "telegram_user_id" })
      .select()
      .single();

    if (error) {
      console.error("Ошибка upsert профиля пользователя:", error);
      return null;
    }

    console.log("Профиль пользователя обработан:", telegramUserId);
    return data;
  } catch (error) {
    console.error("Ошибка обработки профиля пользователя:", error);
    return null;
  }
}

// Получение профиля пользователя
export async function getUserProfile(
  supabase: SupabaseClient,
  telegramUserId: number,
): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("telegram_user_id", telegramUserId)
      .single();

    if (error) {
      console.error("Ошибка получения профиля пользователя:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Ошибка получения профиля пользователя:", error);
    return null;
  }
}
