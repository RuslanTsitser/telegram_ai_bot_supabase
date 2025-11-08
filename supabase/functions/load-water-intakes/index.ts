import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

interface WaterIntake {
  id: string;
  telegram_user_id: number;
  amount: string;
  created_at: string;
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
    const telegramUserId = url.searchParams.get("telegram_user_id");

    // Validate sort parameters
    const allowedSortFields = [
      "created_at",
      "telegram_user_id",
      "amount",
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

    // Validate and parse telegram_user_id if provided
    let userIdFilter: number | null = null;
    if (telegramUserId) {
      const userId = parseInt(telegramUserId);
      if (isNaN(userId)) {
        return new Response(
          JSON.stringify({
            error: "Invalid telegram_user_id parameter",
            details: "telegram_user_id must be a number",
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
      userIdFilter = userId;
    }

    // Build count query
    let countQuery = supabase
      .from("water_intake")
      .select("*", { count: "exact", head: true });

    // Build data query
    let dataQuery = supabase
      .from("water_intake")
      .select(`
        id,
        telegram_user_id,
        amount,
        created_at
      `);

    // Apply user filter if provided
    if (userIdFilter !== null) {
      countQuery = countQuery.eq("telegram_user_id", userIdFilter);
      dataQuery = dataQuery.eq("telegram_user_id", userIdFilter);
    }

    // Get total count
    const { count: totalCount, error: countError } = await countQuery;

    if (countError) {
      console.error("Error fetching water intake count:", countError);
      return new Response(
        JSON.stringify({
          error: "Failed to fetch water intake count",
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

    // Get water intake records ordered by sortBy with limit
    const { data: waterIntakes, error } = await dataQuery
      .order(sortBy, { ascending: sortOrder === "asc" })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching water intake records:", error);
      return new Response(
        JSON.stringify({
          error: "Failed to fetch water intake records",
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
        data: waterIntakes,
        count: waterIntakes?.length || 0,
        limit,
        offset,
        total_count: totalCount || 0,
        total_pages: totalPages,
        current_page: currentPage,
        sort_by: sortBy,
        sort_order: sortOrder,
        telegram_user_id: telegramUserId || null,
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

