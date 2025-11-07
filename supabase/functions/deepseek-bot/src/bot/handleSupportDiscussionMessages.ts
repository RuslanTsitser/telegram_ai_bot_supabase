import { Context } from "https://deno.land/x/grammy@v1.8.3/mod.ts";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { BotConfig } from "../config/botConfig.ts";

/**
 * Обрабатывает сообщения из группы обсуждений поддержки
 * - Сохраняет discussion_message_id для автоматически созданных сообщений от постов
 * - Пересылает сообщения от агентов поддержки пользователям
 */
export async function handleSupportDiscussionMessage(
  ctx: Context,
  config: BotConfig,
  supabase: SupabaseClient,
): Promise<boolean> {
  if (!ctx.message) {
    return false;
  }

  const chatType = ctx.message.chat.type;
  const chatId = ctx.message.chat.id;

  // Проверяем, что это группа обсуждений поддержки
  if (
    chatType !== "supergroup" ||
    config.supportDiscussionGroupId !== chatId
  ) {
    return false;
  }

  // Обрабатываем автоматически созданное сообщение от поста в канале
  if (ctx.message.forward_from_chat?.id === config.supportChannelId) {
    // Это автоматически созданное сообщение от поста в канале
    // Сохраняем его message_id как discussion_message_id
    const forwardedFromMessageId = ctx.message.forward_from_message_id;

    if (forwardedFromMessageId) {
      // Находим пост по post_id (forwarded_from_message_id)
      const { data: supportThread } = await supabase
        .from("support_threads")
        .select("*")
        .eq("post_id", forwardedFromMessageId)
        .eq("bot_id", config.id)
        .maybeSingle();

      if (supportThread && !supportThread.discussion_message_id) {
        // Сохраняем discussion_message_id
        await supabase
          .from("support_threads")
          .update({
            discussion_message_id: ctx.message.message_id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", supportThread.id);

        console.log(
          "Saved discussion_message_id:",
          ctx.message.message_id,
          "for post:",
          forwardedFromMessageId,
        );
      }
    }
    return true;
  }

  // Обрабатываем сообщения от агентов поддержки
  // Игнорируем сообщения от бота
  if (ctx.from?.id === ctx.me.id) {
    return true;
  }

  // Ищем пост по reply_to_message_id (это может быть discussion_message_id или другое сообщение в треде)
  const replyToMessageId = ctx.message.reply_to_message?.message_id;

  if (replyToMessageId) {
    // Сначала ищем по discussion_message_id
    const { data: supportThread } = await supabase
      .from("support_threads")
      .select("*")
      .eq("discussion_message_id", replyToMessageId)
      .eq("bot_id", config.id)
      .maybeSingle();

    // Если не нашли, возможно это ответ на другое сообщение в треде
    // В этом случае нужно найти через цепочку reply_to_message_id
    // Пока что просто пропускаем такие сообщения
    if (!supportThread) {
      console.log(
        "Could not find support thread for reply_to_message_id:",
        replyToMessageId,
      );
      return true;
    }

    if (supportThread) {
      // Нашли пост, пересылаем сообщение пользователю
      const userId = supportThread.telegram_user_id;

      try {
        // Пересылаем сообщение пользователю
        if (ctx.message.photo) {
          const photo = ctx.message.photo[ctx.message.photo.length - 1];
          await ctx.api.sendPhoto(userId, photo.file_id, {
            caption: ctx.message.caption || "",
          });
        } else if (ctx.message.document) {
          await ctx.api.sendDocument(
            userId,
            ctx.message.document.file_id,
            {
              caption: ctx.message.caption || "",
            },
          );
        } else if (ctx.message.video) {
          await ctx.api.sendVideo(userId, ctx.message.video.file_id, {
            caption: ctx.message.caption || "",
          });
        } else if (ctx.message.voice) {
          await ctx.api.sendVoice(userId, ctx.message.voice.file_id, {
            caption: ctx.message.caption || "",
          });
        } else if (ctx.message.audio) {
          await ctx.api.sendAudio(userId, ctx.message.audio.file_id, {
            caption: ctx.message.caption || "",
          });
        } else if (ctx.message.text) {
          await ctx.api.sendMessage(userId, ctx.message.text);
        } else {
          // Если тип сообщения не поддерживается, отправляем уведомление
          await ctx.api.sendMessage(
            userId,
            "📨 Получено сообщение от поддержки (тип сообщения не поддерживается для пересылки)",
          );
        }

        console.log(
          "Forwarded support message to user:",
          userId,
          "from agent:",
          ctx.from?.id,
        );
      } catch (error) {
        console.error(
          "Error forwarding support message to user:",
          userId,
          error,
        );
      }
    }
  }

  return true;
}
