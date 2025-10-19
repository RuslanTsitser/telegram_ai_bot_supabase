import { FoodAnalysis } from "../interfaces/FoodAnalysis.ts";
import { createI18n } from "../utils/i18n.ts";

export function formatFoodAnalysisMessage(
  response: FoodAnalysis,
  languageCode: string,
): string {
  if (response.error) {
    return response.error;
  }

  const i18n = createI18n(languageCode);

  return `${i18n.t("food_description_emoji")}${response.description}\n\n` +
    `${i18n.t("nutrition_title")}\n` +
    `${i18n.t("estimated_weight")}${response.mass} ${i18n.t("g")}\n` +
    `${i18n.t("calories")}${response.calories} ${i18n.t("kcal")}\n` +
    `${i18n.t("protein")}${response.protein} ${i18n.t("g")}\n` +
    `${i18n.t("fats")}${response.fats} ${i18n.t("g")}\n` +
    `${i18n.t("saturated_fats")}${response.saturated_fats} ${i18n.t("g")}\n` +
    `${i18n.t("carbs")}${response.carbs} ${i18n.t("g")}\n` +
    `${i18n.t("sugar")}${response.sugar} ${i18n.t("g")}\n` +
    `${i18n.t("fiber")}${response.fiber} ${i18n.t("g")}\n\n` +
    `${i18n.t("nutrition_score")}${response.nutrition_score}${
      i18n.t("nutrition_score_max")
    }\n\n` +
    `${i18n.t("recommendations")}\n${response.recommendation}`;
}
