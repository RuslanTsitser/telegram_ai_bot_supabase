-- Создаем таблицу для хранения интерактивных сессий пользователей
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_user_id bigint NOT NULL REFERENCES public.users(telegram_user_id) ON DELETE CASCADE,
  current_state text NOT NULL, -- текущее состояние диалога
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Индексы для быстрого поиска
CREATE UNIQUE INDEX IF NOT EXISTS user_sessions_telegram_user_id_unique_idx ON public.user_sessions(telegram_user_id);
CREATE INDEX IF NOT EXISTS user_sessions_current_state_idx ON public.user_sessions(current_state);

-- Включаем RLS
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Политики безопасности
CREATE POLICY "Service role can do everything" ON public.user_sessions
  FOR ALL TO service_role USING (true) WITH CHECK (true);
