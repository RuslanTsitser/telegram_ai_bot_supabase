import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface UserLimits {
  canAnalyzeImage: boolean;
  canAnalyzeText: boolean;
  dailyTextAnalysesLeft: number;
  dailyImageAnalysesLeft: number;
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
        dailyImageAnalysesLeft: 0,
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
        dailyImageAnalysesLeft: -1,
        isPremium: true,
      };
    }

    // Для бесплатных пользователей проверяем лимиты
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    // Считаем раздельно анализы за сегодня: текст и изображения
    const [
      { count: textCount, error: textError },
      { count: imageCount, error: imageError },
    ] = await Promise.all([
      supabase
        .from("food_analysis")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("has_image", false)
        .gte("created_at", `${today}T00:00:00.000Z`)
        .lt("created_at", `${today}T23:59:59.999Z`),
      supabase
        .from("food_analysis")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("has_image", true)
        .gte("created_at", `${today}T00:00:00.000Z`)
        .lt("created_at", `${today}T23:59:59.999Z`),
    ]);

    if (textError || imageError) {
      console.error("Error counting daily analyses:", {
        textError,
        imageError,
      });
      return {
        canAnalyzeImage: false,
        canAnalyzeText: false,
        dailyTextAnalysesLeft: 0,
        dailyImageAnalysesLeft: 0,
        isPremium: false,
      };
    }

    const dailyTextCount = textCount || 0;
    const dailyImageCount = imageCount || 0;

    // Квоты для бесплатных пользователей
    const FREE_TEXT_DAILY_LIMIT = 5;
    const FREE_IMAGE_DAILY_LIMIT = 1;

    const dailyTextAnalysesLeft = Math.max(
      0,
      FREE_TEXT_DAILY_LIMIT - dailyTextCount,
    );
    const dailyImageAnalysesLeft = Math.max(
      0,
      FREE_IMAGE_DAILY_LIMIT - dailyImageCount,
    );

    return {
      canAnalyzeImage: dailyImageAnalysesLeft > 0,
      canAnalyzeText: dailyTextAnalysesLeft > 0,
      dailyTextAnalysesLeft,
      dailyImageAnalysesLeft,
      isPremium: false,
    };
  } catch (error) {
    console.error("Error checking user limits:", error);
    return {
      canAnalyzeImage: false,
      canAnalyzeText: false,
      dailyTextAnalysesLeft: 0,
      dailyImageAnalysesLeft: 0,
      isPremium: false,
    };
  }
}
