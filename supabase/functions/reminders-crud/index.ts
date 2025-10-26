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
  updated_at?: string;
}

interface CreateReminderRequest {
  telegram_user_id: number;
  reminder_type: "water" | "meal";
  is_enabled?: boolean;
  reminder_time?: string;
  interval_minutes?: number;
  timezone?: string;
}

interface UpdateReminderRequest {
  is_enabled?: boolean;
  reminder_time?: string;
  interval_minutes?: number;
  timezone?: string;
}

// Валидация данных
function validateReminderType(type: string): type is "water" | "meal" {
  return type === "water" || type === "meal";
}

function validateTimeFormat(time: string): boolean {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
}

function validateInterval(interval: number): boolean {
  return interval >= 15 && interval <= 1440; // от 15 минут до 24 часов
}

function validateTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

// Создание напоминания
async function createReminder(
  data: CreateReminderRequest,
): Promise<{ success: boolean; data?: UserReminder; error?: string }> {
  try {
    // Валидация
    if (!validateReminderType(data.reminder_type)) {
      return {
        success: false,
        error: "Недопустимый тип напоминания. Используйте 'water' или 'meal'",
      };
    }

    if (data.reminder_time && !validateTimeFormat(data.reminder_time)) {
      return {
        success: false,
        error: "Недопустимый формат времени. Используйте формат HH:MM",
      };
    }

    if (data.interval_minutes && !validateInterval(data.interval_minutes)) {
      return {
        success: false,
        error: "Интервал должен быть от 15 минут до 24 часов",
      };
    }

    if (data.timezone && !validateTimezone(data.timezone)) {
      return { success: false, error: "Недопустимый часовой пояс" };
    }

    // Проверяем, что пользователь существует
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("telegram_user_id")
      .eq("telegram_user_id", data.telegram_user_id)
      .single();

    if (userError || !user) {
      return { success: false, error: "Пользователь не найден" };
    }

    // Проверяем логику напоминания
    if (data.reminder_type === "water" && !data.interval_minutes) {
      return {
        success: false,
        error: "Для напоминаний о воде необходимо указать интервал",
      };
    }

    if (data.reminder_type === "meal" && !data.reminder_time) {
      return {
        success: false,
        error: "Для напоминаний о еде необходимо указать время",
      };
    }

    // Создаем напоминание
    const { data: reminder, error } = await supabase
      .from("user_reminders")
      .insert({
        telegram_user_id: data.telegram_user_id,
        reminder_type: data.reminder_type,
        is_enabled: data.is_enabled ?? true,
        reminder_time: data.reminder_time || null,
        interval_minutes: data.interval_minutes || null,
        timezone: data.timezone || "UTC",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating reminder:", error);
      return { success: false, error: "Ошибка при создании напоминания" };
    }

    return { success: true, data: reminder };
  } catch (error) {
    console.error("Error in createReminder:", error);
    return { success: false, error: "Внутренняя ошибка сервера" };
  }
}

// Получение напоминаний пользователя
async function getReminders(
  telegramUserId: number,
): Promise<{ success: boolean; data?: UserReminder[]; error?: string }> {
  try {
    const { data: reminders, error } = await supabase
      .from("user_reminders")
      .select("*")
      .eq("telegram_user_id", telegramUserId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching reminders:", error);
      return { success: false, error: "Ошибка при получении напоминаний" };
    }

    return { success: true, data: reminders || [] };
  } catch (error) {
    console.error("Error in getReminders:", error);
    return { success: false, error: "Внутренняя ошибка сервера" };
  }
}

// Обновление напоминания
async function updateReminder(
  id: string,
  telegramUserId: number,
  data: UpdateReminderRequest,
): Promise<{ success: boolean; data?: UserReminder; error?: string }> {
  try {
    // Валидация
    if (data.reminder_time && !validateTimeFormat(data.reminder_time)) {
      return {
        success: false,
        error: "Недопустимый формат времени. Используйте формат HH:MM",
      };
    }

    if (data.interval_minutes && !validateInterval(data.interval_minutes)) {
      return {
        success: false,
        error: "Интервал должен быть от 15 минут до 24 часов",
      };
    }

    if (data.timezone && !validateTimezone(data.timezone)) {
      return { success: false, error: "Недопустимый часовой пояс" };
    }

    // Проверяем, что напоминание принадлежит пользователю
    const { data: existingReminder, error: checkError } = await supabase
      .from("user_reminders")
      .select("id, reminder_type")
      .eq("id", id)
      .eq("telegram_user_id", telegramUserId)
      .single();

    if (checkError || !existingReminder) {
      return {
        success: false,
        error: "Напоминание не найдено или не принадлежит пользователю",
      };
    }

    // Обновляем напоминание
    const { data: reminder, error } = await supabase
      .from("user_reminders")
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("telegram_user_id", telegramUserId)
      .select()
      .single();

    if (error) {
      console.error("Error updating reminder:", error);
      return { success: false, error: "Ошибка при обновлении напоминания" };
    }

    return { success: true, data: reminder };
  } catch (error) {
    console.error("Error in updateReminder:", error);
    return { success: false, error: "Внутренняя ошибка сервера" };
  }
}

// Удаление напоминания
async function deleteReminder(
  id: string,
  telegramUserId: number,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Проверяем, что напоминание принадлежит пользователю
    const { data: existingReminder, error: checkError } = await supabase
      .from("user_reminders")
      .select("id")
      .eq("id", id)
      .eq("telegram_user_id", telegramUserId)
      .single();

    if (checkError || !existingReminder) {
      return {
        success: false,
        error: "Напоминание не найдено или не принадлежит пользователю",
      };
    }

    // Удаляем напоминание
    const { error } = await supabase
      .from("user_reminders")
      .delete()
      .eq("id", id)
      .eq("telegram_user_id", telegramUserId);

    if (error) {
      console.error("Error deleting reminder:", error);
      return { success: false, error: "Ошибка при удалении напоминания" };
    }

    return { success: true };
  } catch (error) {
    console.error("Error in deleteReminder:", error);
    return { success: false, error: "Внутренняя ошибка сервера" };
  }
}

// Обработчик HTTP запросов
Deno.serve(async (req: Request) => {
  // Настройка CORS
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  };

  // Обработка preflight запросов
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    // Извлекаем telegram_user_id из заголовков или query параметров
    const telegramUserId = req.headers.get("x-telegram-user-id")
      ? parseInt(req.headers.get("x-telegram-user-id")!)
      : url.searchParams.get("telegram_user_id")
      ? parseInt(url.searchParams.get("telegram_user_id")!)
      : null;

    if (!telegramUserId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Необходимо указать telegram_user_id",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Обработка различных методов и путей
    if (method === "GET" && path.endsWith("/reminders-crud")) {
      // GET /reminders-crud - получить все напоминания пользователя
      const result = await getReminders(telegramUserId);
      return new Response(
        JSON.stringify(result),
        {
          status: result.success ? 200 : 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (method === "POST" && path.endsWith("/reminders-crud")) {
      // POST /reminders-crud - создать новое напоминание
      const body = await req.json() as CreateReminderRequest;
      const result = await createReminder({
        ...body,
        telegram_user_id: telegramUserId,
      });
      return new Response(
        JSON.stringify(result),
        {
          status: result.success ? 201 : 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (
      (method === "PUT" || method === "PATCH") &&
      path.includes("/reminders-crud/")
    ) {
      // PUT/PATCH /reminders-crud/{id} - обновить напоминание
      const id = path.split("/").pop();
      if (!id) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Необходимо указать ID напоминания",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const body = await req.json() as UpdateReminderRequest;
      const result = await updateReminder(id, telegramUserId, body);
      return new Response(
        JSON.stringify(result),
        {
          status: result.success ? 200 : 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (method === "DELETE" && path.includes("/reminders-crud/")) {
      // DELETE /reminders-crud/{id} - удалить напоминание
      const id = path.split("/").pop();
      if (!id) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Необходимо указать ID напоминания",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const result = await deleteReminder(id, telegramUserId);
      return new Response(
        JSON.stringify(result),
        {
          status: result.success ? 200 : 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Если метод или путь не поддерживается
    return new Response(
      JSON.stringify({
        success: false,
        error: "Метод или путь не поддерживается",
      }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error in main handler:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Неизвестная ошибка",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
