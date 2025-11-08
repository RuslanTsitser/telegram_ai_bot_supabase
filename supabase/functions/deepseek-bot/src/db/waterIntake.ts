import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Записывает потребление воды в базу данных
 * @param supabase - клиент Supabase
 * @param telegramUserId - ID пользователя в Telegram
 * @param amount - количество воды: 'sips' (пару глотков) или 'glass' (стакан)
 * @returns true если запись успешна, false в противном случае
 */
export async function insertWaterIntake(
  supabase: SupabaseClient,
  telegramUserId: number,
  amount: "sips" | "glass",
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("water_intake")
      .insert({
        telegram_user_id: telegramUserId,
        amount: amount,
      });

    if (error) {
      console.error("Error inserting water intake:", error);
      return false;
    }

    console.log(
      `Water intake recorded for user ${telegramUserId}: ${amount}`,
    );
    return true;
  } catch (error) {
    console.error("Error in insertWaterIntake:", error);
    return false;
  }
}
