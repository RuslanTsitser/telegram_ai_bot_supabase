export interface UserSession {
  id: string;
  telegram_user_id: number;
  current_state:
    | "waiting_for_height"
    | "waiting_for_target_weight"
    | "waiting_for_weight"
    | "waiting_for_gender"
    | "waiting_for_age"
    | "waiting_for_activity_level";
  created_at: string;
  updated_at: string;
}
