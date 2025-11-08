import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

interface LogEventRequest {
  user_id: number; // telegram_user_id
  platform: "telegram" | "web";
  event_type: string;
  properties?: Record<string, any>;
}

Deno.serve(async (req: Request) => {
  // Обработка CORS preflight запросов
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  // Только POST запросы
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }

  try {
    const body: LogEventRequest = await req.json();

    // Валидация обязательных полей
    if (!body.user_id || !body.platform || !body.event_type) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: user_id, platform, event_type",
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

    // Валидация platform
    if (body.platform !== "telegram" && body.platform !== "web") {
      return new Response(
        JSON.stringify({ error: "platform must be 'telegram' or 'web'" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    }

    // Создаем клиент Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Записываем событие в БД
    const { data, error } = await supabase
      .from("events")
      .insert({
        user_id: body.user_id,
        platform: body.platform,
        event_type: body.event_type,
        properties: body.properties || {},
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Error logging event:", error);
      return new Response(
        JSON.stringify({
          error: "Failed to log event",
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
        event_id: data.id,
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
    console.error("Error:", error);
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
