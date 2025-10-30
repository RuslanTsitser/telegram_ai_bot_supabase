import { Context } from "https://deno.land/x/grammy@v1.8.3/context.ts";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getUserLanguage } from "../db/upsertUser.ts";
import { createI18n } from "../utils/i18n.ts";

export async function onboarding(ctx: Context, supabase?: SupabaseClient) {
  console.log("help command");

  // Получаем язык пользователя и создаем i18n экземпляр
  let userLanguage = "ru";
  if (supabase && ctx.from) {
    userLanguage = await getUserLanguage(supabase, ctx.from.id);
  }
  const i18n = createI18n(userLanguage);

  await ctx.reply(
    `${i18n.t("onboarding_welcome")}

${i18n.t("onboarding_description")}

${i18n.t("onboarding_photo")}
${i18n.t("onboarding_text")}

${i18n.t("onboarding_examples_title")}
${i18n.t("onboarding_example1")}
${i18n.t("onboarding_example2")}
${i18n.t("onboarding_example3")}
`,
  );
  await ctx.reply(
    `${i18n.t("onboarding_important")}

${i18n.t("onboarding_text_tip")}
${i18n.t("onboarding_photo_tip")}

${i18n.t("onboarding_edit_tip")}


${i18n.t("onboarding_app_title")}
      
${i18n.t("onboarding_app_feature1")}
${i18n.t("onboarding_app_feature2")}
${i18n.t("onboarding_app_feature3")}
`,
  );
  await ctx.reply(
    `${i18n.t("onboarding_limits")}

${i18n.t("onboarding_premium")}
${i18n.t("onboarding_premium_photo")}

${i18n.t("onboarding_subscribe")}

${i18n.t("onboarding_promo")}

${i18n.t("onboarding_profile")}
      `,
  );
}
