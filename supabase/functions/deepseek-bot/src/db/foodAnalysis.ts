import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { FoodAnalysisData } from "../interfaces/Database.ts";

export async function insertFoodAnalysis(
  supabase: SupabaseClient,
  analysisData: FoodAnalysisData,
): Promise<FoodAnalysisData | null> {
  const { data, error } = await supabase
    .from("food_analysis")
    .insert(analysisData);

  if (error) {
    console.error("Error inserting food analysis:", error);
    return null;
  }

  return data;
}

export async function upsertFoodAnalysis(
  supabase: SupabaseClient,
  analysisData: FoodAnalysisData,
): Promise<FoodAnalysisData | null> {
  const { data, error } = await supabase
    .from("food_analysis")
    .upsert(analysisData, {
      onConflict: "message_id,chat_id,bot_id",
    });

  if (error) {
    console.error("Error upserting food analysis:", error);
    return null;
  }

  return data;
}

export async function getDailyAnalysisCount(
  supabase: SupabaseClient,
  userId: number,
): Promise<number> {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format

  const { count, error } = await supabase
    .from("food_analysis")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", `${today}T00:00:00Z`)
    .lt("created_at", `${today}T23:59:59Z`);

  if (error) {
    console.error("Error getting daily analysis count:", error);
    return 0;
  }

  return count || 0;
}

// Обновление стриков пользователя (оптимизированная версия)
export async function updateUserStreaks(
  supabase: SupabaseClient,
  userId: number,
): Promise<void> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.toISOString();
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);
    const todayEndISO = todayEnd.toISOString();

    // Проверяем, есть ли записи за сегодня (кроме только что добавленной)
    // Если это первый анализ сегодня - нужно обновить стрик
    const { count: todayCount, error: todayError } = await supabase
      .from("food_analysis")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", todayStart)
      .lte("created_at", todayEndISO);

    if (todayError) {
      console.error("Error checking today's analyses:", todayError);
      return;
    }

    // Если это не первый анализ сегодня (уже есть записи) - пропускаем обновление
    // Стрик уже был обновлен при первом анализе сегодня
    if (todayCount && todayCount > 1) {
      return;
    }

    // Если это первый анализ сегодня (todayCount === 1) - обновляем стрик

    // Получаем профиль пользователя
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("current_streak, longest_streak")
      .eq("telegram_user_id", userId)
      .single();

    if (profileError) {
      console.error("Error fetching user profile:", profileError);
      return;
    }

    const currentStreak = profile?.current_streak ?? 0;
    const longestStreak = profile?.longest_streak ?? 0;

    // Проверяем, была ли запись вчера
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStart = yesterday.toISOString();
    const yesterdayEnd = new Date(yesterday);
    yesterdayEnd.setHours(23, 59, 59, 999);
    const yesterdayEndISO = yesterdayEnd.toISOString();

    const { count: yesterdayCount, error: yesterdayError } = await supabase
      .from("food_analysis")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", yesterdayStart)
      .lte("created_at", yesterdayEndISO);

    if (yesterdayError) {
      console.error("Error checking yesterday's analyses:", yesterdayError);
      return;
    }

    // Если это первый анализ сегодня - инкрементируем стрик
    // Если была запись вчера - инкрементируем стрик
    // Если не было записи вчера - стрик начинается с 1 (первый день)
    let newCurrentStreak = 1; // Минимум 1, так как есть запись сегодня
    if (yesterdayCount && yesterdayCount > 0) {
      // Если была запись вчера - инкрементируем стрик
      newCurrentStreak = currentStreak + 1;
    }

    // Обновляем longest_streak, если текущий больше
    const newLongestStreak = Math.max(longestStreak, newCurrentStreak);

    const updateData: {
      current_streak: number;
      longest_streak: number;
      updated_at: string;
    } = {
      current_streak: newCurrentStreak,
      longest_streak: newLongestStreak,
      updated_at: new Date().toISOString(),
    };

    // Обновляем профиль
    const { error: updateError } = await supabase
      .from("user_profiles")
      .update(updateData)
      .eq("telegram_user_id", userId);

    if (updateError) {
      console.error("Error updating user streaks:", updateError);
    }
  } catch (error) {
    console.error("Unexpected error updating streaks:", error);
  }
}
