import { Context } from "https://deno.land/x/grammy@v1.8.3/context.ts";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getUserLanguage } from "../db/upsertUser.ts";
import { createI18n } from "../utils/i18n.ts";
import { logEvent } from "../utils/analytics.ts";

export async function onboardingSimple(
  ctx: Context,
  supabase: SupabaseClient,
) {
  let userLanguage = "ru";
  if (supabase && ctx.from) {
    userLanguage = await getUserLanguage(supabase, ctx.from.id);
  }
  const i18n = createI18n(userLanguage);
  if (userLanguage === "ru") {
    await ctx.replyWithPhoto(
      "AgACAgIAAxkBAAIIJWkDdGwY9buW3LzcQmuxxf_zmra0AAKt9zEbGagYSAMKy2nrzFAeAQADAgADcwADNgQ",
      {
        caption: `${i18n.t("onboarding_simple_line1")}

${i18n.t("onboarding_simple_help")}

${i18n.t("onboarding_simple_promo")}`,
      },
    );
  } else {
    await ctx.reply(
      `${i18n.t("onboarding_simple_line1")}
    
${i18n.t("onboarding_simple_help")}

${i18n.t("onboarding_simple_promo")}`,
    );
  }

  // Логируем событие онбординга
  if (ctx.from) {
    await logEvent(ctx.from.id, "telegram", "onboarding_completed", {
      language: userLanguage,
      has_photo: userLanguage === "ru",
    });
  }
}
