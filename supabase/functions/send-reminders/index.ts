import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Инициализация Supabase клиента
const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

// Типы данных
interface UserReminder {
  id: string;
  telegram_user_id: number;
  reminder_type: "water" | "meal";
  is_enabled: boolean;
  reminder_time?: string;
  interval_minutes?: number;
  last_sent_at?: string;
  timezone: string;
  created_at?: string;
}

interface User {
  telegram_user_id: number;
  first_name?: string;
  last_name?: string;
  language: string;
  is_active: boolean;
}

// Сообщения для напоминаний
const WATER_MESSAGES = {
  ru: [
    "💧 Время попить воды! Ваш организм нуждается в гидратации.",
    "🚰 Не забывайте пить воду! Это важно для вашего здоровья.",
    "💦 Стакан воды сейчас - залог хорошего самочувствия!",
    "🌊 Пора выпить стакан воды. Пейте воду регулярно для поддержания водного баланса.",
    "💧 Вода помогает очистить организм от токсинов. Время попить!",
    "🚰 Гидратация важна для работы мозга. Выпейте воды!",
    "💦 Вода улучшает состояние кожи. Не забывайте пить!",
    "🌊 Регулярное питье воды помогает контролировать аппетит. Пришло время выпить стакан воды",
  ],
  en: [
    "💧 Time to drink water! Your body needs hydration.",
    "🚰 Don't forget to drink water! It's important for your health.",
    "💦 A glass of water now is the key to feeling good!",
    "🌊 Drink water regularly to maintain water balance. It's time to drink a glass of water",
    "💧 Water helps cleanse the body of toxins. Time to drink!",
    "🚰 Hydration is important for brain function. Drink some water!",
    "💦 Water improves skin condition. Don't forget to drink!",
    "🌊 Regular water drinking helps control appetite. It's time to drink a glass of water",
  ],
};

const MEAL_MESSAGES = {
  ru: [
    "🍽 Время поесть! Вашему организму нужна энергия.",
    "🥗 Пришло время поесть. Не пропускайте приемы пищи! Это важно для метаболизма.",
    "🍎 Сбалансированное питание - залог здоровья. Время поесть!",
    "🥘 Регулярные приемы пищи помогают поддерживать стабильный уровень сахара. Вы уже поели?",
    "🍽 Еда дает энергию для продуктивного дня. Время поесть!",
    "🥗 Правильное питание улучшает концентрацию. Не забывайте поесть!",
    "🍎 Регулярные приемы пищи помогают контролировать вес. Вам пора перекусить",
    "🥘 Еда - это топливо для вашего тела. Время заправиться!",
  ],
  en: [
    "🍽️ Your body needs energy. It's time to eat!",
    "🥗 It's time to eat. Don't skip meals! It's important for metabolism.",
    "🍎 Balanced nutrition is the key to health. It's time to eat!",
    "🥘 Regular meals help maintain stable blood sugar levels. You already ate?",
    "🍽 Food gives energy for a productive day. It's time to eat!",
    "🥗 Proper nutrition improves concentration. Don't forget to eat!",
    "🍎 Regular meals help control weight. You're ready for a snack",
    "🥘 Food is fuel for your body. It's time to refuel!",
  ],
};

// Функция для получения случайного сообщения
function getRandomMessage(type: "water" | "meal", language: string): string {
  const messages = type === "water" ? WATER_MESSAGES : MEAL_MESSAGES;
  const langMessages = messages[language as keyof typeof messages] ||
    messages.ru;
  return langMessages[Math.floor(Math.random() * langMessages.length)];
}

// Результат отправки сообщения
interface SendMessageResult {
  success: boolean;
  isBlocked: boolean; // true если пользователь заблокировал бота (ошибка 403)
}

// Функция для пометки пользователя как неактивного
async function markUserAsInactive(telegramUserId: number): Promise<void> {
  try {
    const { error } = await supabase
      .from("users")
      .update({ is_active: false })
      .eq("telegram_user_id", telegramUserId);

    if (error) {
      console.error(
        `Failed to mark user ${telegramUserId} as inactive:`,
        error,
      );
    } else {
      console.log(`User ${telegramUserId} marked as inactive (bot blocked)`);
    }
  } catch (error) {
    console.error(
      `Error marking user ${telegramUserId} as inactive:`,
      error,
    );
  }
}

// Функция для отправки сообщения в Telegram
async function sendTelegramMessage(
  telegramUserId: number,
  message: string,
  replyMarkup?: {
    inline_keyboard: Array<Array<{ text: string; callback_data: string }>>;
  },
): Promise<SendMessageResult> {
  const botToken = Deno.env.get("PRODUCTION_BOT_TOKEN");
  if (!botToken) {
    console.error("PRODUCTION_BOT_TOKEN not found");
    return { success: false, isBlocked: false };
  }

  try {
    const payload: {
      chat_id: number;
      text: string;
      parse_mode: string;
      reply_markup?: {
        inline_keyboard: Array<Array<{ text: string; callback_data: string }>>;
      };
    } = {
      chat_id: telegramUserId,
      text: message,
      parse_mode: "HTML",
    };

    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    }

    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error(`Failed to send message to ${telegramUserId}:`, errorData);

      // Проверяем, является ли ошибка блокировкой бота (403)
      const isBlocked = errorData.error_code === 403;

      if (isBlocked) {
        // Помечаем пользователя как неактивного
        await markUserAsInactive(telegramUserId);
        return { success: false, isBlocked: true };
      }

      return { success: false, isBlocked: false };
    }

    return { success: true, isBlocked: false };
  } catch (error) {
    console.error(`Error sending message to ${telegramUserId}:`, error);
    return { success: false, isBlocked: false };
  }
}

// Функция для проверки, не является ли текущее время ночным
// Возвращает true, если время находится в диапазоне 22:00 - 08:00
function isNightTime(timezone: string): boolean {
  try {
    // Получаем текущее время в часовом поясе пользователя
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
    });

    const hour = parseInt(formatter.format(now), 10);

    // Ночное время: с 22:00 до 08:00
    return hour >= 22 || hour < 8;
  } catch (error) {
    console.error(`Error checking night time for timezone ${timezone}:`, error);
    // В случае ошибки разрешаем отправку (безопасный вариант)
    return false;
  }
}

// Функция для проверки, был ли трекинг еды в течение 30 минут до времени напоминания
async function hasRecentFoodTracking(
  telegramUserId: number,
  reminderTime: Date,
): Promise<boolean> {
  try {
    // Вычисляем время 30 минут до напоминания
    const thirtyMinutesAgo = new Date(reminderTime.getTime() - 30 * 60 * 1000);

    // Проверяем наличие записей о трекинге еды в диапазоне от 30 минут до напоминания до времени напоминания
    const { data, error } = await supabase
      .from("food_analysis")
      .select("id")
      .eq("user_id", telegramUserId)
      .gte("created_at", thirtyMinutesAgo.toISOString())
      .lte("created_at", reminderTime.toISOString())
      .limit(1);

    if (error) {
      console.error(
        `Error checking recent food tracking for user ${telegramUserId}:`,
        error,
      );
      // В случае ошибки разрешаем отправку (безопасный вариант)
      return false;
    }

    return (data?.length || 0) > 0;
  } catch (error) {
    console.error(
      `Error in hasRecentFoodTracking for user ${telegramUserId}:`,
      error,
    );
    // В случае ошибки разрешаем отправку (безопасный вариант)
    return false;
  }
}

// Функция для проверки, нужно ли отправить напоминание
async function shouldSendReminder(reminder: UserReminder): Promise<boolean> {
  if (!reminder.is_enabled) return false;

  // Проверяем, не является ли текущее время ночным
  // Для напоминаний о воде не отправляем ночью
  if (reminder.reminder_type === "water" && isNightTime(reminder.timezone)) {
    return false;
  }

  const now = new Date();
  const lastSent = reminder.last_sent_at
    ? new Date(reminder.last_sent_at)
    : null;

  // Для напоминаний по времени
  if (reminder.reminder_time) {
    const [hours, minutes] = reminder.reminder_time.split(":").map(Number);
    const reminderDateTime = new Date();
    reminderDateTime.setHours(hours, minutes, 0, 0);

    // Если время напоминания уже прошло сегодня и последнее напоминание было не сегодня
    if (now >= reminderDateTime) {
      if (!lastSent || lastSent.toDateString() !== now.toDateString()) {
        // Проверяем, было ли напоминание создано до времени напоминания сегодня
        // Если создано после времени напоминания, не отправляем сегодня
        if (reminder.created_at) {
          const createdAt = new Date(reminder.created_at);
          // Если напоминание создано сегодня, но после времени напоминания - не отправляем
          if (
            createdAt.toDateString() === now.toDateString() &&
            createdAt > reminderDateTime
          ) {
            return false;
          }
        }

        // Для напоминаний о еде проверяем, был ли недавний трекинг
        // Проверяем относительно времени напоминания
        if (reminder.reminder_type === "meal") {
          const hasRecentTracking = await hasRecentFoodTracking(
            reminder.telegram_user_id,
            reminderDateTime,
          );
          if (hasRecentTracking) {
            console.log(
              `Skipping meal reminder for user ${reminder.telegram_user_id} - recent food tracking found`,
            );
            return false;
          }
        }

        return true;
      }
    }
  }

  // Для периодических напоминаний
  if (reminder.interval_minutes) {
    if (!lastSent) {
      // Для первого напоминания о еде проверяем, был ли недавний трекинг
      if (reminder.reminder_type === "meal") {
        const hasRecentTracking = await hasRecentFoodTracking(
          reminder.telegram_user_id,
          now,
        );
        if (hasRecentTracking) {
          console.log(
            `Skipping first meal reminder for user ${reminder.telegram_user_id} - recent food tracking found`,
          );
          return false;
        }
      }
      return true;
    }

    const timeSinceLastSent = now.getTime() - lastSent.getTime();
    const intervalMs = reminder.interval_minutes * 60 * 1000;

    if (timeSinceLastSent >= intervalMs) {
      // Для периодических напоминаний о еде проверяем, был ли недавний трекинг
      if (reminder.reminder_type === "meal") {
        const hasRecentTracking = await hasRecentFoodTracking(
          reminder.telegram_user_id,
          now,
        );
        if (hasRecentTracking) {
          console.log(
            `Skipping periodic meal reminder for user ${reminder.telegram_user_id} - recent food tracking found`,
          );
          return false;
        }
      }
      return true;
    }
  }

  return false;
}

// Основная функция обработки напоминаний
async function processReminders(): Promise<void> {
  try {
    // Получаем все активные напоминания
    const { data: reminders, error: remindersError } = await supabase
      .from("user_reminders")
      .select("*")
      .eq("is_enabled", true);

    if (remindersError) {
      console.error("Error fetching reminders:", remindersError);
      return;
    }

    if (!reminders || reminders.length === 0) {
      console.log("No active reminders found");
      return;
    }

    console.log(`Found ${reminders.length} active reminders`);

    // Получаем информацию о пользователях
    const userIds = [...new Set(reminders.map((r) => r.telegram_user_id))];
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("telegram_user_id, first_name, last_name, language, is_active")
      .in("telegram_user_id", userIds);

    if (usersError) {
      console.error("Error fetching users:", usersError);
      return;
    }

    const usersMap = new Map(users?.map((u) => [u.telegram_user_id, u]) || []);

    let sentCount = 0;
    let failedCount = 0;

    // Обрабатываем каждое напоминание
    for (const reminder of reminders as UserReminder[]) {
      const shouldSend = await shouldSendReminder(reminder);

      // Если напоминание о еде не отправляется из-за недавнего трекинга,
      // все равно обновляем last_sent_at в БД
      if (!shouldSend && reminder.reminder_type === "meal") {
        const now = new Date();
        const lastSent = reminder.last_sent_at
          ? new Date(reminder.last_sent_at)
          : null;

        // Проверяем, нужно ли обновить last_sent_at
        // Для напоминаний по времени
        if (reminder.reminder_time) {
          const [hours, minutes] = reminder.reminder_time.split(":").map(
            Number,
          );
          const reminderDateTime = new Date();
          reminderDateTime.setHours(hours, minutes, 0, 0);

          if (now >= reminderDateTime) {
            if (!lastSent || lastSent.toDateString() !== now.toDateString()) {
              // Проверяем, был ли недавний трекинг
              const hasRecentTracking = await hasRecentFoodTracking(
                reminder.telegram_user_id,
                reminderDateTime,
              );

              if (hasRecentTracking) {
                // Обновляем last_sent_at, даже если напоминание не отправляется
                await supabase
                  .from("user_reminders")
                  .update({ last_sent_at: new Date().toISOString() })
                  .eq("id", reminder.id);

                // Записываем в историю
                await supabase
                  .from("reminder_history")
                  .insert({
                    telegram_user_id: reminder.telegram_user_id,
                    reminder_type: reminder.reminder_type,
                    status: "skipped",
                    reminder_id: reminder.id,
                    error_message: "Skipped due to recent food tracking",
                  });

                console.log(
                  `Skipped meal reminder for user ${reminder.telegram_user_id} - recent food tracking found, updated last_sent_at`,
                );
              }
            }
          }
        }

        continue;
      }

      if (!shouldSend) continue;

      const user = usersMap.get(reminder.telegram_user_id);
      if (!user) {
        console.warn(`User not found for reminder ${reminder.id}`);
        continue;
      }

      // Пропускаем неактивных пользователей (заблокировавших бота)
      if (!user.is_active) {
        console.log(
          `Skipping reminder for user ${reminder.telegram_user_id} - user is inactive (bot blocked)`,
        );
        continue;
      }

      let message = getRandomMessage(reminder.reminder_type, user.language);

      // Добавляем инлайн-кнопки для напоминаний о воде
      let replyMarkup: {
        inline_keyboard: Array<Array<{ text: string; callback_data: string }>>;
      } | undefined;

      if (reminder.reminder_type === "water") {
        // Добавляем пояснение к сообщению
        const instructionTexts = {
          ru: "\n\nСколько выпили? Нажмите кнопку ниже:",
          en: "\n\nHow much did you drink? Click the button below:",
        };

        const instruction =
          instructionTexts[user.language as keyof typeof instructionTexts] ||
          instructionTexts.ru;
        message = message + instruction;

        // Тексты кнопок в зависимости от языка
        // Используем нейтральную форму без рода для русского языка
        const buttonTexts = {
          ru: {
            sips: "✅ Пару глотков",
            glass: "✅ Стакан",
          },
          en: {
            sips: "✅ Drank a few sips",
            glass: "✅ Drank a glass",
          },
        };

        const texts = buttonTexts[user.language as keyof typeof buttonTexts] ||
          buttonTexts.ru;

        // Размещаем кнопки в две строки для большей наглядности
        replyMarkup = {
          inline_keyboard: [
            [{ text: texts.sips, callback_data: "water_sips" }],
            [{ text: texts.glass, callback_data: "water_glass" }],
          ],
        };
      }

      const result = await sendTelegramMessage(
        reminder.telegram_user_id,
        message,
        replyMarkup,
      );

      // Записываем в историю
      const status = result.isBlocked
        ? "blocked"
        : result.success
        ? "sent"
        : "failed";
      await supabase
        .from("reminder_history")
        .insert({
          telegram_user_id: reminder.telegram_user_id,
          reminder_type: reminder.reminder_type,
          status: status,
          reminder_id: reminder.id,
          error_message: result.success
            ? null
            : result.isBlocked
            ? "Bot was blocked by the user"
            : "Failed to send message",
        });

      // Обновляем время последней отправки
      if (result.success) {
        await supabase
          .from("user_reminders")
          .update({ last_sent_at: new Date().toISOString() })
          .eq("id", reminder.id);

        sentCount++;
        console.log(
          `Sent ${reminder.reminder_type} reminder to user ${reminder.telegram_user_id}`,
        );
      } else {
        failedCount++;
        if (result.isBlocked) {
          console.log(
            `User ${reminder.telegram_user_id} blocked the bot - marked as inactive`,
          );
        } else {
          console.error(
            `Failed to send ${reminder.reminder_type} reminder to user ${reminder.telegram_user_id}`,
          );
        }
      }

      // Небольшая задержка между отправками
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log(
      `Reminder processing completed. Sent: ${sentCount}, Failed: ${failedCount}`,
    );
  } catch (error) {
    console.error("Error processing reminders:", error);
  }
}

// Обработчик HTTP запросов
Deno.serve(async (req: Request) => {
  // Проверяем метод запроса
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    // Обрабатываем напоминания
    await processReminders();

    return new Response(
      JSON.stringify({
        success: true,
        message: "Reminders processed successfully",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    console.error("Error in main handler:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }
});
