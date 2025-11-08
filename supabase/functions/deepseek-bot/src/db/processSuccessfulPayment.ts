import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logEvent } from "../utils/analytics.ts";

export interface ProcessPaymentResult {
  success: boolean;
  error?: string;
  planName?: string;
  subscriptionEndDate?: Date;
}

// Интерфейс для данных успешного платежа (соответствует Telegram Bot API)
interface SuccessfulPayment {
  invoice_payload: string;
  telegram_payment_charge_id: string;
  total_amount: number;
  currency: string;
  provider_payment_charge_id: string;
}

export async function processSuccessfulPayment(
  payment: SuccessfulPayment,
  supabase: SupabaseClient,
): Promise<ProcessPaymentResult> {
  try {
    const payload = payment.invoice_payload;
    const [type, planId, userId] = payload.split("_");

    if (type !== "subscription") {
      return {
        success: false,
        error: "Invalid payment type",
      };
    }

    // Получаем информацию о тарифе
    const { data: plan, error: planError } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("id", planId)
      .single();

    if (planError || !plan) {
      return {
        success: false,
        error: "Plan not found",
      };
    }

    // Получаем пользователя по telegram_user_id
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("telegram_user_id", parseInt(userId))
      .single();

    if (userError || !user) {
      return {
        success: false,
        error: "User not found",
      };
    }

    // Вычисляем дату окончания подписки
    const subscriptionEndDate = new Date();
    subscriptionEndDate.setDate(
      subscriptionEndDate.getDate() + plan.duration_days,
    );

    // Обновляем пользователя
    const { error: updateError } = await supabase
      .from("users")
      .update({
        premium_expires_at: subscriptionEndDate.toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      return {
        success: false,
        error: "Error updating user",
      };
    }

    // Создаем запись о платеже
    const { error: paymentError } = await supabase
      .from("payments")
      .insert({
        user_id: user.id,
        plan_id: planId,
        yookassa_payment_id: payment.telegram_payment_charge_id,
        amount: payment.total_amount / 100, // конвертируем из копеек
        currency: payment.currency,
        status: "succeeded",
      });

    if (paymentError) {
      console.error("Error creating payment record:", paymentError);
      // Не возвращаем ошибку, так как основная логика выполнена
    }

    // Логируем успешную покупку подписки
    await logEvent(parseInt(userId), "telegram", "subscription_purchased", {
      plan_id: planId,
      plan_name: plan.name,
      price: payment.total_amount / 100,
      currency: payment.currency,
      duration_days: plan.duration_days,
    });

    return {
      success: true,
      planName: plan.name,
      subscriptionEndDate,
    };
  } catch (error) {
    console.error("Error in processSuccessfulPayment:", error);
    return {
      success: false,
      error: "Unexpected error occurred",
    };
  }
}
