-- Исправляем таблицу user_profiles - заменяем user_id на telegram_user_id

-- Удаляем старые индексы
DROP INDEX IF EXISTS user_profiles_user_id_idx;
DROP INDEX IF EXISTS user_profiles_user_id_unique_idx;

-- Удаляем старую функцию
DROP FUNCTION IF EXISTS public.upsert_user_profile(uuid, integer, decimal, decimal, integer, integer, integer, integer);

-- Удаляем старую колонку user_id
ALTER TABLE public.user_profiles DROP COLUMN IF EXISTS user_id;

-- Добавляем новую колонку telegram_user_id
ALTER TABLE public.user_profiles ADD COLUMN telegram_user_id bigint NOT NULL;

-- Удаляем старую внешнюю ссылку
ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_user_id_fkey;

-- Добавляем новую внешнюю ссылку на telegram_user_id
ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_telegram_user_id_fkey 
  FOREIGN KEY (telegram_user_id) REFERENCES public.users(telegram_user_id) ON DELETE CASCADE;

-- Создаем новые индексы
CREATE INDEX IF NOT EXISTS user_profiles_telegram_user_id_idx ON public.user_profiles(telegram_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_telegram_user_id_unique_idx ON public.user_profiles(telegram_user_id);

-- Создаем исправленную функцию upsert
CREATE OR REPLACE FUNCTION public.upsert_user_profile(
  p_telegram_user_id bigint,
  p_height_cm integer DEFAULT NULL,
  p_weight_kg decimal DEFAULT NULL,
  p_target_weight_kg decimal DEFAULT NULL,
  p_target_calories integer DEFAULT NULL,
  p_target_protein_g integer DEFAULT NULL,
  p_target_fats_g integer DEFAULT NULL,
  p_target_carbs_g integer DEFAULT NULL
)
RETURNS public.user_profiles AS $$
DECLARE
  v_profile public.user_profiles;
BEGIN
  INSERT INTO public.user_profiles (
    telegram_user_id,
    height_cm,
    weight_kg,
    target_weight_kg,
    target_calories,
    target_protein_g,
    target_fats_g,
    target_carbs_g
  ) VALUES (
    p_telegram_user_id,
    p_height_cm,
    p_weight_kg,
    p_target_weight_kg,
    p_target_calories,
    p_target_protein_g,
    p_target_fats_g,
    p_target_carbs_g
  )
  ON CONFLICT (telegram_user_id) DO UPDATE SET
    height_cm = EXCLUDED.height_cm,
    weight_kg = EXCLUDED.weight_kg,
    target_weight_kg = EXCLUDED.target_weight_kg,
    target_calories = EXCLUDED.target_calories,
    target_protein_g = EXCLUDED.target_protein_g,
    target_fats_g = EXCLUDED.target_fats_g,
    target_carbs_g = EXCLUDED.target_carbs_g,
    updated_at = timezone('utc'::text, now())
  RETURNING * INTO v_profile;
  
  RETURN v_profile;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
