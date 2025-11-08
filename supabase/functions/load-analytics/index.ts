import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

interface ConversionFunnel {
  registered: number;
  onboarded: number;
  analyzed: number;
  subscribed: number;
}

interface EventUsage {
  event_type: string;
  count: number;
  unique_users: number;
}

interface SubscriptionConversion {
  viewed: number;
  invoice_created: number;
  purchased: number;
}

type AnalyticsType = "funnel" | "usage" | "subscription";

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

    // Parse query parameters
    const url = new URL(req.url);
    const type = (url.searchParams.get("type") || "funnel") as AnalyticsType;
    const days = parseInt(url.searchParams.get("days") || "30");
    const platform = url.searchParams.get("platform") || null;

    // Validate type parameter
    const allowedTypes: AnalyticsType[] = ["funnel", "usage", "subscription"];
    if (!allowedTypes.includes(type)) {
      return new Response(
        JSON.stringify({
          error: "Invalid type parameter",
          details: `Allowed values: ${allowedTypes.join(", ")}`,
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

    // Validate days parameter
    if (days < 1 || days > 365) {
      return new Response(
        JSON.stringify({
          error: "Invalid days parameter",
          details: "Days must be between 1 and 365",
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

    // Validate platform parameter
    if (platform && platform !== "telegram" && platform !== "web") {
      return new Response(
        JSON.stringify({
          error: "Invalid platform parameter",
          details: "Platform must be 'telegram' or 'web'",
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

    // Calculate date filter
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);
    const dateFromISO = dateFrom.toISOString();

    // Build base query
    let query = supabase
      .from("events")
      .select("user_id, event_type, platform, created_at")
      .gte("created_at", dateFromISO);

    // Apply platform filter if specified
    if (platform) {
      query = query.eq("platform", platform);
    }

    // Execute query based on type
    switch (type) {
      case "funnel": {
        const { data, error } = await query;

        if (error) {
          console.error("Error fetching funnel data:", error);
          return new Response(
            JSON.stringify({
              error: "Failed to fetch funnel data",
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

        // Calculate funnel metrics
        const registeredUsers = new Set<number>();
        const onboardedUsers = new Set<number>();
        const analyzedUsers = new Set<number>();
        const subscribedUsers = new Set<number>();

        if (data) {
          data.forEach((event) => {
            if (event.event_type === "user_registered") {
              registeredUsers.add(event.user_id);
            } else if (event.event_type === "onboarding_completed") {
              onboardedUsers.add(event.user_id);
            } else if (
              event.event_type === "food_analysis_text" ||
              event.event_type === "food_analysis_image"
            ) {
              analyzedUsers.add(event.user_id);
            } else if (event.event_type === "subscription_purchased") {
              subscribedUsers.add(event.user_id);
            }
          });
        }

        const funnel: ConversionFunnel = {
          registered: registeredUsers.size,
          onboarded: onboardedUsers.size,
          analyzed: analyzedUsers.size,
          subscribed: subscribedUsers.size,
        };

        return new Response(
          JSON.stringify({
            success: true,
            type: "funnel",
            period_days: days,
            platform: platform || "all",
            data: funnel,
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

      case "usage": {
        const { data, error } = await query;

        if (error) {
          console.error("Error fetching usage data:", error);
          return new Response(
            JSON.stringify({
              error: "Failed to fetch usage data",
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

        // Group by event_type
        const eventMap = new Map<
          string,
          { count: number; users: Set<number> }
        >();

        if (data) {
          data.forEach((event) => {
            const existing = eventMap.get(event.event_type) || {
              count: 0,
              users: new Set<number>(),
            };
            existing.count++;
            existing.users.add(event.user_id);
            eventMap.set(event.event_type, existing);
          });
        }

        // Convert to array and sort by count descending
        const usage: EventUsage[] = Array.from(eventMap.entries())
          .map(([event_type, stats]) => ({
            event_type,
            count: stats.count,
            unique_users: stats.users.size,
          }))
          .sort((a, b) => b.count - a.count);

        return new Response(
          JSON.stringify({
            success: true,
            type: "usage",
            period_days: days,
            platform: platform || "all",
            data: usage,
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

      case "subscription": {
        const { data, error } = await query;

        if (error) {
          console.error("Error fetching subscription data:", error);
          return new Response(
            JSON.stringify({
              error: "Failed to fetch subscription data",
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

        // Calculate subscription conversion metrics
        const viewedUsers = new Set<number>();
        const invoiceCreatedUsers = new Set<number>();
        const purchasedUsers = new Set<number>();

        if (data) {
          data.forEach((event) => {
            if (event.event_type === "subscription_viewed") {
              viewedUsers.add(event.user_id);
            } else if (event.event_type === "subscription_invoice_created") {
              invoiceCreatedUsers.add(event.user_id);
            } else if (event.event_type === "subscription_purchased") {
              purchasedUsers.add(event.user_id);
            }
          });
        }

        const conversion: SubscriptionConversion = {
          viewed: viewedUsers.size,
          invoice_created: invoiceCreatedUsers.size,
          purchased: purchasedUsers.size,
        };

        return new Response(
          JSON.stringify({
            success: true,
            type: "subscription",
            period_days: days,
            platform: platform || "all",
            data: conversion,
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
    }
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
