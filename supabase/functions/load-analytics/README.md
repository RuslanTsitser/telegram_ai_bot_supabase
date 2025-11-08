# Load Analytics API

Функция для получения данных аналитики из таблицы событий.

## Endpoint

```
https://your-project.supabase.co/functions/v1/load-analytics
```

## Метод

**GET** - получение данных аналитики

## Параметры запроса

| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| `type` | string | ❌ | Тип аналитики: `funnel`, `usage`, `subscription` (по умолчанию: `funnel`) |
| `days` | number | ❌ | Период в днях для анализа (по умолчанию: 30, диапазон: 1-365) |
| `platform` | string | ❌ | Фильтр по платформе: `telegram`, `web` (по умолчанию: все платформы) |

## Типы аналитики

### 1. `funnel` - Воронка конверсии

Показывает количество уникальных пользователей на каждом этапе воронки:

- `registered` - зарегистрированные пользователи
- `onboarded` - завершившие онбординг
- `analyzed` - выполнившие анализ еды
- `subscribed` - купившие подписку

**Пример запроса:**

```bash
curl -X GET "https://your-project.supabase.co/functions/v1/load-analytics?type=funnel&days=30" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

**Пример ответа:**

```json
{
  "success": true,
  "type": "funnel",
  "period_days": 30,
  "platform": "all",
  "data": {
    "registered": 1000,
    "onboarded": 850,
    "analyzed": 600,
    "subscribed": 150
  }
}
```

### 2. `usage` - Анализ использования функций

Показывает статистику по типам событий:

- `event_type` - тип события
- `count` - общее количество событий
- `unique_users` - количество уникальных пользователей

**Пример запроса:**

```bash
curl -X GET "https://your-project.supabase.co/functions/v1/load-analytics?type=usage&days=7&platform=telegram" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

**Пример ответа:**

```json
{
  "success": true,
  "type": "usage",
  "period_days": 7,
  "platform": "telegram",
  "data": [
    {
      "event_type": "food_analysis_text",
      "count": 1250,
      "unique_users": 450
    },
    {
      "event_type": "food_analysis_image",
      "count": 890,
      "unique_users": 320
    },
    {
      "event_type": "command_executed",
      "count": 650,
      "unique_users": 280
    }
  ]
}
```

### 3. `subscription` - Конверсия в подписку

Показывает конверсию на этапах подписки:

- `viewed` - просмотрели страницу подписок
- `invoice_created` - создали invoice
- `purchased` - купили подписку

**Пример запроса:**

```bash
curl -X GET "https://your-project.supabase.co/functions/v1/load-analytics?type=subscription&days=30" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

**Пример ответа:**

```json
{
  "success": true,
  "type": "subscription",
  "period_days": 30,
  "platform": "all",
  "data": {
    "viewed": 500,
    "invoice_created": 200,
    "purchased": 150
  }
}
```

## Ошибки

### 400 Bad Request

**Неверный тип аналитики:**

```json
{
  "error": "Invalid type parameter",
  "details": "Allowed values: funnel, usage, subscription"
}
```

**Неверный период:**

```json
{
  "error": "Invalid days parameter",
  "details": "Days must be between 1 and 365"
}
```

**Неверная платформа:**

```json
{
  "error": "Invalid platform parameter",
  "details": "Platform must be 'telegram' or 'web'"
}
```

### 500 Internal Server Error

```json
{
  "error": "Failed to fetch [type] data",
  "details": "Error message"
}
```

## Примеры использования

### Получить воронку конверсии за последние 7 дней для Telegram

```bash
curl -X GET "https://your-project.supabase.co/functions/v1/load-analytics?type=funnel&days=7&platform=telegram" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### Получить статистику использования за последние 30 дней

```bash
curl -X GET "https://your-project.supabase.co/functions/v1/load-analytics?type=usage&days=30" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### Получить конверсию в подписку за последние 90 дней

```bash
curl -X GET "https://your-project.supabase.co/functions/v1/load-analytics?type=subscription&days=90" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

## CORS

Функция поддерживает CORS и может быть вызвана из браузера.

## Аутентификация

Функция использует `SUPABASE_SERVICE_ROLE_KEY` для доступа к базе данных. Для вызова из внешних приложений используйте `SUPABASE_ANON_KEY` в заголовке `Authorization`.
