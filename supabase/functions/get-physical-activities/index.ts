import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Интерфейсы для пагинации и группировки активностей
interface PaginationOptions {
  page?: number;
  limit?: number;
  offset?: number;
}

interface GroupByOptions {
  groupBy?: "day" | "week" | "month";
}

interface PhysicalActivityFilters {
  telegramUserId: number;
  startDate?: string;
  endDate?: string;
  pagination?: PaginationOptions;
  groupBy?: GroupByOptions;
}

interface UnifiedResponse {
  success: boolean;
  count: number;
  limit: number;
  offset: number;
  total_count: number;
  total_pages: number;
  current_page: number;
  group_by: string;
  grouped_data: any[];
}

interface PhysicalActivityData {
  id: string;
  description: string;
  calories: number;
  recommendation: string;
  has_image: boolean;
  image_url: string | null;
  created_at: string;
}

Deno.serve(async (req: Request) => {
  // Обработка CORS preflight запросов
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  try {
    // Получаем параметры из URL
    const url = new URL(req.url);
    const telegramUserId = url.searchParams.get("telegram_user_id");
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const groupBy = url.searchParams.get("group_by") as
      | "day"
      | "week"
      | "month"
      | null;
    const startDate = url.searchParams.get("start_date");
    const endDate = url.searchParams.get("end_date");

    if (!telegramUserId) {
      return new Response(
        JSON.stringify({ error: "telegram_user_id is required" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
          },
        },
      );
    }

    // Создаем клиент Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Получаем user по telegram_user_id и timezone из профиля
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("telegram_user_id", parseInt(telegramUserId))
      .single();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
          },
        },
      );
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("timezone")
      .eq("telegram_user_id", parseInt(telegramUserId))
      .maybeSingle();

    const timezone = profile?.timezone ?? "UTC";

    // Строим запрос - выбираем только необходимые поля
    let query = supabase
      .from("physical_activities")
      .select(
        "id, description, calories, recommendation, has_image, image_url, created_at",
      )
      .eq("user_id", parseInt(telegramUserId))
      .order("created_at", { ascending: false });

    // Фильтры по датам: start_date и end_date — даты в часовом поясе пользователя
    if (startDate) {
      const bounds = getDateBoundsInUTC(startDate, timezone);
      query = query.gte("created_at", bounds.start);
    }
    if (endDate) {
      const bounds = getDateBoundsInUTC(endDate, timezone);
      query = query.lte("created_at", bounds.end);
    }

    // Получаем все данные и всегда группируем
    const { data: activities, error } = await query;

    if (error) {
      throw error;
    }

    // Определяем тип группировки (по умолчанию по дням) в часовом поясе пользователя
    const groupType = groupBy || "day";
    const groupedData = groupActivitiesByPeriod(
      activities || [],
      groupType,
      timezone,
    );

    // Применяем пагинацию к группам
    const offset = (page - 1) * limit;
    const paginatedGroups = groupedData.slice(offset, offset + limit);
    const totalGroups = groupedData.length;
    const totalPagesForGroups = Math.ceil(totalGroups / limit);

    const response: UnifiedResponse = {
      success: true,
      count: paginatedGroups.length,
      limit,
      offset,
      total_count: totalGroups,
      total_pages: totalPagesForGroups,
      current_page: page,
      group_by: groupType,
      grouped_data: paginatedGroups,
    };

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      },
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      },
    );
  }
});

/** Границы дня в часовом поясе пользователя в UTC (для фильтрации по датам). */
function getDateBoundsInUTC(
  dateStr: string,
  timezone: string,
): { start: string; end: string } {
  const noonUtc = new Date(dateStr + "T12:00:00.000Z").getTime();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date(noonUtc));
  const get = (t: string) =>
    parseInt(parts.find((p) => p.type === t)!.value, 10);
  const localHour = get("hour");
  const localMin = get("minute");
  const localSec = get("second");
  const startOfDayUtc =
    noonUtc - (localHour * 3600 + localMin * 60 + localSec) * 1000;
  const endOfDayUtc = startOfDayUtc + 86400000 - 1;
  return {
    start: new Date(startOfDayUtc).toISOString(),
    end: new Date(endOfDayUtc).toISOString(),
  };
}

/** Дата YYYY-MM-DD в часовом поясе пользователя для момента created_at. */
function getLocalDateString(isoTimestamp: string, timezone: string): string {
  return new Date(isoTimestamp).toLocaleDateString("en-CA", {
    timeZone: timezone,
  });
}

/** Локальные год, месяц, день в поясе пользователя. */
function getLocalDateParts(
  isoTimestamp: string,
  timezone: string,
): { year: number; month: number; day: number } {
  const date = new Date(isoTimestamp);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const get = (t: string) =>
    parseInt(parts.find((p) => p.type === t)!.value, 10);
  return {
    year: get("year"),
    month: get("month") - 1,
    day: get("day"),
  };
}

function groupActivitiesByPeriod(
  activities: PhysicalActivityData[],
  groupBy: "day" | "week" | "month",
  timezone: string,
): any[] {
  const groups = new Map<string, PhysicalActivityData[]>();

  activities.forEach((activity) => {
    let period: string;

    switch (groupBy) {
      case "day":
        period = getLocalDateString(activity.created_at, timezone);
        break;
      case "week": {
        const { year, month, day } = getLocalDateParts(
          activity.created_at,
          timezone,
        );
        const week = getWeekNumber(new Date(Date.UTC(year, month, day)));
        period = `${year}-W${week.toString().padStart(2, "0")}`;
        break;
      }
      case "month": {
        const { year, month } = getLocalDateParts(
          activity.created_at,
          timezone,
        );
        period = `${year}-${(month + 1).toString().padStart(2, "0")}`;
        break;
      }
      default:
        period = getLocalDateString(activity.created_at, timezone);
    }

    if (!groups.has(period)) {
      groups.set(period, []);
    }
    groups.get(period)!.push(activity);
  });

  return Array.from(groups.entries()).map(([period, activities]) => {
    const summary = {
      totalCalories: activities.reduce((sum, a) => sum + Number(a.calories), 0),
      count: activities.length,
    };

    return {
      period,
      activities,
      summary,
    };
  }).sort((a, b) => b.period.localeCompare(a.period));
}

function getWeekNumber(date: Date): number {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

