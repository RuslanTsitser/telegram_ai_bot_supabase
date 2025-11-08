# Log Event API

Edge Function для логирования событий аналитики из бота и веб-приложения.

## Endpoint

```
https://your-project.supabase.co/functions/v1/log-event
```

## Метод

**POST** - логирование события

## Тело запроса

```json
{
  "user_id": 123456789,
  "platform": "telegram",
  "event_type": "onboarding_message_sent",
  "properties": {
    "message_id": "123",
    "mentions_web_app": true
  }
}
```

## Параметры

| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| `user_id` | number | ✅ | Telegram user ID |
| `platform` | string | ✅ | `telegram` или `web` |
| `event_type` | string | ✅ | Тип события (например, `onboarding_message_sent`, `web_app_opened`) |
| `properties` | object | ❌ | Дополнительные свойства события (JSON объект) |

## Пример запроса

### Из бота (Deno/TypeScript)

```typescript
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/log-event`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      user_id: ctx.from.id,
      platform: "telegram",
      event_type: "onboarding_message_sent",
      properties: {
        message_id: "123",
        mentions_web_app: true,
      },
    }),
  }
);
```

### Из веб-приложения (JavaScript/TypeScript)

```typescript
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/log-event`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      user_id: userId,
      platform: "web",
      event_type: "web_app_opened",
      properties: {
        page: "/dashboard",
        referrer: "telegram",
      },
    }),
  }
);
```

### cURL

```bash
curl -X POST "https://your-project.supabase.co/functions/v1/log-event" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "user_id": 123456789,
    "platform": "telegram",
    "event_type": "onboarding_message_sent",
    "properties": {
      "message_id": "123",
      "mentions_web_app": true
    }
  }'
```

## Ответ

### Успешный ответ

```json
{
  "success": true,
  "event_id": "uuid"
}
```

### Ошибка

```json
{
  "error": "Missing required fields: user_id, platform, event_type"
}
```

## Коды ошибок

- `400` - Отсутствуют обязательные поля или неверный формат
- `405` - Метод не поддерживается (только POST)
- `500` - Внутренняя ошибка сервера

## Особенности

- **CORS поддержка** - функция поддерживает кросс-доменные запросы
- **Валидация** - проверка обязательных полей и формата данных
- **Универсальность** - работает как для бота, так и для веб-приложения
