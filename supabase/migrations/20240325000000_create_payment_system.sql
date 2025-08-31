-- Добавляем поля для платежной системы в таблицу users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS trial_used boolean DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS price_test_group text DEFAULT 'A';

-- Создаем таблицу тарифных планов
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  price decimal(10,2) NOT NULL,
  duration_days integer NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Создаем таблицу платежей
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id),
  yookassa_payment_id text UNIQUE,
  amount decimal(10,2) NOT NULL,
  currency text DEFAULT 'RUB',
  status text NOT NULL DEFAULT 'pending', -- pending, succeeded, canceled, failed
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS payments_user_id_idx ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS payments_yookassa_payment_id_idx ON public.payments(yookassa_payment_id);
CREATE INDEX IF NOT EXISTS payments_status_idx ON public.payments(status);
CREATE INDEX IF NOT EXISTS subscription_plans_is_active_idx ON public.subscription_plans(is_active);
CREATE INDEX IF NOT EXISTS users_price_test_group_idx ON public.users(price_test_group);

-- Включаем RLS для новых таблиц
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Политики безопасности
CREATE POLICY "Service role can do everything on subscription_plans" ON public.subscription_plans
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role can do everything on payments" ON public.payments
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Функция для обновления времени последнего изменения
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического обновления updated_at
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Вставляем тарифные планы (группа A)
INSERT INTO public.subscription_plans (name, description, price, duration_days) VALUES
  ('Пробный', 'Пробный период на 3 дня', 0, 3),
  ('Недельный', 'Подписка на неделю', 199, 7),
  ('Месячный', 'Подписка на месяц', 599, 30)
ON CONFLICT DO NOTHING;

-- Функция для проверки лимита анализов в день
CREATE OR REPLACE FUNCTION public.check_daily_analysis_limit(user_telegram_id bigint)
RETURNS boolean AS $$
DECLARE
  daily_count integer;
  is_premium_user boolean;
BEGIN
  -- Проверяем премиум статус
  SELECT is_premium OR (premium_expires_at IS NOT NULL AND premium_expires_at > now())
  INTO is_premium_user
  FROM public.users 
  WHERE telegram_user_id = user_telegram_id;
  
  -- Если премиум - без ограничений
  IF is_premium_user THEN
    RETURN true;
  END IF;
  
  -- Считаем анализы за сегодня
  SELECT COUNT(*)
  INTO daily_count
  FROM public.food_analysis 
  WHERE user_id = user_telegram_id 
    AND DATE(created_at) = CURRENT_DATE;
  
  -- Возвращаем true если меньше 3 анализов
  RETURN daily_count < 3;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
