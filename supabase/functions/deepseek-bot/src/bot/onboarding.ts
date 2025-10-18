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

${i18n.t("onboarding_screenshots")}
`,
  );
  await ctx.replyWithMediaGroup(
    [
      {
        type: "photo",
        media:
          "AgACAgIAAxkBAAN5aM83AraxWdMb0VAbzm9OOBV1EqkAAlL-MRsQV3lKH6ogu4OcFAgBAAMCAANzAAM2BA",
        caption: i18n.t("onboarding_caption_text_example"),
      },
      {
        type: "photo",
        media:
          "AgACAgIAAxkBAAN1aM820o_W4VdPCpQD9m42j1xAw6AAAk_-MRsQV3lKHdyf7b71FBsBAAMCAANzAAM2BA",
        caption: i18n.t("onboarding_caption_photo_example"),
      },
      {
        type: "photo",
        media:
          "AgACAgIAAxkBAAN7aM83YQTSpL36ZHfayt3Efy_pihoAAlP-MRsQV3lKEsYYtSq8VnQBAAMCAANzAAM2BA",
        caption: i18n.t("onboarding_caption_combined_example"),
      },
    ],
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
  await ctx.replyWithMediaGroup(
    [
      {
        type: "photo",
        media:
          "AgACAgIAAxkBAAIBO2jRBCH8JqaOTGsgGa29kd5BdxlwAAJ_-DEbb8mJSim1lXipgfDHAQADAgADcwADNgQ",
        caption: i18n.t("onboarding_caption_app_open"),
      },
      {
        type: "photo",
        media:
          "AgACAgIAAxkBAAN_aM84MeSw1UYzFcffxt097bTFwkEAAlb-MRsQV3lK0RIdz0z3sWgBAAMCAANzAAM2BA",
        caption: i18n.t("onboarding_caption_stats"),
      },
      {
        type: "photo",
        media:
          "AgACAgIAAxkBAAODaM88IT4Pg_aFr8k6Ig4OA3HLAccAAmH-MRsQV3lKRgU9rXrobOsBAAMCAANzAAM2BA",
        caption: i18n.t("onboarding_caption_delete"),
      },
      {
        type: "photo",
        media:
          "AgACAgIAAxkBAAN9aM84J563FTmJstC7314Dw52IYYQAAlX-MRsQV3lKAVdPUc4iK6UBAAMCAANzAAM2BA",
        caption: i18n.t("onboarding_caption_profile"),
      },
    ],
  );
  await ctx.reply(`
${i18n.t("onboarding_limits")}

${i18n.t("onboarding_premium")}
${i18n.t("onboarding_premium_photo")}

${i18n.t("onboarding_subscribe")}

${i18n.t("onboarding_profile")}
      `);
}
