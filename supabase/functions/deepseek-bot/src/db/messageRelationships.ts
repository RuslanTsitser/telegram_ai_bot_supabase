import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { MessageRelationship } from "../interfaces/Database.ts";

export async function insertMessageRelationship(
  supabase: SupabaseClient,
  relationship: MessageRelationship,
) {
  const { data, error } = await supabase
    .from("message_relationships")
    .insert(relationship);

  return { data, error };
}

export async function getBotMessageId(
  supabase: SupabaseClient,
  userMessageId: number,
  chatId: number,
  botId: string,
) {
  // First try to find by specific bot_id
  const { data, error } = await supabase
    .from("message_relationships")
    .select("bot_message_id")
    .eq("user_message_id", userMessageId)
    .eq("chat_id", chatId)
    .eq("bot_id", botId)
    .single();

  // If not found, try to find in old records (bot_id='old')
  if (error && error.code === "PGRST116") {
    const { data: oldData, error: oldError } = await supabase
      .from("message_relationships")
      .select("bot_message_id")
      .eq("user_message_id", userMessageId)
      .eq("chat_id", chatId)
      .eq("bot_id", "old")
      .single();

    return { data: oldData, error: oldError };
  }

  return { data, error };
}
