import { Context } from "https://deno.land/x/grammy@v1.8.3/context.ts";

export async function onboarding(ctx: Context) {
  console.log("help command");
  await ctx.reply(
    `
👋 Привет! Я бот для анализа питания.

🤖 Я помогу вам посчитать КБЖУ блюда по текстовому описанию или фотографии.

📸 Для анализа по фотографии достаточно отправить фотографию блюда.
✍️ Для анализа по описанию достаточно отправить текст с описанием блюда.

📝 Примеры текстового описания блюда:
- Макароны из твердых сортов пшеницы вареные в воде 100 г, куриное филе отварное 100 г
- Бургер из KFC с картофелем фри и напитком 500 мл
- Перекус из банана и йогурта

Ниже приведены скриншоты примеров анализа по фотографии
`,
  );
  await ctx.replyWithMediaGroup(
    [
      {
        type: "photo",
        media:
          "AgACAgIAAxkBAAN5aM83AraxWdMb0VAbzm9OOBV1EqkAAlL-MRsQV3lKH6ogu4OcFAgBAAMCAANzAAM2BA",
        caption: "Пример анализа блюда по текстовому описанию",
      },
      {
        type: "photo",
        media:
          "AgACAgIAAxkBAAN1aM820o_W4VdPCpQD9m42j1xAw6AAAk_-MRsQV3lKHdyf7b71FBsBAAMCAANzAAM2BA",
        caption: "Пример анализа блюда по фотографии",
      },
      {
        type: "photo",
        media:
          "AgACAgIAAxkBAAN7aM83YQTSpL36ZHfayt3Efy_pihoAAlP-MRsQV3lKEsYYtSq8VnQBAAMCAANzAAM2BA",
        caption: "Пример анализа блюда по фотографии и текстовому описанию",
      },
    ],
  );
  await ctx.reply(
    `⚠️ Важно:

📝 - Чтобы мне было проще посчитать питательную ценность, пожалуйста, опишите блюдо максимально подробно
📸 - На фотографии должны быть отчетливо видны все продукты, которые составляют блюдо

✏️ Если я неточно определил блюдо, вы всегда можете отредактировать сообщение, и я проанализую его заново


📱 У меня есть также специальное приложение, в котором вы сможете:
      
1) 📊 смотреть статистику по КБЖУ за день
2) 🗑️ удалять блюда из истории  
3) ⚙️ изменять настройки профиля
`,
  );
  await ctx.replyWithMediaGroup(
    [
      {
        type: "photo",
        media:
          "AgACAgIAAxkBAAIBO2jRBCH8JqaOTGsgGa29kd5BdxlwAAJ_-DEbb8mJSim1lXipgfDHAQADAgADcwADNgQ",
        caption: "Как открыть приложение",
      },
      {
        type: "photo",
        media:
          "AgACAgIAAxkBAAN_aM84MeSw1UYzFcffxt097bTFwkEAAlb-MRsQV3lK0RIdz0z3sWgBAAMCAANzAAM2BA",
        caption: "Экран статистики",
      },
      {
        type: "photo",
        media:
          "AgACAgIAAxkBAAODaM88IT4Pg_aFr8k6Ig4OA3HLAccAAmH-MRsQV3lKRgU9rXrobOsBAAMCAANzAAM2BA",
        caption:
          "Для удаления блюда из истории достаточно просто свайпнуть влево",
      },
      {
        type: "photo",
        media:
          "AgACAgIAAxkBAAN9aM84J563FTmJstC7314Dw52IYYQAAlX-MRsQV3lKAVdPUc4iK6UBAAMCAANzAAM2BA",
        caption: "Настройки профиля",
      },
    ],
  );
  await ctx.reply(`
📝 Для всех пользователей я могу анализировать блюда по текстовому описанию 5 раз в день.

⭐️ Для премиум пользователей анализ блюд - без ограничений. 
📸 Также открывается безлимитный доступ к анализу блюд по фотографии.

💫 Оформите премиум подписку для получения полного доступа ко всем функциям, нажмите /subscriptions

Также предлагаю настроить профиль с помощью команды /set_profile
      `);
}
