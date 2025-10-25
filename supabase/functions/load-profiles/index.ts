import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

interface UserProfile {
  id: string;
  telegram_user_id: number;
  gender: number | null;
  birth_year: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  target_weight_kg: number | null;
  activity_level: number | null;
  created_at: string;
  updated_at: string;
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
      "updated_at",
      "telegram_user_id",
      "height_cm",
      "weight_kg",
      "target_weight_kg",
      "birth_year",
      "activity_level",
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

    // Get total count of user profiles
    const { count: totalCount, error: countError } = await supabase
      .from("user_profiles")
      .select("*", { count: "exact", head: true });

    if (countError) {
      console.error("Error fetching profiles count:", countError);
      return new Response(
        JSON.stringify({
          error: "Failed to fetch profiles count",
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

    // Get user profiles ordered by created_at DESC with pagination
    const { data: profiles, error } = await supabase
      .from("user_profiles")
      .select(`
        id,
        telegram_user_id,
        gender,
        birth_year,
        height_cm,
        weight_kg,
        target_weight_kg,
        activity_level,
        created_at,
        updated_at
      `)
      .order(sortBy, { ascending: sortOrder === "asc" })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching user profiles:", error);
      return new Response(
        JSON.stringify({
          error: "Failed to fetch user profiles",
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
        data: profiles,
        count: profiles?.length || 0,
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
