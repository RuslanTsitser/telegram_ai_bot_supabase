-- Удаляем поля target_* из таблицы user_profiles

-- Удаляем ограничения (CHECK constraints) для полей target_*
ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_target_calories_check;
ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_target_protein_g_check;
ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_target_fats_g_check;
ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_target_carbs_g_check;

-- Удаляем колонки target_*
ALTER TABLE public.user_profiles DROP COLUMN IF EXISTS target_calories;
ALTER TABLE public.user_profiles DROP COLUMN IF EXISTS target_protein_g;
ALTER TABLE public.user_profiles DROP COLUMN IF EXISTS target_fats_g;
ALTER TABLE public.user_profiles DROP COLUMN IF EXISTS target_carbs_g;

-- Обновляем функцию upsert_user_profile, убирая параметры target_*
CREATE OR REPLACE FUNCTION public.upsert_user_profile(
  p_telegram_user_id bigint,
  p_height_cm integer DEFAULT NULL,
  p_weight_kg numeric DEFAULT NULL,
  p_target_weight_kg numeric DEFAULT NULL
)
RETURNS user_profiles
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_profile public.user_profiles;
BEGIN
  INSERT INTO public.user_profiles (
    telegram_user_id,
    height_cm,
    weight_kg,
    target_weight_kg
  ) VALUES (
    p_telegram_user_id,
    p_height_cm,
    p_weight_kg,
    p_target_weight_kg
  )
  ON CONFLICT (telegram_user_id) DO UPDATE SET
    height_cm = EXCLUDED.height_cm,
    weight_kg = EXCLUDED.weight_kg,
    target_weight_kg = EXCLUDED.target_weight_kg,
    updated_at = timezone('utc'::text, now())
  RETURNING * INTO v_profile;
  
  RETURN v_profile;
END;
$function$;