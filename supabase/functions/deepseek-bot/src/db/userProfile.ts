import SupabaseClient from "https://esm.sh/@supabase/supabase-js@2.49.4/dist/module/SupabaseClient.js";
import { UserCalculations, UserProfile } from "../interfaces/Database.ts";

// Создание или обновление профиля пользователя
export async function upsertUserProfile(
  supabase: SupabaseClient,
  telegramUserId: number,
  profileData: {
    height_cm?: number | null;
    weight_kg?: number | null;
    target_weight_kg?: number | null;
    gender?: number | null;
    birth_year?: number | null;
    activity_level?: number | null;
  },
): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .upsert({
        telegram_user_id: telegramUserId,
        height_cm: profileData.height_cm,
        weight_kg: profileData.weight_kg,
        target_weight_kg: profileData.target_weight_kg,
        gender: profileData.gender,
        birth_year: profileData.birth_year,
        activity_level: profileData.activity_level,
        updated_at: new Date().toISOString(),
      }, { onConflict: "telegram_user_id" })
      .select()
      .single();

    if (error) {
      console.error("Ошибка upsert профиля пользователя:", error);
      return null;
    }

    console.log("Профиль пользователя обработан:", telegramUserId);
    return data;
  } catch (error) {
    console.error("Ошибка обработки профиля пользователя:", error);
    return null;
  }
}

// Получение профиля пользователя
export async function getUserProfile(
  supabase: SupabaseClient,
  telegramUserId: number,
): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("telegram_user_id", telegramUserId)
      .single();

    if (error) {
      console.error("Ошибка получения профиля пользователя:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Ошибка получения профиля пользователя:", error);
    return null;
  }
}

// Расчет ИМТ (Индекс массы тела)
export function calculateBMI(heightCm: number, weightKg: number): number {
  if (heightCm <= 0 || weightKg <= 0) return 0;
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

// Расчет возраста на основе года рождения
export function calculateAge(birthYear: number): number {
  const currentYear = new Date().getFullYear();
  return currentYear - birthYear;
}

// Расчет базового метаболизма (BMR) по формуле Миффлина-Сан Жеора
export function calculateBMR(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: number, // 0 - мужчина, 1 - женщина
): number {
  if (weightKg <= 0 || heightCm <= 0 || age <= 0) return 0;

  const baseBMR = gender === 0
    ? (10 * weightKg) + (6.25 * heightCm) - (5 * age) + 5
    : (10 * weightKg) + (6.25 * heightCm) - (5 * age) - 161;

  return Math.round(baseBMR);
}

// Получение множителя активности
export function getActivityMultiplier(activityLevel: number): number {
  switch (activityLevel) {
    case 0:
      return 1.2; // сидячий образ жизни
    case 1:
      return 1.375; // легкая активность
    case 2:
      return 1.55; // умеренная активность
    case 3:
      return 1.725; // высокая активность
    case 4:
      return 1.9; // очень высокая активность
    default:
      return 1.2;
  }
}

// Расчет целевых калорий на основе целевого веса с корректировкой
export function calculateTargetCalories(
  targetWeightKg: number,
  currentWeightKg: number,
  heightCm: number,
  age: number,
  gender: number,
  activityLevel: number,
): number {
  if (targetWeightKg <= 0 || heightCm <= 0 || age <= 0) return 0;

  // BMR для целевого веса
  const bmr = calculateBMR(targetWeightKg, heightCm, age, gender);
  const activityMultiplier = getActivityMultiplier(activityLevel);
  const baseCalories = bmr * activityMultiplier;

  // Корректировка в зависимости от цели
  if (targetWeightKg < currentWeightKg) {
    return Math.round(baseCalories * 0.85); // похудение -15%
  } else if (targetWeightKg > currentWeightKg) {
    return Math.round(baseCalories * 1.10); // набор +10%
  } else {
    return Math.round(baseCalories); // поддержание
  }
}

// Расчет целевых макросов на основе целевого веса
export function calculateTargetMacros(
  targetWeightKg: number,
  targetCalories: number,
): {
  protein: number;
  fats: number;
  carbs: number;
} {
  if (targetWeightKg <= 0 || targetCalories <= 0) {
    return { protein: 0, fats: 0, carbs: 0 };
  }

  // Белки: 1.8 г/кг целевого веса
  const protein = Math.round(targetWeightKg * 1.8);

  // Жиры: 0.9 г/кг целевого веса
  const fats = Math.round(targetWeightKg * 0.9);

  // Углеводы: остаток калорий
  const proteinKcal = protein * 4;
  const fatKcal = fats * 9;
  const carbKcal = targetCalories - proteinKcal - fatKcal;
  const carbs = carbKcal > 0 ? Math.round(carbKcal / 4) : 0;

  return { protein, fats, carbs };
}

// Получение всех расчетов для пользователя
export async function getUserCalculations(
  supabase: SupabaseClient,
  telegramUserId: number,
): Promise<UserCalculations | null> {
  try {
    const profile = await getUserProfile(supabase, telegramUserId);
    if (!profile) return null;

    const {
      height_cm,
      weight_kg,
      target_weight_kg,
      gender,
      birth_year,
      activity_level,
    } = profile;

    // Проверяем наличие необходимых данных
    if (
      !height_cm || !weight_kg || !target_weight_kg || gender === null ||
      !birth_year || activity_level === null
    ) {
      return {
        bmi: null,
        target_calories: null,
        target_protein_g: null,
        target_fats_g: null,
        target_carbs_g: null,
      };
    }

    // Рассчитываем все показатели
    const bmi = calculateBMI(height_cm, weight_kg);
    const age = calculateAge(birth_year);
    const targetCalories = calculateTargetCalories(
      target_weight_kg,
      weight_kg,
      height_cm,
      age,
      gender,
      activity_level,
    );
    const macros = calculateTargetMacros(target_weight_kg, targetCalories);

    return {
      bmi,
      target_calories: targetCalories,
      target_protein_g: macros.protein,
      target_fats_g: macros.fats,
      target_carbs_g: macros.carbs,
    };
  } catch (error) {
    console.error("Ошибка расчета показателей пользователя:", error);
    return null;
  }
}
