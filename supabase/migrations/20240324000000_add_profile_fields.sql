-- Добавляем новые поля в таблицу user_profiles
-- Добавляем поле пол (0 - женский, 1 - мужской, по умолчанию 0)
ALTER TABLE public.user_profiles
ADD COLUMN gender integer DEFAULT 0 CHECK (gender IN (0, 1));
-- Добавляем поле год рождения (минимум текущий год минус 18)
ALTER TABLE public.user_profiles
ADD COLUMN birth_year integer CHECK (
        birth_year <= EXTRACT(
            YEAR
            FROM CURRENT_DATE
        ) - 18
    );
-- Добавляем поле уровень активности (от 0 до 4, по умолчанию 1)
ALTER TABLE public.user_profiles
ADD COLUMN activity_level integer DEFAULT 1 CHECK (
        activity_level >= 0
        AND activity_level <= 4
    );
-- Обновляем функцию upsert_user_profile для работы с новыми полями
CREATE OR REPLACE FUNCTION public.upsert_user_profile(
        p_telegram_user_id bigint,
        p_height_cm integer DEFAULT NULL,
        p_weight_kg decimal DEFAULT NULL,
        p_target_weight_kg decimal DEFAULT NULL,
        p_target_calories integer DEFAULT NULL,
        p_target_protein_g integer DEFAULT NULL,
        p_target_fats_g integer DEFAULT NULL,
        p_target_carbs_g integer DEFAULT NULL,
        p_gender integer DEFAULT NULL,
        p_birth_year integer DEFAULT NULL,
        p_activity_level integer DEFAULT NULL
    ) RETURNS public.user_profiles AS $$
DECLARE v_profile public.user_profiles;
BEGIN
INSERT INTO public.user_profiles (
        telegram_user_id,
        height_cm,
        weight_kg,
        target_weight_kg,
        target_calories,
        target_protein_g,
        target_fats_g,
        target_carbs_g,
        gender,
        birth_year,
        activity_level
    )
VALUES (
        p_telegram_user_id,
        p_height_cm,
        p_weight_kg,
        p_target_weight_kg,
        p_target_calories,
        p_target_protein_g,
        p_target_fats_g,
        p_target_carbs_g,
        p_gender,
        p_birth_year,
        p_activity_level
    ) ON CONFLICT (telegram_user_id) DO
UPDATE
SET height_cm = EXCLUDED.height_cm,
    weight_kg = EXCLUDED.weight_kg,
    target_weight_kg = EXCLUDED.target_weight_kg,
    target_calories = EXCLUDED.target_calories,
    target_protein_g = EXCLUDED.target_protein_g,
    target_fats_g = EXCLUDED.target_fats_g,
    target_carbs_g = EXCLUDED.target_carbs_g,
    gender = EXCLUDED.gender,
    birth_year = EXCLUDED.birth_year,
    activity_level = EXCLUDED.activity_level,
    updated_at = timezone('utc'::text, now())
RETURNING * INTO v_profile;
RETURN v_profile;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;