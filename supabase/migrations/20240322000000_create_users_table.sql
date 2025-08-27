-- Создаем таблицу пользователей
CREATE TABLE IF NOT EXISTS public.users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_user_id bigint NOT NULL UNIQUE,
  username text,
  first_name text,
  last_name text,
  is_premium boolean DEFAULT false NOT NULL,
  premium_expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  last_activity timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS users_telegram_user_id_idx ON public.users(telegram_user_id);
CREATE INDEX IF NOT EXISTS users_is_premium_idx ON public.users(is_premium);

-- Включаем RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Политики безопасности
CREATE POLICY "Service role can do everything" ON public.users
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Функция для проверки премиум доступа
CREATE OR REPLACE FUNCTION public.is_user_premium(user_telegram_id bigint)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE telegram_user_id = user_telegram_id 
    AND is_premium = true 
    AND (premium_expires_at IS NULL OR premium_expires_at > now())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
