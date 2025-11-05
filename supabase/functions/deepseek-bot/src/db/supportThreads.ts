import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SupportThread } from "../interfaces/Database.ts";

/**
 * Получает или создает тред поддержки для пользователя
 * @param supabase - клиент Supabase
 * @param telegramUserId - Telegram ID пользователя
 * @param botId - ID бота
 * @param threadId - ID треда в группе поддержки (если тред уже создан)
 * @returns SupportThread или null в случае ошибки
 */
export async function getOrCreateSupportThread(
  supabase: SupabaseClient,
  telegramUserId: number,
  botId: string,
  threadId?: number,
): Promise<SupportThread | null> {
  try {
    // Сначала пытаемся найти существующий тред
    const { data: existingThread, error: findError } = await supabase
      .from("support_threads")
      .select("*")
      .eq("telegram_user_id", telegramUserId)
      .eq("bot_id", botId)
      .maybeSingle();

    if (findError && findError.code !== "PGRST116") {
      console.error("Ошибка поиска треда поддержки:", findError);
      return null;
    }

    // Если тред уже существует, возвращаем его
    if (existingThread) {
      // Если передан новый threadId, обновляем его
      if (threadId && existingThread.thread_id !== threadId) {
        const { data: updatedThread, error: updateError } = await supabase
          .from("support_threads")
          .update({
            thread_id: threadId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingThread.id)
          .select()
          .single();

        if (updateError) {
          console.error("Ошибка обновления треда:", updateError);
          return existingThread;
        }

        return updatedThread;
      }

      return existingThread;
    }

    // Если тред не найден и передан threadId, создаем новый
    if (threadId) {
      const { data: newThread, error: insertError } = await supabase
        .from("support_threads")
        .insert({
          telegram_user_id: telegramUserId,
          thread_id: threadId,
          bot_id: botId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        console.error("Ошибка создания треда поддержки:", insertError);
        return null;
      }

      console.log(
        "Создан тред поддержки для пользователя:",
        telegramUserId,
        "thread_id:",
        threadId,
      );
      return newThread;
    }

    // Если тред не найден и threadId не передан, возвращаем null
    return null;
  } catch (error) {
    console.error("Ошибка обработки треда поддержки:", error);
    return null;
  }
}

/**
 * Получает тред поддержки для пользователя
 * @param supabase - клиент Supabase
 * @param telegramUserId - Telegram ID пользователя
 * @param botId - ID бота
 * @returns SupportThread или null
 */
export async function getSupportThread(
  supabase: SupabaseClient,
  telegramUserId: number,
  botId: string,
): Promise<SupportThread | null> {
  try {
    const { data, error } = await supabase
      .from("support_threads")
      .select("*")
      .eq("telegram_user_id", telegramUserId)
      .eq("bot_id", botId)
      .maybeSingle();

    if (error) {
      console.error("Ошибка получения треда поддержки:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Ошибка получения треда поддержки:", error);
    return null;
  }
}

/**
 * Получает пользователя по ID треда
 * @param supabase - клиент Supabase
 * @param threadId - ID треда в группе поддержки
 * @param botId - ID бота
 * @returns SupportThread или null
 */
export async function getSupportThreadByThreadId(
  supabase: SupabaseClient,
  threadId: number,
  botId: string,
): Promise<SupportThread | null> {
  try {
    const { data, error } = await supabase
      .from("support_threads")
      .select("*")
      .eq("thread_id", threadId)
      .eq("bot_id", botId)
      .maybeSingle();

    if (error) {
      console.error("Ошибка получения треда по thread_id:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Ошибка получения треда по thread_id:", error);
    return null;
  }
}
