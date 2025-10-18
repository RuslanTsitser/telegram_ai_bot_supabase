import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SubscriptionPlan } from "../interfaces/Database.ts";

// Получить все активные тарифные планы
export async function getSubscriptionPlans(
  supabase: SupabaseClient,
  userId?: number,
): Promise<SubscriptionPlan[] | null> {
  let query = supabase
    .from("subscription_plans")
    .select("*")
    .eq("is_active", true);

  let userPromo: string | null = null;

  // Если передан userId, получаем промокод пользователя и фильтруем планы
  if (userId) {
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("promo")
      .eq("telegram_user_id", userId)
      .single();

    if (userError) {
      console.error("Error getting user promo:", userError);
      return null;
    }

    userPromo = user?.promo || null;

    // Если у пользователя есть промокод, фильтруем планы по промокоду
    // Если промокода нет, показываем планы с промокодом "A"
    if (userPromo) {
      query = query.contains("available_promo_codes", [userPromo]);
    } else {
      // Пользователи без промокода видят планы с промокодом "A"
      query = query.contains("available_promo_codes", ["A"]);
    }
  }

  const { data, error } = await query.order("price", { ascending: true });

  if (error) {
    console.error("Error getting subscription plans:", error);
    return null;
  }

  // Если пользователь с промокодом получил пустой список, возвращаем планы с промокодом "A"
  if (userId && userPromo && data && data.length === 0) {
    // Получаем планы с промокодом "A" (fallback для пользователей с промокодом)
    const { data: fallbackPlans, error: fallbackError } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("is_active", true)
      .contains("available_promo_codes", ["A"])
      .order("price", { ascending: true });

    if (fallbackError) {
      console.error("Error getting fallback plans:", fallbackError);
      return null;
    }

    return fallbackPlans;
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
