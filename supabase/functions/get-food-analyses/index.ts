import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Интерфейсы для пагинации и группировки анализов еды
interface PaginationOptions {
  page?: number;
  limit?: number;
  offset?: number;
}

interface GroupByOptions {
  groupBy?: "day" | "week" | "month";
}

interface FoodAnalysisFilters {
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

interface FoodAnalysisData {
  id: string;
  description: string;
  mass: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  nutrition_score: number;
  recommendation: string;
  has_image: boolean;
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

    // Получаем user_id по telegram_user_id
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

    // Строим запрос - выбираем только необходимые поля
    let query = supabase
      .from("food_analysis")
      .select(
        "id, description, mass, calories, protein, carbs, fats, nutrition_score, recommendation, has_image, created_at",
      )
      .eq("user_id", parseInt(telegramUserId))
      .order("created_at", { ascending: false });

    // Добавляем фильтры по датам
    if (startDate) {
      query = query.gte("created_at", `${startDate}T00:00:00Z`);
    }
    if (endDate) {
      query = query.lte("created_at", `${endDate}T23:59:59Z`);
    }

    // Получаем все данные и всегда группируем
    const { data: analyses, error } = await query;

    if (error) {
      throw error;
    }

    // Определяем тип группировки (по умолчанию по дням)
    const groupType = groupBy || "day";
    const groupedData = groupAnalysesByPeriod(analyses || [], groupType);

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

function groupAnalysesByPeriod(
  analyses: FoodAnalysisData[],
  groupBy: "day" | "week" | "month",
): any[] {
  const groups = new Map<string, FoodAnalysisData[]>();

  analyses.forEach((analysis) => {
    const date = new Date(analysis.created_at);
    let period: string;

    switch (groupBy) {
      case "day":
        period = date.toISOString().split("T")[0]; // YYYY-MM-DD
        break;
      case "week":
        const year = date.getFullYear();
        const week = getWeekNumber(date);
        period = `${year}-W${week.toString().padStart(2, "0")}`;
        break;
      case "month":
        period = `${date.getFullYear()}-${
          (date.getMonth() + 1).toString().padStart(2, "0")
        }`;
        break;
      default:
        period = date.toISOString().split("T")[0];
    }

    if (!groups.has(period)) {
      groups.set(period, []);
    }
    groups.get(period)!.push(analysis);
  });

  return Array.from(groups.entries()).map(([period, analyses]) => {
    const summary = {
      totalCalories: analyses.reduce((sum, a) => sum + Number(a.calories), 0),
      totalProtein: analyses.reduce((sum, a) => sum + Number(a.protein), 0),
      totalCarbs: analyses.reduce((sum, a) => sum + Number(a.carbs), 0),
      totalFats: analyses.reduce((sum, a) => sum + Number(a.fats), 0),
      averageNutritionScore: analyses.reduce((sum, a) =>
        sum + a.nutrition_score, 0) / analyses.length,
      count: analyses.length,
    };

    return {
      period,
      analyses,
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
