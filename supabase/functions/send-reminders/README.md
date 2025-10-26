# Send Reminders Edge Function

Автоматическая система напоминаний для Telegram бота о воде и приемах пищи.

## Описание

Эта Edge Function обрабатывает напоминания пользователей и отправляет им сообщения через Telegram Bot API. Система поддерживает два типа напоминаний:

- **Вода** - периодические напоминания (например, каждые 2 часа)
- **Еда** - напоминания в определенное время (например, завтрак в 8:00)

## Архитектура

```
pg_cron (каждые 15 минут)
    ↓
Edge Function (send-reminders)
    ↓
Telegram Bot API
    ↓
База данных (обновление статуса)
```

## Таблицы базы данных

### user_reminders

Настройки напоминаний пользователей:

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | UUID | Уникальный идентификатор |
| `telegram_user_id` | BIGINT | ID пользователя в Telegram |
| `reminder_type` | TEXT | Тип напоминания: 'water' или 'meal' |
| `is_enabled` | BOOLEAN | Включено ли напоминание |
| `reminder_time` | TIME | Время напоминания (для еды) |
| `interval_minutes` | INTEGER | Интервал в минутах (для воды) |
| `last_sent_at` | TIMESTAMP | Время последней отправки |
| `timezone` | TEXT | Часовой пояс пользователя |

### reminder_history

История отправленных напоминаний:

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | UUID | Уникальный идентификатор |
| `telegram_user_id` | BIGINT | ID пользователя в Telegram |
| `reminder_type` | TEXT | Тип напоминания |
| `sent_at` | TIMESTAMP | Время отправки |
| `status` | TEXT | Статус: 'sent', 'failed', 'blocked' |
| `error_message` | TEXT | Сообщение об ошибке |
| `reminder_id` | UUID | Ссылка на настройку напоминания |

## Логика работы

### Напоминания по времени (meal)

```typescript
// Если время напоминания уже прошло сегодня
if (now >= reminderDateTime) {
  // И последнее напоминание было не сегодня
  if (!lastSent || lastSent.toDateString() !== now.toDateString()) {
    return true; // Отправляем
  }
}
```

### Периодические напоминания (water)

```typescript
// Если это первое напоминание
if (!lastSent) return true;

// Или если прошло больше времени, чем интервал
const timeSinceLastSent = now.getTime() - lastSent.getTime();
const intervalMs = reminder.interval_minutes * 60 * 1000;
return timeSinceLastSent >= intervalMs;
```

## Сообщения

### Напоминания о воде

- **Русский:** "💧 Время попить воды! Ваш организм нуждается в гидратации."
- **Английский:** "💧 Time to drink water! Your body needs hydration."

### Напоминания о еде

- **Русский:** "🍽️ Время поесть! Вашему организму нужна энергия."
- **Английский:** "🍽️ Time to eat! Your body needs energy."

## Переменные окружения

| Переменная | Описание | Обязательная |
|------------|----------|--------------|
| `SUPABASE_URL` | URL проекта Supabase | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Service Role ключ | ✅ |
| `PRODUCTION_BOT_TOKEN` | Токен Telegram бота | ✅ |

## Расписание (pg_cron)

Функция запускается каждые 15 минут:

```sql
SELECT cron.schedule(
  'send-reminders-every-15-minutes',
  '*/15 * * * *', -- каждые 15 минут
  'SELECT net.http_post(...)'
);
```

### Точность доставки

- **Минимальная задержка:** 0 минут (если время совпадает с запуском cron)
- **Максимальная задержка:** 14 минут 59 секунд

## Примеры использования

### Создание напоминания о воде (каждые 2 часа)

```sql
INSERT INTO user_reminders (telegram_user_id, reminder_type, is_enabled, interval_minutes, timezone) 
VALUES (123456789, 'water', true, 120, 'UTC');
```

### Создание напоминания о еде (в определенное время)

```sql
INSERT INTO user_reminders (telegram_user_id, reminder_type, is_enabled, reminder_time, timezone) 
VALUES (123456789, 'meal', true, '13:00', 'UTC');
```

### Ручной запуск функции

```sql
SELECT net.http_post(
  url := 'https://your-project.supabase.co/functions/v1/send-reminders',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer YOUR_ANON_KEY'
  ),
  body := '{}'::jsonb,
  timeout_milliseconds := 30000
) as request_id;
```

### Проверка истории напоминаний

```sql
SELECT 
  telegram_user_id,
  reminder_type,
  sent_at,
  status,
  error_message
FROM reminder_history
WHERE telegram_user_id = 123456789
ORDER BY sent_at DESC;
```

## Мониторинг

### Проверка статуса pg_cron

```sql
SELECT 
  jobid,
  jobname,
  schedule,
  active,
  last_run
FROM cron.job 
WHERE jobname = 'send-reminders-every-15-minutes';
```

### Проверка истории выполнения

```sql
SELECT 
  *
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'send-reminders-every-15-minutes')
ORDER BY start_time DESC
LIMIT 10;
```

### Проверка HTTP ответов

```sql
SELECT 
  id,
  status_code,
  content,
  error_msg,
  created
FROM net._http_response
ORDER BY created DESC
LIMIT 5;
```

## Ограничения

1. **Максимум 8 задач pg_cron** могут выполняться одновременно
2. **Каждая задача не более 10 минут** выполнения
3. **Точность доставки** зависит от интервала pg_cron (15 минут)
4. **Один пользователь** может иметь неограниченное количество напоминаний

## Безопасность

- Использует RLS (Row Level Security) для защиты данных
- Пользователи видят только свои напоминания
- Service Role имеет доступ ко всем данным для обработки
- Все HTTP запросы логируются

## Развертывание

```bash
# Развертывание функции
supabase functions deploy send-reminders

# Проверка статуса
supabase functions list
```

## Устранение неполадок

### Напоминания не отправляются

1. Проверьте переменные окружения
2. Убедитесь, что pg_cron активен
3. Проверьте логи функции в Dashboard
4. Проверьте статус в `reminder_history`

### Ошибки отправки

1. Проверьте токен бота
2. Убедитесь, что пользователь не заблокировал бота
3. Проверьте формат сообщений

### Проблемы с расписанием

1. Проверьте статус pg_cron: `SELECT * FROM cron.job;`
2. Перезапустите задачу: `SELECT cron.alter_job(job_id, active := true);`
3. Проверьте логи выполнения: `SELECT * FROM cron.job_run_details;`
