import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PhysicalActivityData } from "../interfaces/Database.ts";

export async function insertPhysicalActivity(
  supabase: SupabaseClient,
  activityData: PhysicalActivityData,
): Promise<PhysicalActivityData | null> {
  // Удаляем запись из food_analysis, если она существует (на случай изменения типа контента)
  const { error: deleteError } = await supabase
    .from("food_analysis")
    .delete()
    .eq("message_id", activityData.message_id)
    .eq("chat_id", activityData.chat_id)
    .eq("bot_id", activityData.bot_id);

  if (deleteError) {
    console.error("Error deleting food analysis:", deleteError);
  }

  const { data, error } = await supabase
    .from("physical_activities")
    .insert(activityData)
    .select()
    .single();

  if (error) {
    console.error("Error inserting physical activity:", error);
    return null;
  }

  return data;
}

export async function upsertPhysicalActivity(
  supabase: SupabaseClient,
  activityData: PhysicalActivityData,
): Promise<PhysicalActivityData | null> {
  // Удаляем запись из food_analysis, если она существует (на случай изменения типа контента)
  const { error: deleteError } = await supabase
    .from("food_analysis")
    .delete()
    .eq("message_id", activityData.message_id)
    .eq("chat_id", activityData.chat_id)
    .eq("bot_id", activityData.bot_id);

  if (deleteError) {
    console.error("Error deleting food analysis:", deleteError);
  }

  const { data, error } = await supabase
    .from("physical_activities")
    .upsert(activityData, {
      onConflict: "message_id,chat_id,bot_id",
    })
    .select()
    .single();

  if (error) {
    console.error("Error upserting physical activity:", error);
    return null;
  }

  return data;
}
