import { Context } from "https://deno.land/x/grammy@v1.8.3/context.ts";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getUserLanguage } from "../db/upsertUser.ts";
import { createI18n } from "../utils/i18n.ts";

export async function onboardingSimple(
  ctx: Context,
  supabase: SupabaseClient,
) {
  let userLanguage = "ru";
  if (supabase && ctx.from) {
    userLanguage = await getUserLanguage(supabase, ctx.from.id);
  }
  const i18n = createI18n(userLanguage);

  await ctx.reply(
    `${i18n.t("onboarding_simple_line1")}

${i18n.t("onboarding_simple_help")}`,
  );
}
