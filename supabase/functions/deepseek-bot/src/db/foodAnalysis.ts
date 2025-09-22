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
