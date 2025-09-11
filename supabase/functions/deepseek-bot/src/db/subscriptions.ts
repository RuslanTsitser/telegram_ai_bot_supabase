import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SubscriptionPlan } from "../interfaces/Database.ts";

// Получить все активные тарифные планы
export async function getSubscriptionPlans(
  supabase: SupabaseClient,
): Promise<SubscriptionPlan[] | null> {
  const { data, error } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("is_active", true)
    .order("price", { ascending: true });

  if (error) {
    console.error("Error getting subscription plans:", error);
    return null;
  }

  return data;
}

export async function getSubscriptionPlanById(
  supabase: SupabaseClient,
  id: string,
): Promise<SubscriptionPlan | null> {
  const { data, error } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error getting subscription plan by id:", error);
    return null;
  }

  return data;
}
