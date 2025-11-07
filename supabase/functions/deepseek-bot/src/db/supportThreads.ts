import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SupportThread } from "../interfaces/Database.ts";

/**
 * Получает или создает пост поддержки для пользователя
 * @param supabase - клиент Supabase
 * @param telegramUserId - Telegram ID пользователя
 * @param botId - ID бота
 * @param postId - ID поста в канале поддержки (если пост уже создан)
 * @returns SupportThread или null в случае ошибки
 */
export async function getOrCreateSupportThread(
  supabase: SupabaseClient,
  telegramUserId: number,
  botId: string,
  postId?: number,
): Promise<SupportThread | null> {
  try {
    // Сначала пытаемся найти существующий пост
    const { data: existingThread, error: findError } = await supabase
      .from("support_threads")
      .select("*")
      .eq("telegram_user_id", telegramUserId)
      .eq("bot_id", botId)
      .maybeSingle();

    if (findError && findError.code !== "PGRST116") {
      console.error("Ошибка поиска поста поддержки:", findError);
      return null;
    }

    // Если пост уже существует, возвращаем его
    if (existingThread) {
      // Если передан новый postId, обновляем его
      if (postId && existingThread.post_id !== postId) {
        const { data: updatedThread, error: updateError } = await supabase
          .from("support_threads")
          .update({
            post_id: postId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingThread.id)
          .select()
          .single();

        if (updateError) {
          console.error("Ошибка обновления поста:", updateError);
          return existingThread;
        }

        return updatedThread;
      }

      return existingThread;
    }

    // Если пост не найден и передан postId, создаем новый
    if (postId) {
      const { data: newThread, error: insertError } = await supabase
        .from("support_threads")
        .insert({
          telegram_user_id: telegramUserId,
          post_id: postId,
          bot_id: botId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        console.error("Ошибка создания поста поддержки:", insertError);
        return null;
      }

      console.log(
        "Создан пост поддержки для пользователя:",
        telegramUserId,
        "post_id:",
        postId,
      );
      return newThread;
    }

    // Если пост не найден и postId не передан, возвращаем null
    return null;
  } catch (error) {
    console.error("Ошибка обработки поста поддержки:", error);
    return null;
  }
}

/**
 * Получает пост поддержки для пользователя
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
      console.error("Ошибка получения поста поддержки:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Ошибка получения поста поддержки:", error);
    return null;
  }
}

/**
 * Получает пользователя по ID поста в канале
 * @param supabase - клиент Supabase
 * @param postId - ID поста в канале поддержки
 * @param botId - ID бота
 * @returns SupportThread или null
 */
export async function getSupportThreadByPostId(
  supabase: SupabaseClient,
  postId: number,
  botId: string,
): Promise<SupportThread | null> {
  try {
    const { data, error } = await supabase
      .from("support_threads")
      .select("*")
      .eq("post_id", postId)
      .eq("bot_id", botId)
      .maybeSingle();

    if (error) {
      console.error("Ошибка получения поста по post_id:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Ошибка получения поста по post_id:", error);
    return null;
  }
}
