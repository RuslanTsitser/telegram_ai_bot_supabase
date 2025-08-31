-- Создаем таблицу профилей пользователей
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_user_id bigint NOT NULL REFERENCES public.users(telegram_user_id) ON DELETE CASCADE,
  height_cm integer CHECK (height_cm > 0 AND height_cm < 300),
  weight_kg decimal(5,2) CHECK (weight_kg > 0 AND weight_kg < 500),
  target_weight_kg decimal(5,2) CHECK (target_weight_kg > 0 AND target_weight_kg < 500),
  target_calories integer CHECK (target_calories > 0 AND target_calories < 10000),
  target_protein_g integer CHECK (target_protein_g > 0 AND target_protein_g < 1000),
  target_fats_g integer CHECK (target_fats_g > 0 AND target_fats_g < 1000),
  target_carbs_g integer CHECK (target_carbs_g > 0 AND target_carbs_g < 2000),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS user_profiles_telegram_user_id_idx ON public.user_profiles(telegram_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_telegram_user_id_unique_idx ON public.user_profiles(telegram_user_id);

-- Включаем RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Политики безопасности - разрешаем обновление без авторизации
CREATE POLICY "Allow insert without auth" ON public.user_profiles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow select without auth" ON public.user_profiles
  FOR SELECT USING (true);

CREATE POLICY "Allow update without auth" ON public.user_profiles
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow delete without auth" ON public.user_profiles
  FOR DELETE USING (true);

-- Политика для service role
CREATE POLICY "Service role can do everything" ON public.user_profiles
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION public.update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического обновления updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_profiles_updated_at();

-- Функция для upsert профиля пользователя
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
