import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Проверяет, есть ли у пользователя напоминания
 */
export async function hasUserReminders(
  supabase: SupabaseClient,
  telegramUserId: number,
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("user_reminders")
      .select("id")
      .eq("telegram_user_id", telegramUserId)
      .limit(1);

    if (error) {
      console.error("Error checking user reminders:", error);
      return false;
    }

    return (data?.length || 0) > 0;
  } catch (error) {
    console.error("Error in hasUserReminders:", error);
    return false;
  }
}

/**
 * Создает автоматическое напоминание о еде для пользователя
 * @param analysisDate - дата и время анализа (извлекается время в формате HH:MM в UTC)
 */
export async function createDefaultMealReminder(
  supabase: SupabaseClient,
  telegramUserId: number,
  analysisDate: Date,
): Promise<boolean> {
  try {
    // Проверяем, что пользователь существует
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("telegram_user_id")
      .eq("telegram_user_id", telegramUserId)
      .single();

    if (userError || !user) {
      console.error("User not found for reminder creation:", userError);
      return false;
    }

    // Извлекаем время из Date объекта в формате HH:MM (UTC)
    const reminderTime = `${
      String(analysisDate.getUTCHours()).padStart(2, "0")
    }:${String(analysisDate.getUTCMinutes()).padStart(2, "0")}`;

    // Создаем напоминание о еде с указанным временем (всегда UTC)
    const { error } = await supabase
      .from("user_reminders")
      .insert({
        telegram_user_id: telegramUserId,
        reminder_type: "meal",
        is_enabled: true,
        reminder_time: reminderTime,
        timezone: "UTC",
      });

    if (error) {
      console.error("Error creating default meal reminder:", error);
      return false;
    }

    console.log(
      `Created default meal reminder for user ${telegramUserId} at ${reminderTime}`,
    );
    return true;
  } catch (error) {
    console.error("Error in createDefaultMealReminder:", error);
    return false;
  }
}

/**
 * Создает автоматическое напоминание о еде, если у пользователя нет напоминаний
 * Использует текущее время для создания напоминания
 */
export async function createReminderIfNeeded(
  supabase: SupabaseClient,
  telegramUserId: number,
): Promise<boolean> {
  try {
    // Проверяем, есть ли у пользователя напоминания
    const hasReminders = await hasUserReminders(supabase, telegramUserId);

    if (hasReminders) {
      console.log(
        `User ${telegramUserId} already has reminders, skipping auto-creation`,
      );
      return false;
    }

    // Создаем напоминание о еде с текущим временем
    const now = new Date();
    return await createDefaultMealReminder(
      supabase,
      telegramUserId,
      now,
    );
  } catch (error) {
    console.error("Error in createReminderIfNeeded:", error);
    return false;
  }
}
