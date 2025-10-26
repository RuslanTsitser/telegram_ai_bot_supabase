import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

interface UserStats {
  user_id: number;
  total_analyses: number;
  analyses_with_images: number;
  avg_calories: number | null;
  avg_protein: number | null;
  avg_carbs: number | null;
  avg_fats: number | null;
  avg_nutrition_score: number | null;
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

    // Get all analyses for the user
    const { data: analyses, error: analysesError } = await supabase
      .from("food_analysis")
      .select("*")
      .eq("user_id", user_id);

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
        avg_calories: null,
        avg_protein: null,
        avg_carbs: null,
        avg_fats: null,
        avg_nutrition_score: null,
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
    const totalAnalyses = analyses.length;
    const analysesWithImages = analyses.filter((analysis) =>
      analysis.has_image
    ).length;

    // Calculate averages for nutritional values
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
    const validNutritionScore = analyses.filter((a) =>
      a.nutrition_score !== null && a.nutrition_score !== undefined
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

    const avgNutritionScore = validNutritionScore.length > 0
      ? Math.round(
        (validNutritionScore.reduce((sum, a) => sum + a.nutrition_score, 0) /
          validNutritionScore.length) * 10,
      ) / 10
      : null;

    const userStats: UserStats = {
      user_id: user_id,
      total_analyses: totalAnalyses,
      analyses_with_images: analysesWithImages,
      avg_calories: avgCalories,
      avg_protein: avgProtein,
      avg_carbs: avgCarbs,
      avg_fats: avgFats,
      avg_nutrition_score: avgNutritionScore,
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
