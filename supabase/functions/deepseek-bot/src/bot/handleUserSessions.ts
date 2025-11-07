import { Context } from "https://deno.land/x/grammy@v1.8.3/mod.ts";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { BotConfig } from "../config/botConfig.ts";
import { getSupportThread } from "../db/supportThreads.ts";
import { getUserByTelegramId, updateUserPromo } from "../db/upsertUser.ts";
import {
  getUserCalculations,
  getUserProfile,
  upsertUserProfile,
} from "../db/userProfile.ts";
import {
  deleteUserSession,
  getUserSession,
  upsertUserSession,
} from "../db/userSessions.ts";
import { I18n } from "../utils/i18n.ts";

export async function handleUserSession(
  ctx: Context,
  supabase: SupabaseClient,
  i18n: I18n,
  config?: BotConfig,
): Promise<boolean> {
  // Проверка наличия пользователя и сообщения
  if (!ctx.from || !ctx.message) {
    return false;
  }

  const userSession = await getUserSession(supabase, ctx.from.id);

  if (!userSession) {
    return false;
  }

  // Обработка отмены
  if (ctx.message.text === "/cancel") {
    await deleteUserSession(supabase, ctx.from.id);
    return true;
  }

  // Создаем профиль пользователя, если его нет
  const userProfile = await getUserProfile(supabase, ctx.from.id);
  if (!userProfile) {
    await upsertUserProfile(supabase, ctx.from.id, {
      height_cm: 178,
      weight_kg: 80,
      target_weight_kg: 78,
      gender: 0,
      birth_year: 1996,
      activity_level: 1,
    });
  }

  // Обработка состояния waiting_for_height
  if (userSession.current_state === "waiting_for_height") {
    if (ctx.message.text && !isNaN(Number(ctx.message.text))) {
      await upsertUserProfile(
        supabase,
        ctx.from.id,
        { height_cm: Number(ctx.message.text) },
      );
      await upsertUserSession(
        supabase,
        ctx.from.id,
        "waiting_for_weight",
      );
      await ctx.reply(i18n.t("enter_weight"));
    } else {
      await ctx.reply(i18n.t("invalid_height"));
    }
    return true;
  }

  // Обработка состояния waiting_for_weight
  if (userSession.current_state === "waiting_for_weight") {
    if (ctx.message.text && !isNaN(Number(ctx.message.text))) {
      await upsertUserProfile(supabase, ctx.from.id, {
        weight_kg: Number(ctx.message.text),
      });
      await upsertUserSession(
        supabase,
        ctx.from.id,
        "waiting_for_target_weight",
      );
      await ctx.reply(i18n.t("enter_target_weight"));
    } else {
      await ctx.reply(i18n.t("invalid_weight"));
    }
    return true;
  }

  // Обработка состояния waiting_for_target_weight
  if (userSession.current_state === "waiting_for_target_weight") {
    if (ctx.message.text && !isNaN(Number(ctx.message.text))) {
      await upsertUserProfile(supabase, ctx.from.id, {
        target_weight_kg: Number(ctx.message.text),
      });
      await upsertUserSession(supabase, ctx.from.id, "waiting_for_gender");
      await ctx.reply(i18n.t("enter_gender"));
    } else {
      await ctx.reply(i18n.t("invalid_target_weight"));
    }
    return true;
  }

  // Обработка состояния waiting_for_gender
  if (userSession.current_state === "waiting_for_gender") {
    if (ctx.message.text === "М" || ctx.message.text === "Ж") {
      await upsertUserProfile(supabase, ctx.from.id, {
        gender: ctx.message.text === "М" ? 0 : 1,
      });
      await upsertUserSession(supabase, ctx.from.id, "waiting_for_age");
      await ctx.reply(i18n.t("enter_age"));
    } else {
      await ctx.reply(i18n.t("invalid_gender"));
    }
    return true;
  }

  // Обработка состояния waiting_for_age
  if (userSession.current_state === "waiting_for_age") {
    if (ctx.message.text && !isNaN(Number(ctx.message.text))) {
      await upsertUserProfile(supabase, ctx.from.id, {
        birth_year: Number(ctx.message.text),
      });
      await upsertUserSession(
        supabase,
        ctx.from.id,
        "waiting_for_activity_level",
      );
      await ctx.reply(i18n.t("enter_activity_level"));
    } else {
      await ctx.reply(i18n.t("invalid_age"));
    }
    return true;
  }

  // Обработка состояния waiting_for_activity_level
  if (userSession.current_state === "waiting_for_activity_level") {
    if (
      ctx.message.text && !isNaN(Number(ctx.message.text)) &&
      Number(ctx.message.text) >= 0 && Number(ctx.message.text) <= 4
    ) {
      await upsertUserProfile(supabase, ctx.from.id, {
        activity_level: Number(ctx.message.text),
      });
      await deleteUserSession(supabase, ctx.from.id);
      const calculations = await getUserCalculations(supabase, ctx.from.id);
      const finalProfile = await getUserProfile(supabase, ctx.from.id);
      await ctx.reply(`${i18n.t("profile_saved")}
${i18n.t("profile_height")}: ${finalProfile?.height_cm} ${i18n.t("cm")}
${i18n.t("profile_weight")}: ${finalProfile?.weight_kg} ${i18n.t("kg")}
${i18n.t("profile_target_weight")}: ${finalProfile?.target_weight_kg} ${
        i18n.t("kg")
      }
${i18n.t("profile_gender")}: ${
        finalProfile?.gender === 0
          ? i18n.t("profile_male")
          : i18n.t("profile_female")
      }
${i18n.t("profile_birth_year")}: ${finalProfile?.birth_year}
${i18n.t("profile_activity_level")}: ${finalProfile?.activity_level}

${i18n.t("bmi")}: ${calculations?.bmi}
${i18n.t("target_calories")}: ${calculations?.target_calories}
${i18n.t("target_protein")}: ${calculations?.target_protein_g} ${i18n.t("g")}
${i18n.t("target_fats")}: ${calculations?.target_fats_g} ${i18n.t("g")}
${i18n.t("target_carbs")}: ${calculations?.target_carbs_g} ${i18n.t("g")}

${i18n.t("change_profile")}
${i18n.t("profile_settings")}

${i18n.t("start_analysis")}
`);
    } else {
      await ctx.reply(i18n.t("invalid_activity_level"));
    }
    return true;
  }

  // Обработка состояния waiting_for_promo
  if (userSession.current_state === "waiting_for_promo") {
    if (ctx.message.text && ctx.message.text.trim().length > 0) {
      const promoCode = ctx.message.text.trim();
      const success = await updateUserPromo(
        supabase,
        ctx.from.id,
        promoCode,
      );

      if (success) {
        await deleteUserSession(supabase, ctx.from.id);
        await ctx.reply(i18n.t("promo_code_updated", { code: promoCode }));
      } else {
        await ctx.reply(i18n.t("promo_code_update_error"));
      }
    } else {
      await ctx.reply(i18n.t("invalid_promo_code"));
    }
    return true;
  }

  // Обработка состояния support_mode
  if (userSession.current_state === "support_mode") {
    if (!config || !config.supportChannelId) {
      console.log("Support channel not configured");
      return true; // Возвращаем true, чтобы не обрабатывать как анализ питания
    }

    const userId = ctx.from.id;
    const user = await getUserByTelegramId(supabase, userId);

    if (!user) {
      console.error("User not found:", userId);
      return true;
    }

    // Получаем пост поддержки для пользователя
    const supportThread = await getSupportThread(supabase, userId, config.id);

    if (!supportThread || !supportThread.post_id) {
      console.log(
        "Support thread not found, post should be created via /support",
      );
      return true;
    }

    if (!config.supportDiscussionGroupId) {
      console.log("Discussion group not configured");
      return true;
    }

    try {
      let messageText = "";
      let hasMedia = false;

      // Обработка текстового сообщения
      if (ctx.message.text) {
        messageText = ctx.message.text;
      }

      // Обработка фото
      if (ctx.message.photo) {
        hasMedia = true;
        const caption = ctx.message.caption || "";
        if (caption) {
          messageText = caption;
        }
      }

      // Обработка документа
      if (ctx.message.document) {
        hasMedia = true;
        const caption = ctx.message.caption || "";
        if (caption) {
          messageText = caption;
        } else {
          messageText = `📎 ${ctx.message.document.file_name || "Документ"}`;
        }
      }

      // Обработка видео
      if (ctx.message.video) {
        hasMedia = true;
        const caption = ctx.message.caption || "";
        if (caption) {
          messageText = caption;
        } else {
          messageText = "🎥 Видео";
        }
      }

      // Обработка голосового сообщения
      if (ctx.message.voice) {
        hasMedia = true;
        messageText = messageText || "🎤 Голосовое сообщение";
      }

      // Обработка аудио
      if (ctx.message.audio) {
        hasMedia = true;
        const title = ctx.message.audio.title || "Аудио";
        messageText = messageText || `🎵 ${title}`;
      }

      // Если нет текста и нет медиа, пропускаем
      if (!messageText && !hasMedia) {
        return true;
      }

      console.log(
        "Adding comment to support post:",
        supportThread.post_id,
        "for user:",
        userId,
      );

      // Используем discussion_message_id для reply, если он есть
      // Если его еще нет, значит автоматически созданное сообщение от поста еще не обработано
      // В этом случае отправляем без reply - оно будет добавлено позже
      const replyToMessageId = supportThread.discussion_message_id || undefined;

      let sentMessage;
      if (hasMedia) {
        if (ctx.message.photo) {
          const photo = ctx.message.photo[ctx.message.photo.length - 1];
          sentMessage = await ctx.api.sendPhoto(
            config.supportDiscussionGroupId,
            photo.file_id,
            {
              caption: messageText || "",
              reply_to_message_id: replyToMessageId,
            },
          );
        } else if (ctx.message.document) {
          sentMessage = await ctx.api.sendDocument(
            config.supportDiscussionGroupId,
            ctx.message.document.file_id,
            {
              caption: messageText || "",
              reply_to_message_id: replyToMessageId,
            },
          );
        } else if (ctx.message.video) {
          sentMessage = await ctx.api.sendVideo(
            config.supportDiscussionGroupId,
            ctx.message.video.file_id,
            {
              caption: messageText || "",
              reply_to_message_id: replyToMessageId,
            },
          );
        } else if (ctx.message.voice) {
          sentMessage = await ctx.api.sendVoice(
            config.supportDiscussionGroupId,
            ctx.message.voice.file_id,
            {
              caption: messageText || "",
              reply_to_message_id: replyToMessageId,
            },
          );
        } else if (ctx.message.audio) {
          sentMessage = await ctx.api.sendAudio(
            config.supportDiscussionGroupId,
            ctx.message.audio.file_id,
            {
              caption: messageText || "",
              reply_to_message_id: replyToMessageId,
            },
          );
        }
      } else {
        sentMessage = await ctx.api.sendMessage(
          config.supportDiscussionGroupId,
          messageText || "",
          {
            reply_to_message_id: replyToMessageId,
          },
        );
      }

      if (sentMessage) {
        console.log(
          "Support comment added:",
          sentMessage.message_id,
          "to post:",
          supportThread.post_id,
          "reply_to:",
          replyToMessageId || "none",
        );
      }

      return true;
    } catch (error) {
      console.error("Error handling support message:", error);
      return true; // Возвращаем true, чтобы не обрабатывать как анализ питания
    }
  }

  return false;
}
