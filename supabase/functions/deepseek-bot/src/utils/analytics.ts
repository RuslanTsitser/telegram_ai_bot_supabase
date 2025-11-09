/**
 * Утилита для логирования событий аналитики
 */

export type Platform = "telegram" | "web";
export type EventType =
  | "user_registered"
  | "onboarding_completed"
  | "onboarding_message_sent"
  | "food_analysis_text"
  | "food_analysis_image"
  | "subscription_purchased"
  | "subscription_viewed"
  | "subscription_invoice_created"
  | "trial_activated"
  | "command_executed"
  | "limit_reached"
  | "profile_updated"
  | "support_mode_activated"
  | "water_intake_recorded"
  | "analysis_feedback";

export interface EventProperties {
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Логирует событие через Edge Function log-event
 */
export async function logEvent(
  userId: number,
  platform: Platform,
  eventType: EventType,
  properties?: EventProperties,
): Promise<boolean> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Missing SUPABASE_URL or SUPABASE_ANON_KEY");
      return false;
    }

    const response = await fetch(
      `${supabaseUrl}/functions/v1/log-event`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          user_id: userId,
          platform: platform,
          event_type: eventType,
          properties: properties || {},
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `Error logging event: ${response.status} ${errorText}`,
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in logEvent:", error);
    return false;
  }
}
