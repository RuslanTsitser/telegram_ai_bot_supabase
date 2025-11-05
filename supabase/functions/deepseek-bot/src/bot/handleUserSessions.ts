import { Context } from "https://deno.land/x/grammy@v1.8.3/mod.ts";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { updateUserPromo } from "../db/upsertUser.ts";
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

  return false;
}
