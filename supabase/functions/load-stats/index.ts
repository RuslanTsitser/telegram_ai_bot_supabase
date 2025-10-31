import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

interface TrafficSourceStat {
  source: string | null;
  count: number;
}

interface Stats {
  total_users: number;
  total_analyses: number;
  avg_score: number | null;
  traffic_source: TrafficSourceStat[];
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

    // Get total users count
    const { count: totalUsers, error: usersError } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true });

    if (usersError) {
      console.error("Error fetching users count:", usersError);
      return new Response(
        JSON.stringify({
          error: "Failed to fetch users count",
          details: usersError.message,
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

    // Get total analyses count
    const { count: totalAnalyses, error: analysesError } = await supabase
      .from("food_analysis")
      .select("*", { count: "exact", head: true });

    if (analysesError) {
      console.error("Error fetching analyses count:", analysesError);
      return new Response(
        JSON.stringify({
          error: "Failed to fetch analyses count",
          details: analysesError.message,
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

    // Get average nutrition score
    const { data: avgScoreData, error: avgScoreError } = await supabase
      .from("food_analysis")
      .select("nutrition_score")
      .not("nutrition_score", "is", null);

    if (avgScoreError) {
      console.error("Error fetching average score:", avgScoreError);
      return new Response(
        JSON.stringify({
          error: "Failed to fetch average score",
          details: avgScoreError.message,
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

    // Calculate average score
    let avgScore: number | null = null;
    if (avgScoreData && avgScoreData.length > 0) {
      const sum = avgScoreData.reduce(
        (acc, item) => acc + (item.nutrition_score || 0),
        0,
      );
      avgScore = Math.round((sum / avgScoreData.length) * 10) / 10; // Round to 1 decimal place
    }

    // Get traffic source statistics
    const { data: trafficSourceData, error: trafficSourceError } =
      await supabase
        .from("users")
        .select("traffic_source");

    if (trafficSourceError) {
      console.error("Error fetching traffic source data:", trafficSourceError);
      return new Response(
        JSON.stringify({
          error: "Failed to fetch traffic source data",
          details: trafficSourceError.message,
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

    // Group by traffic_source
    const trafficSourceMap = new Map<string | null, number>();
    if (trafficSourceData) {
      trafficSourceData.forEach((user) => {
        const source = user.traffic_source ?? null;
        trafficSourceMap.set(source, (trafficSourceMap.get(source) || 0) + 1);
      });
    }

    // Convert to array and sort by count descending
    const trafficSource: TrafficSourceStat[] = Array.from(
      trafficSourceMap.entries(),
    )
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count);

    const stats: Stats = {
      total_users: totalUsers || 0,
      total_analyses: totalAnalyses || 0,
      avg_score: avgScore,
      traffic_source: trafficSource,
    };

    return new Response(
      JSON.stringify({
        success: true,
        data: stats,
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
