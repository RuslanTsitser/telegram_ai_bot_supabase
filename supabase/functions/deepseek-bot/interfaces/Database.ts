// Интерфейсы для базы данных

export interface MessageRelationship {
  user_message_id: number;
  bot_message_id: number;
  chat_id: number;
}

export interface FoodAnalysisData {
  chat_id: number;
  user_id: number;
  message_id: number;
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
  has_image: boolean;
  image_file_id?: string;
  user_text: string;
}

// Интерфейсы для платежной системы
export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_days: number;
  is_active: boolean;
  created_at: string;
}
