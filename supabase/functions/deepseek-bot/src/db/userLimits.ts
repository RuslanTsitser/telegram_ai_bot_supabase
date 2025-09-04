import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface UserLimits {
  canAnalyzeImage: boolean;
  canAnalyzeText: boolean;
  dailyTextAnalysesLeft: number;
  isPremium: boolean;
}

export async function checkUserLimits(
  userId: number,
  supabase: SupabaseClient,
): Promise<UserLimits> {
  try {
    // Получаем информацию о пользователе
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("is_premium, premium_expires_at")
      .eq("telegram_user_id", userId)
      .single();

    if (userError || !user) {
      return {
        canAnalyzeImage: false,
        canAnalyzeText: false,
        dailyTextAnalysesLeft: 0,
        isPremium: false,
      };
    }

    // Проверяем премиум статус
    const isPremium = user.is_premium ||
      (user.premium_expires_at &&
        new Date(user.premium_expires_at) > new Date());

    if (isPremium) {
      // Премиум пользователи без ограничений
      return {
        canAnalyzeImage: true,
        canAnalyzeText: true,
        dailyTextAnalysesLeft: -1, // -1 означает без ограничений
        isPremium: true,
      };
    }

    // Для бесплатных пользователей проверяем лимиты
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    // Считаем анализы за сегодня
    const { data: todayAnalyses, error: countError } = await supabase
      .from("food_analysis")
      .select("id", { count: "exact" })
      .eq("user_id", userId)
      .gte("created_at", `${today}T00:00:00.000Z`)
      .lt("created_at", `${today}T23:59:59.999Z`);

    if (countError) {
      console.error("Error counting daily analyses:", countError);
      return {
        canAnalyzeImage: false,
        canAnalyzeText: false,
        dailyTextAnalysesLeft: 0,
        isPremium: false,
      };
    }

    const dailyCount = todayAnalyses?.length || 0;
    const dailyTextAnalysesLeft = Math.max(0, 5 - dailyCount);

    return {
      canAnalyzeImage: false, // Бесплатные пользователи не могут анализировать изображения
      canAnalyzeText: dailyTextAnalysesLeft > 0,
      dailyTextAnalysesLeft,
      isPremium: false,
    };
  } catch (error) {
    console.error("Error checking user limits:", error);
    return {
      canAnalyzeImage: false,
      canAnalyzeText: false,
      dailyTextAnalysesLeft: 0,
      isPremium: false,
    };
  }
}
