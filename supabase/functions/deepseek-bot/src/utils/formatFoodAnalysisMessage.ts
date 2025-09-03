import { FoodAnalysis } from "../interfaces/FoodAnalysis.ts";

export function formatFoodAnalysisMessage(response: FoodAnalysis): string {
  if (response.error) {
    return response.error;
  }

  return `🍽 ${response.description}\n\n` +
    `📊 Питательная ценность:\n` +
    `• Примерный вес: ${response.mass} г\n` +
    `• Калории: ${response.calories} ккал\n` +
    `• Белки: ${response.protein} г\n` +
    `• Жиры: ${response.fats} г\n` +
    `  - Насыщенные: ${response.saturated_fats} г\n` +
    `• Углеводы: ${response.carbs} г\n` +
    `  - Сахар: ${response.sugar} г\n` +
    `• Клетчатка: ${response.fiber} г\n\n` +
    `⭐ Оценка питательности: ${response.nutrition_score}/10\n\n` +
    `💡 Рекомендации:\n${response.recommendation}`;
}
