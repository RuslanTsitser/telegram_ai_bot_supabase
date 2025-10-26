import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

interface UserProfileRequest {
  telegram_user_id: number;
  height_cm?: number | null;
  weight_kg?: number | null;
  target_weight_kg?: number | null;
  gender?: number | null;
  birth_year?: number | null;
  activity_level?: number | null;
}

interface UserProfile {
  id: string;
  telegram_user_id: number;
  height_cm: number | null;
  weight_kg: number | null;
  target_weight_kg: number | null;
  gender: number | null;
  birth_year: number | null;
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
    const telegramUserId = url.searchParams.get("telegram_user_id");

    // Route based on HTTP method
    switch (req.method) {
      case "GET":
        return await handleGet(supabase, telegramUserId);
      case "POST":
        return await handleCreate(supabase, req);
      case "PUT":
        return await handleUpdate(supabase, req);
      case "DELETE":
        return await handleDelete(supabase, telegramUserId);
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

// GET - Получить профиль пользователя
async function handleGet(
  supabase: any,
  telegramUserId: string | null,
): Promise<Response> {
  if (!telegramUserId) {
    return new Response(
      JSON.stringify({
        error: "Missing required parameter",
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

  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("telegram_user_id", parseInt(telegramUserId))
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return new Response(
        JSON.stringify({
          error: "Profile not found",
          details: "User profile does not exist",
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

    console.error("Error fetching user profile:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to fetch user profile",
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

// POST - Создать новый профиль пользователя
async function handleCreate(
  supabase: any,
  req: Request,
): Promise<Response> {
  const body: UserProfileRequest = await req.json();

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

  // Validate data
  const validationErrors = validateProfileData(body);
  if (validationErrors.length > 0) {
    return new Response(
      JSON.stringify({
        error: "Validation failed",
        details: validationErrors,
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

  const { data, error } = await supabase
    .from("user_profiles")
    .insert({
      telegram_user_id: body.telegram_user_id,
      height_cm: body.height_cm,
      weight_kg: body.weight_kg,
      target_weight_kg: body.target_weight_kg,
      gender: body.gender,
      birth_year: body.birth_year,
      activity_level: body.activity_level,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating user profile:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to create user profile",
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
      message: "User profile created successfully",
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

// PUT - Обновить профиль пользователя (полное обновление)
async function handleUpdate(
  supabase: any,
  req: Request,
): Promise<Response> {
  const body: UserProfileRequest = await req.json();

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

  // Validate data
  const validationErrors = validateProfileData(body);
  if (validationErrors.length > 0) {
    return new Response(
      JSON.stringify({
        error: "Validation failed",
        details: validationErrors,
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

  const { data, error } = await supabase
    .from("user_profiles")
    .upsert({
      telegram_user_id: body.telegram_user_id,
      height_cm: body.height_cm,
      weight_kg: body.weight_kg,
      target_weight_kg: body.target_weight_kg,
      gender: body.gender,
      birth_year: body.birth_year,
      activity_level: body.activity_level,
      updated_at: new Date().toISOString(),
    }, { onConflict: "telegram_user_id" })
    .select()
    .single();

  if (error) {
    console.error("Error updating user profile:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to update user profile",
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
      message: "User profile updated successfully",
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

// DELETE - Удалить профиль пользователя
async function handleDelete(
  supabase: any,
  telegramUserId: string | null,
): Promise<Response> {
  if (!telegramUserId) {
    return new Response(
      JSON.stringify({
        error: "Missing required parameter",
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

  const { error } = await supabase
    .from("user_profiles")
    .delete()
    .eq("telegram_user_id", parseInt(telegramUserId));

  if (error) {
    console.error("Error deleting user profile:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to delete user profile",
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
      message: "User profile deleted successfully",
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

// Валидация данных профиля
function validateProfileData(body: UserProfileRequest): string[] {
  const validationErrors: string[] = [];

  if (
    body.height_cm !== undefined &&
    (body.height_cm < 50 || body.height_cm > 300)
  ) {
    validationErrors.push("height_cm must be between 50 and 300 cm");
  }

  if (
    body.weight_kg !== undefined &&
    (body.weight_kg < 20 || body.weight_kg > 500)
  ) {
    validationErrors.push("weight_kg must be between 20 and 500 kg");
  }

  if (
    body.target_weight_kg !== undefined &&
    (body.target_weight_kg < 20 || body.target_weight_kg > 500)
  ) {
    validationErrors.push("target_weight_kg must be between 20 and 500 kg");
  }

  if (body.gender !== undefined && (body.gender < 0 || body.gender > 1)) {
    validationErrors.push("gender must be 0 (male) or 1 (female)");
  }

  const currentYear = new Date().getFullYear();
  if (
    body.birth_year !== undefined &&
    (body.birth_year < 1900 || body.birth_year > currentYear)
  ) {
    validationErrors.push(
      `birth_year must be between 1900 and ${currentYear}`,
    );
  }

  if (
    body.activity_level !== undefined &&
    (body.activity_level < 0 || body.activity_level > 4)
  ) {
    validationErrors.push("activity_level must be between 0 and 4");
  }

  return validationErrors;
}
