import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

interface UserStats {
  user_id: number;
  total_analyses: number;
  analyses_with_images: number;
  avg_daily_calories: number | null;
  avg_daily_protein: number | null;
  avg_daily_carbs: number | null;
  avg_daily_fats: number | null;
  avg_calories: number | null;
  avg_protein: number | null;
  avg_carbs: number | null;
  avg_fats: number | null;
  avg_nutrition_score: number | null;
  active_days: number;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Parse request body to get user_id
    const { user_id } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({
          error: "user_id is required",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    }

    // Get counts using count queries
    const [
      { count: totalCount, error: totalCountError },
      { count: imagesCount, error: imagesCountError },
    ] = await Promise.all([
      supabase
        .from("food_analysis")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user_id),
      supabase
        .from("food_analysis")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user_id)
        .eq("has_image", true),
    ]);

    if (totalCountError || imagesCountError) {
      console.error(
        "Error fetching counts:",
        totalCountError || imagesCountError,
      );
      return new Response(
        JSON.stringify({
          error: "Failed to fetch counts",
          details: (totalCountError || imagesCountError)?.message,
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    }

    // Get analyses for average calculations (one query, up to 1000 records)
    const { data: analyses, error: analysesError } = await supabase
      .from("food_analysis")
      .select("*")
      .eq("user_id", user_id)
      .order("created_at", { ascending: true });

    if (analysesError) {
      console.error("Error fetching user analyses:", analysesError);
      return new Response(
        JSON.stringify({
          error: "Failed to fetch user analyses",
          details: analysesError.message,
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    }

    if (!analyses || analyses.length === 0) {
      const emptyStats: UserStats = {
        user_id: user_id,
        total_analyses: 0,
        analyses_with_images: 0,
        avg_daily_calories: null,
        avg_daily_protein: null,
        avg_daily_carbs: null,
        avg_daily_fats: null,
        avg_calories: null,
        avg_protein: null,
        avg_carbs: null,
        avg_fats: null,
        avg_nutrition_score: null,
        active_days: 0,
      };

      return new Response(
        JSON.stringify({
          success: true,
          data: emptyStats,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    }

    // Calculate statistics
    const totalAnalyses = totalCount || 0;
    const analysesWithImages = imagesCount || 0;

    // Calculate unique days when user made analyses
    const uniqueDays = new Set();
    analyses.forEach((analysis) => {
      if (analysis.created_at) {
        const date = new Date(analysis.created_at).toDateString();
        uniqueDays.add(date);
      }
    });
    const activeDays = uniqueDays.size;

    // Calculate daily totals for nutritional values
    const dailyTotals: {
      [key: string]: {
        calories: number;
        protein: number;
        carbs: number;
        fats: number;
        count: number;
      };
    } = {};

    analyses.forEach((analysis) => {
      if (analysis.created_at) {
        const date = new Date(analysis.created_at).toDateString();

        if (!dailyTotals[date]) {
          dailyTotals[date] = {
            calories: 0,
            protein: 0,
            carbs: 0,
            fats: 0,
            count: 0,
          };
        }

        if (analysis.calories !== null && analysis.calories !== undefined) {
          dailyTotals[date].calories += analysis.calories;
        }
        if (analysis.protein !== null && analysis.protein !== undefined) {
          dailyTotals[date].protein += analysis.protein;
        }
        if (analysis.carbs !== null && analysis.carbs !== undefined) {
          dailyTotals[date].carbs += analysis.carbs;
        }
        if (analysis.fats !== null && analysis.fats !== undefined) {
          dailyTotals[date].fats += analysis.fats;
        }
        dailyTotals[date].count++;
      }
    });

    // Calculate average daily values
    const avgDailyCalories = activeDays > 0
      ? Math.round(
        (Object.values(dailyTotals).reduce(
          (sum, day) => sum + day.calories,
          0,
        ) / activeDays) * 10,
      ) / 10
      : null;

    const avgDailyProtein = activeDays > 0
      ? Math.round(
        (Object.values(dailyTotals).reduce((sum, day) => sum + day.protein, 0) /
          activeDays) * 10,
      ) / 10
      : null;

    const avgDailyCarbs = activeDays > 0
      ? Math.round(
        (Object.values(dailyTotals).reduce((sum, day) => sum + day.carbs, 0) /
          activeDays) * 10,
      ) / 10
      : null;

    const avgDailyFats = activeDays > 0
      ? Math.round(
        (Object.values(dailyTotals).reduce((sum, day) => sum + day.fats, 0) /
          activeDays) * 10,
      ) / 10
      : null;

    // Calculate average nutrition score (still per analysis, not daily)
    const validNutritionScore = analyses.filter((a) =>
      a.nutrition_score !== null && a.nutrition_score !== undefined
    );
    const avgNutritionScore = validNutritionScore.length > 0
      ? Math.round(
        (validNutritionScore.reduce((sum, a) => sum + a.nutrition_score, 0) /
          validNutritionScore.length) * 10,
      ) / 10
      : null;

    // Calculate regular averages for nutritional values (per analysis)
    const validCalories = analyses.filter((a) =>
      a.calories !== null && a.calories !== undefined
    );
    const validProtein = analyses.filter((a) =>
      a.protein !== null && a.protein !== undefined
    );
    const validCarbs = analyses.filter((a) =>
      a.carbs !== null && a.carbs !== undefined
    );
    const validFats = analyses.filter((a) =>
      a.fats !== null && a.fats !== undefined
    );

    const avgCalories = validCalories.length > 0
      ? Math.round(
        (validCalories.reduce((sum, a) => sum + a.calories, 0) /
          validCalories.length) * 10,
      ) / 10
      : null;

    const avgProtein = validProtein.length > 0
      ? Math.round(
        (validProtein.reduce((sum, a) => sum + a.protein, 0) /
          validProtein.length) * 10,
      ) / 10
      : null;

    const avgCarbs = validCarbs.length > 0
      ? Math.round(
        (validCarbs.reduce((sum, a) => sum + a.carbs, 0) / validCarbs.length) *
          10,
      ) / 10
      : null;

    const avgFats = validFats.length > 0
      ? Math.round(
        (validFats.reduce((sum, a) => sum + a.fats, 0) / validFats.length) * 10,
      ) / 10
      : null;

    const userStats: UserStats = {
      user_id: user_id,
      total_analyses: totalAnalyses,
      analyses_with_images: analysesWithImages,
      avg_daily_calories: avgDailyCalories,
      avg_daily_protein: avgDailyProtein,
      avg_daily_carbs: avgDailyCarbs,
      avg_daily_fats: avgDailyFats,
      avg_calories: avgCalories,
      avg_protein: avgProtein,
      avg_carbs: avgCarbs,
      avg_fats: avgFats,
      avg_nutrition_score: avgNutritionScore,
      active_days: activeDays,
    };

    return new Response(
      JSON.stringify({
        success: true,
        data: userStats,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }
});
