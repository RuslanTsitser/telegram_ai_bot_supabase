import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

interface DeleteActivityRequest {
  activity_id: string;
  telegram_user_id: number;
}

interface DeleteActivityResponse {
  success: boolean;
  message: string;
  deleted_activity?: {
    id: string;
    description: string;
    created_at: string;
  };
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "DELETE, OPTIONS",
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

    // Only allow DELETE method
    if (req.method !== "DELETE") {
      return new Response(
        JSON.stringify({
          error: "Method not allowed",
          details: "Only DELETE requests are supported",
        }),
        {
          status: 405,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    }

    const body: DeleteActivityRequest = await req.json();

    // Validate required fields
    if (!body.activity_id) {
      return new Response(
        JSON.stringify({
          error: "Missing required field",
          details: "activity_id is required",
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

    if (!body.telegram_user_id) {
      return new Response(
        JSON.stringify({
          error: "Missing required field",
          details: "telegram_user_id is required",
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

    // First, verify that the activity exists and belongs to the user
    const { data: activity, error: fetchError } = await supabase
      .from("physical_activities")
      .select("id, description, created_at, user_id")
      .eq("id", body.activity_id)
      .eq("user_id", body.telegram_user_id)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return new Response(
          JSON.stringify({
            error: "Activity not found",
            details: "Activity does not exist or does not belong to this user",
          }),
          {
            status: 404,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          },
        );
      }

      console.error("Error fetching activity:", fetchError);
      return new Response(
        JSON.stringify({
          error: "Failed to fetch activity",
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

    // Delete the activity
    const { error: deleteError } = await supabase
      .from("physical_activities")
      .delete()
      .eq("id", body.activity_id)
      .eq("user_id", body.telegram_user_id);

    if (deleteError) {
      console.error("Error deleting activity:", deleteError);
      return new Response(
        JSON.stringify({
          error: "Failed to delete activity",
          details: deleteError.message,
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

    const response: DeleteActivityResponse = {
      success: true,
      message: "Activity deleted successfully",
      deleted_activity: {
        id: activity.id,
        description: activity.description || "No description",
        created_at: activity.created_at,
      },
    };

    return new Response(
      JSON.stringify(response),
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
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
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
});

