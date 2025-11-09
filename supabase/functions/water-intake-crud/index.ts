import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

interface WaterIntake {
  id: string;
  telegram_user_id: number;
  amount: "sips" | "glass";
  created_at: string;
}

interface CreateWaterIntakeRequest {
  telegram_user_id: number;
  amount: "sips" | "glass";
}

interface UpdateWaterIntakeRequest {
  amount?: "sips" | "glass";
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
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

    const url = new URL(req.url);
    const waterIntakeId = url.searchParams.get("id");
    const telegramUserId = url.searchParams.get("telegram_user_id");

    // Route based on HTTP method
    switch (req.method) {
      case "GET":
        return await handleGet(supabase, telegramUserId, waterIntakeId);
      case "POST":
        return await handleCreate(supabase, req);
      case "PUT":
        return await handleUpdate(supabase, req, waterIntakeId);
      case "DELETE":
        return await handleDelete(supabase, waterIntakeId, telegramUserId);
      default:
        return new Response(
          JSON.stringify({
            error: "Method not allowed",
            details: "Only GET, POST, PUT, DELETE requests are supported",
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

// GET - Получить записи о воде
async function handleGet(
  supabase: any,
  telegramUserId: string | null,
  waterIntakeId: string | null,
): Promise<Response> {
  // Если указан id, получаем конкретную запись
  if (waterIntakeId) {
    const { data, error } = await supabase
      .from("water_intake")
      .select("*")
      .eq("id", waterIntakeId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return new Response(
          JSON.stringify({
            error: "Water intake not found",
            details: "Water intake record does not exist",
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

      console.error("Error fetching water intake:", error);
      return new Response(
        JSON.stringify({
          error: "Failed to fetch water intake",
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

    return new Response(
      JSON.stringify({
        success: true,
        data: data,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }

  // Если указан telegram_user_id, получаем все записи пользователя
  if (telegramUserId) {
    const { data, error } = await supabase
      .from("water_intake")
      .select("*")
      .eq("telegram_user_id", parseInt(telegramUserId))
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching water intakes:", error);
      return new Response(
        JSON.stringify({
          error: "Failed to fetch water intakes",
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

    return new Response(
      JSON.stringify({
        success: true,
        data: data || [],
        count: data?.length || 0,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }

  // Если не указаны параметры, возвращаем ошибку
  return new Response(
    JSON.stringify({
      error: "Missing required parameter",
      details: "Either 'id' or 'telegram_user_id' is required",
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

// POST - Создать новую запись о воде
async function handleCreate(
  supabase: any,
  req: Request,
): Promise<Response> {
  const body: CreateWaterIntakeRequest = await req.json();

  // Validate required fields
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

  if (!body.amount) {
    return new Response(
      JSON.stringify({
        error: "Missing required field",
        details: "amount is required",
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

  // Validate amount value
  if (body.amount !== "sips" && body.amount !== "glass") {
    return new Response(
      JSON.stringify({
        error: "Invalid amount value",
        details: "amount must be either 'sips' or 'glass'",
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

  // Verify that the user exists
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id")
    .eq("telegram_user_id", body.telegram_user_id)
    .single();

  if (userError || !user) {
    return new Response(
      JSON.stringify({
        error: "User not found",
        details: "User with the provided telegram_user_id does not exist",
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

  // Insert water intake record
  const { data: waterIntake, error: insertError } = await supabase
    .from("water_intake")
    .insert({
      telegram_user_id: body.telegram_user_id,
      amount: body.amount,
    })
    .select()
    .single();

  if (insertError) {
    console.error("Error inserting water intake:", insertError);
    return new Response(
      JSON.stringify({
        error: "Failed to record water intake",
        details: insertError.message,
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

  return new Response(
    JSON.stringify({
      success: true,
      data: waterIntake,
      message: "Water intake recorded successfully",
    }),
    {
      status: 201,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    },
  );
}

// PUT - Обновить запись о воде
async function handleUpdate(
  supabase: any,
  req: Request,
  waterIntakeId: string | null,
): Promise<Response> {
  if (!waterIntakeId) {
    return new Response(
      JSON.stringify({
        error: "Missing required parameter",
        details: "id is required for update",
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

  const body: UpdateWaterIntakeRequest = await req.json();

  // Validate amount value if provided
  if (body.amount && body.amount !== "sips" && body.amount !== "glass") {
    return new Response(
      JSON.stringify({
        error: "Invalid amount value",
        details: "amount must be either 'sips' or 'glass'",
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

  // Check if at least one field to update is provided
  if (!body.amount) {
    return new Response(
      JSON.stringify({
        error: "Missing fields to update",
        details: "At least one field (amount) must be provided",
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

  // First, verify that the water intake exists
  const { data: existingWaterIntake, error: fetchError } = await supabase
    .from("water_intake")
    .select("id, telegram_user_id")
    .eq("id", waterIntakeId)
    .single();

  if (fetchError) {
    if (fetchError.code === "PGRST116") {
      return new Response(
        JSON.stringify({
          error: "Water intake not found",
          details: "Water intake record does not exist",
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

    console.error("Error fetching water intake:", fetchError);
    return new Response(
      JSON.stringify({
        error: "Failed to fetch water intake",
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

  // Update the water intake record
  const updateData: any = {};
  if (body.amount) {
    updateData.amount = body.amount;
  }

  const { data: waterIntake, error: updateError } = await supabase
    .from("water_intake")
    .update(updateData)
    .eq("id", waterIntakeId)
    .select()
    .single();

  if (updateError) {
    console.error("Error updating water intake:", updateError);
    return new Response(
      JSON.stringify({
        error: "Failed to update water intake",
        details: updateError.message,
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

  return new Response(
    JSON.stringify({
      success: true,
      data: waterIntake,
      message: "Water intake updated successfully",
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    },
  );
}

// DELETE - Удалить запись о воде
async function handleDelete(
  supabase: any,
  waterIntakeId: string | null,
  telegramUserId: string | null,
): Promise<Response> {
  if (!waterIntakeId) {
    return new Response(
      JSON.stringify({
        error: "Missing required parameter",
        details: "id is required for delete",
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

  // First, verify that the water intake exists
  let query = supabase
    .from("water_intake")
    .select("id, telegram_user_id, amount, created_at")
    .eq("id", waterIntakeId);

  // If telegram_user_id is provided, verify ownership
  if (telegramUserId) {
    query = query.eq("telegram_user_id", parseInt(telegramUserId));
  }

  const { data: waterIntake, error: fetchError } = await query.single();

  if (fetchError) {
    if (fetchError.code === "PGRST116") {
      return new Response(
        JSON.stringify({
          error: "Water intake not found",
          details: "Water intake record does not exist or does not belong to this user",
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

    console.error("Error fetching water intake:", fetchError);
    return new Response(
      JSON.stringify({
        error: "Failed to fetch water intake",
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

  // Delete the water intake record
  let deleteQuery = supabase
    .from("water_intake")
    .delete()
    .eq("id", waterIntakeId);

  if (telegramUserId) {
    deleteQuery = deleteQuery.eq("telegram_user_id", parseInt(telegramUserId));
  }

  const { error: deleteError } = await deleteQuery;

  if (deleteError) {
    console.error("Error deleting water intake:", deleteError);
    return new Response(
      JSON.stringify({
        error: "Failed to delete water intake",
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

  return new Response(
    JSON.stringify({
      success: true,
      message: "Water intake deleted successfully",
      deleted_water_intake: {
        id: waterIntake.id,
        telegram_user_id: waterIntake.telegram_user_id,
        amount: waterIntake.amount,
        created_at: waterIntake.created_at,
      },
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    },
  );
}
