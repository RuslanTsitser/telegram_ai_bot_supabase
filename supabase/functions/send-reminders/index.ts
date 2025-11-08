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
}

interface User {
  telegram_user_id: number;
  first_name?: string;
  last_name?: string;
  language: string;
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

// Функция для отправки сообщения в Telegram
async function sendTelegramMessage(
  telegramUserId: number,
  message: string,
): Promise<boolean> {
  const botToken = Deno.env.get("PRODUCTION_BOT_TOKEN");
  if (!botToken) {
    console.error("PRODUCTION_BOT_TOKEN not found");
    return false;
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: telegramUserId,
          text: message,
          parse_mode: "HTML",
        }),
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error(`Failed to send message to ${telegramUserId}:`, errorData);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`Error sending message to ${telegramUserId}:`, error);
    return false;
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

// Функция для проверки, нужно ли отправить напоминание
function shouldSendReminder(reminder: UserReminder): boolean {
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
        return true;
      }
    }
  }

  // Для периодических напоминаний
  if (reminder.interval_minutes) {
    if (!lastSent) return true; // Первое напоминание

    const timeSinceLastSent = now.getTime() - lastSent.getTime();
    const intervalMs = reminder.interval_minutes * 60 * 1000;

    return timeSinceLastSent >= intervalMs;
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
      .select("telegram_user_id, first_name, last_name, language")
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
      if (!shouldSendReminder(reminder)) continue;

      const user = usersMap.get(reminder.telegram_user_id);
      if (!user) {
        console.warn(`User not found for reminder ${reminder.id}`);
        continue;
      }

      const message = getRandomMessage(reminder.reminder_type, user.language);
      const success = await sendTelegramMessage(
        reminder.telegram_user_id,
        message,
      );

      // Записываем в историю
      await supabase
        .from("reminder_history")
        .insert({
          telegram_user_id: reminder.telegram_user_id,
          reminder_type: reminder.reminder_type,
          status: success ? "sent" : "failed",
          reminder_id: reminder.id,
          error_message: success ? null : "Failed to send message",
        });

      // Обновляем время последней отправки
      if (success) {
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
        console.error(
          `Failed to send ${reminder.reminder_type} reminder to user ${reminder.telegram_user_id}`,
        );
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
