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

/** Захват обработки update до генерации. bot_message_id=0 — placeholder. */
export async function claimMessageProcessing(
  supabase: SupabaseClient,
  userMessageId: number,
  chatId: number,
  botId: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("message_relationships")
    .insert({
      user_message_id: userMessageId,
      bot_message_id: 0,
      chat_id: chatId,
      bot_id: botId,
    });

  if (error) {
    // 23505 — уже обрабатывается или обработано (ретрай Telegram webhook)
    if (error.code === "23505") {
      console.log(
        `Skip duplicate processing for message ${userMessageId} chat ${chatId} bot ${botId}`,
      );
      return false;
    }
    console.error("Error claiming message processing:", error);
    return false;
  }

  return true;
}

export async function updateMessageRelationshipBotMessageId(
  supabase: SupabaseClient,
  userMessageId: number,
  chatId: number,
  botId: string,
  botMessageId: number,
) {
  const { data, error } = await supabase
    .from("message_relationships")
    .update({ bot_message_id: botMessageId })
    .eq("user_message_id", userMessageId)
    .eq("chat_id", chatId)
    .eq("bot_id", botId);

  return { data, error };
}

export async function releaseMessageClaim(
  supabase: SupabaseClient,
  userMessageId: number,
  chatId: number,
  botId: string,
) {
  const { error } = await supabase
    .from("message_relationships")
    .delete()
    .eq("user_message_id", userMessageId)
    .eq("chat_id", chatId)
    .eq("bot_id", botId)
    .eq("bot_message_id", 0);

  if (error) {
    console.error("Error releasing message claim:", error);
  }
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
