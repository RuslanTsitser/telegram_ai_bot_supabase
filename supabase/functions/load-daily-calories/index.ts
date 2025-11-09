import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

interface DailyCalories {
  date: string; // Дата в формате YYYY-MM-DD
  calories: number; // Сумма калорий за день
}

interface PaginatedResponse {
  success: boolean;
  data: DailyCalories[];
  cursor: string | null; // Курсор для следующей страницы (дата последнего элемента)
  next_cursor: string | null; // Курсор для следующей страницы
  limit: number;
  has_more: boolean; // Есть ли еще данные
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Parse request body or query parameters
    let user_id: number | null = null;
    let cursor: string | null = null;
    let limit = 30; // По умолчанию 30 дней

    if (req.method === "POST") {
      const body = await req.json();
      user_id = body.user_id || null;
      cursor = body.cursor || null;
      limit = body.limit || 30;
    } else {
      const url = new URL(req.url);
      const userIdParam = url.searchParams.get("user_id");
      user_id = userIdParam ? parseInt(userIdParam) : null;
      cursor = url.searchParams.get("cursor");
      const limitParam = url.searchParams.get("limit");
      limit = limitParam ? parseInt(limitParam) : 30;
    }

    // Validate limit
    if (limit < 1 || limit > 100) {
      return new Response(
        JSON.stringify({
          error: "Invalid limit parameter",
          details: "Limit must be between 1 and 100",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    }

    // Fetch food analyses data
    // Для курсорной пагинации нужно получить достаточно данных для группировки
    let baseQuery = supabase
      .from("food_analysis")
      .select("created_at, calories")
      .not("calories", "is", null)
      .order("created_at", { ascending: false });

    if (user_id !== null) {
      baseQuery = baseQuery.eq("user_id", user_id);
    }

    // Если есть курсор, фильтруем по дате (берем записи с датой меньше курсора)
    if (cursor) {
      // Курсор - это дата в формате YYYY-MM-DD
      // Берем записи, где дата меньше курсора (для сортировки по убыванию)
      const cursorDate = new Date(cursor);
      cursorDate.setHours(23, 59, 59, 999); // Конец дня курсора
      baseQuery = baseQuery.lt("created_at", cursorDate.toISOString());
    }

    // Получаем достаточно данных для группировки (берем больше, чем нужно)
    // Ограничиваем до 10000 записей для производительности
    const { data: allData, error: fetchError } = await baseQuery.limit(10000);

    if (fetchError) {
      console.error("Error fetching food analyses:", fetchError);
      return new Response(
        JSON.stringify({
          error: "Failed to fetch food analyses",
          details: fetchError.message,
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    }

    // Группируем по дате и суммируем калории
    const dailyTotals: Map<string, number> = new Map();

    if (allData) {
      for (const item of allData) {
        if (!item.created_at) continue;

        const date = new Date(item.created_at);
        const dateStr = date.toISOString().split("T")[0]; // YYYY-MM-DD

        const currentCalories = dailyTotals.get(dateStr) || 0;
        dailyTotals.set(
          dateStr,
          currentCalories + (item.calories || 0),
        );
      }
    }

    // Преобразуем в массив и сортируем по дате по убыванию
    const dailyArray: DailyCalories[] = Array.from(dailyTotals.entries())
      .map(([date, calories]) => ({
        date,
        calories: Math.round(calories * 100) / 100, // Округляем до 2 знаков
      }))
      .sort((a, b) => b.date.localeCompare(a.date));

    // Применяем пагинацию
    const hasMore = dailyArray.length > limit;
    const result = hasMore ? dailyArray.slice(0, limit) : dailyArray;

    // Получаем курсор для следующей страницы (дата последнего элемента)
    const nextCursor = hasMore && result.length > 0
      ? result[result.length - 1].date
      : null;

    const response: PaginatedResponse = {
      success: true,
      data: result,
      cursor: cursor || null,
      next_cursor: nextCursor,
      limit,
      has_more: hasMore,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }
});

