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

export interface DbUser {
  id: string;
  telegram_user_id: number;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  is_premium: boolean;
  premium_expires_at: string | null;
  created_at: string;
  last_activity: string;
  trial_used: boolean;
  price_test_group: string;
}

export interface UserProfile {
  id: string;
  telegram_user_id: number;
  height_cm: number | null;
  weight_kg: number | null;
  target_weight_kg: number | null;
  gender: number | null;
  birth_year: number | null;
  activity_level: number | null;
  created_at: string;
  updated_at: string;
}

export interface UserCalculations {
  bmi: number | null;
  target_calories: number | null;
  target_protein_g: number | null;
  target_fats_g: number | null;
  target_carbs_g: number | null;
}
