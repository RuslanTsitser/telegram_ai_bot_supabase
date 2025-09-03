import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// Получить все активные тарифные планы
export async function getSubscriptionPlans(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("is_active", true)
    .order("price", { ascending: true });

  return { data, error };
}
