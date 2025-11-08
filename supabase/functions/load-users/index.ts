import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

interface User {
  id: string;
  telegram_user_id: number;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  is_premium: boolean;
  premium_expires_at: string | null;
  created_at: string;
  last_activity: string | null;
  trial_used: boolean;
  used_promo: string[];
  promo: string;
  language: string;
  traffic_source: string | null;
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
      "last_activity",
      "telegram_user_id",
      "username",
      "first_name",
      "last_name",
      "is_premium",
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

    // Get total count of users
    const { count: totalCount, error: countError } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true });

    if (countError) {
      console.error("Error fetching users count:", countError);
      return new Response(
        JSON.stringify({
          error: "Failed to fetch users count",
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

    // Get users ordered by created_at DESC with pagination
    const { data: users, error } = await supabase
      .from("users")
      .select(`
        id,
        telegram_user_id,
        username,
        first_name,
        last_name,
        is_premium,
        premium_expires_at,
        created_at,
        last_activity,
        trial_used,
        used_promo,
        promo,
        language,
        traffic_source
      `)
      .order(sortBy, { ascending: sortOrder === "asc" })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching users:", error);
      return new Response(
        JSON.stringify({
          error: "Failed to fetch users",
          details: error.message,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Calculate pagination info
    const totalPages = Math.ceil((totalCount || 0) / limit);
    const currentPage = Math.floor(offset / limit) + 1;

    return new Response(
      JSON.stringify({
        success: true,
        data: users,
        count: users?.length || 0,
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
