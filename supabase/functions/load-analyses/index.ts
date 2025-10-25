import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

interface FoodAnalysis {
  id: string;
  chat_id: number;
  user_id: string;
  message_id: number;
  description: string | null;
  mass: number | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  sugar: number | null;
  fats: number | null;
  saturated_fats: number | null;
  fiber: number | null;
  nutrition_score: number | null;
  recommendation: string | null;
  created_at: string;
  has_image: boolean;
  user_text: string | null;
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

    // Parse query parameters for pagination and sorting
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "100");
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const sortBy = url.searchParams.get("sort_by") || "created_at";
    const sortOrder = url.searchParams.get("sort_order") || "desc";

    // Validate sort parameters
    const allowedSortFields = [
      "created_at",
      "nutrition_score",
      "calories",
      "mass",
      "chat_id",
      "user_id",
    ];
    const allowedSortOrders = ["asc", "desc"];

    if (!allowedSortFields.includes(sortBy)) {
      return new Response(
        JSON.stringify({
          error: "Invalid sort_by parameter",
          details: `Allowed values: ${allowedSortFields.join(", ")}`,
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

    if (!allowedSortOrders.includes(sortOrder)) {
      return new Response(
        JSON.stringify({
          error: "Invalid sort_order parameter",
          details: "Allowed values: asc, desc",
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

    // Get total count of food analyses
    const { count: totalCount, error: countError } = await supabase
      .from("food_analysis")
      .select("*", { count: "exact", head: true });

    if (countError) {
      console.error("Error fetching analyses count:", countError);
      return new Response(
        JSON.stringify({
          error: "Failed to fetch analyses count",
          details: countError.message,
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

    // Get food analyses ordered by created_at DESC with limit
    const { data: analyses, error } = await supabase
      .from("food_analysis")
      .select(`
        id,
        chat_id,
        user_id,
        message_id,
        description,
        mass,
        calories,
        protein,
        carbs,
        sugar,
        fats,
        saturated_fats,
        fiber,
        nutrition_score,
        recommendation,
        created_at,
        has_image,
        user_text
      `)
      .order(sortBy, { ascending: sortOrder === "asc" })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching food analyses:", error);
      return new Response(
        JSON.stringify({
          error: "Failed to fetch food analyses",
          details: error.message,
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

    // Calculate pagination info
    const totalPages = Math.ceil((totalCount || 0) / limit);
    const currentPage = Math.floor(offset / limit) + 1;

    return new Response(
      JSON.stringify({
        success: true,
        data: analyses,
        count: analyses?.length || 0,
        limit,
        offset,
        total_count: totalCount || 0,
        total_pages: totalPages,
        current_page: currentPage,
        sort_by: sortBy,
        sort_order: sortOrder,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
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
