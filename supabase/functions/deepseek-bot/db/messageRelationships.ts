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
) {
  const { data, error } = await supabase
    .from("message_relationships")
    .select("bot_message_id")
    .eq("user_message_id", userMessageId)
    .eq("chat_id", chatId)
    .single();

  return { data, error };
}
