export interface FoodAnalysis {
  description: string;
  mass: number;
  calories: number;
  protein: number;
  carbs: number;
  sugar: number;
  fats: number;
  saturated_fats: number;
  fiber: number;
  nutrition_score: number;
  recommendation: string;
  error?: string;
}
