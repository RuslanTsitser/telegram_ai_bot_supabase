# Reminders CRUD Edge Function

CRUD API для управления напоминаниями о приеме пищи и воды в Telegram боте.

## Описание

Эта Edge Function предоставляет полный набор операций для управления напоминаниями пользователей:

- **Создание** напоминаний
- **Получение** списка напоминаний пользователя
- **Обновление** существующих напоминаний
- **Удаление** напоминаний

## API Endpoints

### 1. Получение напоминаний пользователя

**GET** `/reminders-crud`

Получает все напоминания для указанного пользователя.

#### Параметры запроса

- `telegram_user_id` (query parameter) - ID пользователя в Telegram
- `x-telegram-user-id` (header) - альтернативный способ передачи ID пользователя

#### Пример запроса

```bash
curl -X GET "https://your-project.supabase.co/functions/v1/reminders-crud?telegram_user_id=123456789"
```

#### Пример ответа

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-here",
      "telegram_user_id": 123456789,
      "reminder_type": "water",
      "is_enabled": true,
      "reminder_time": null,
      "interval_minutes": 120,
      "last_sent_at": "2024-01-15T10:30:00Z",
      "timezone": "UTC",
      "created_at": "2024-01-15T08:00:00Z",
      "updated_at": "2024-01-15T08:00:00Z"
    }
  ]
}
```

### 2. Создание напоминания

**POST** `/reminders-crud`

Создает новое напоминание для пользователя.

#### Параметры запроса

- `telegram_user_id` (query parameter) - ID пользователя в Telegram
- `x-telegram-user-id` (header) - альтернативный способ передачи ID пользователя

#### Тело запроса

```json
{
  "reminder_type": "water" | "meal",
  "is_enabled": true,
  "reminder_time": "13:00",  // для meal (опционально)
  "interval_minutes": 120,   // для water (опционально)
  "timezone": "UTC"         // опционально, по умолчанию UTC
}
```

#### Пример запроса

```bash
curl -X POST "https://your-project.supabase.co/functions/v1/reminders-crud?telegram_user_id=123456789" \
  -H "Content-Type: application/json" \
  -d '{
    "reminder_type": "water",
    "is_enabled": true,
    "interval_minutes": 120,
    "timezone": "UTC"
  }'
```

#### Пример ответа

```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "telegram_user_id": 123456789,
    "reminder_type": "water",
    "is_enabled": true,
    "reminder_time": null,
    "interval_minutes": 120,
    "last_sent_at": null,
    "timezone": "UTC",
    "created_at": "2024-01-15T08:00:00Z",
    "updated_at": "2024-01-15T08:00:00Z"
  }
}
```

### 3. Обновление напоминания

**PUT/PATCH** `/reminders-crud/{id}`

Обновляет существующее напоминание.

#### Параметры запроса

- `id` (path parameter) - ID напоминания
- `telegram_user_id` (query parameter) - ID пользователя в Telegram
- `x-telegram-user-id` (header) - альтернативный способ передачи ID пользователя

#### Тело запроса

```json
{
  "is_enabled": false,
  "reminder_time": "14:00",
  "interval_minutes": 180,
  "timezone": "Europe/Moscow"
}
```

#### Пример запроса

```bash
curl -X PUT "https://your-project.supabase.co/functions/v1/reminders-crud/uuid-here?telegram_user_id=123456789" \
  -H "Content-Type: application/json" \
  -d '{
    "is_enabled": false,
    "interval_minutes": 180
  }'
```

#### Пример ответа

```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "telegram_user_id": 123456789,
    "reminder_type": "water",
    "is_enabled": false,
    "reminder_time": null,
    "interval_minutes": 180,
    "last_sent_at": "2024-01-15T10:30:00Z",
    "timezone": "UTC",
    "created_at": "2024-01-15T08:00:00Z",
    "updated_at": "2024-01-15T12:00:00Z"
  }
}
```

### 4. Удаление напоминания

**DELETE** `/reminders-crud/{id}`

Удаляет напоминание.

#### Параметры запроса

- `id` (path parameter) - ID напоминания
- `telegram_user_id` (query parameter) - ID пользователя в Telegram
- `x-telegram-user-id` (header) - альтернативный способ передачи ID пользователя

#### Пример запроса

```bash
curl -X DELETE "https://your-project.supabase.co/functions/v1/reminders-crud/uuid-here?telegram_user_id=123456789"
```

#### Пример ответа

```json
{
  "success": true
}
```

## Валидация данных

### Типы напоминаний

- `water` - напоминания о воде (требует `interval_minutes`)
- `meal` - напоминания о еде (требует `reminder_time`)

### Формат времени

Время должно быть в формате `HH:MM` (24-часовой формат):

- ✅ `08:00`, `13:30`, `23:59`
- ❌ `8:00`, `1:30 PM`, `25:00`

### Интервал

Для напоминаний о воде интервал должен быть:

- Минимум: 15 минут
- Максимум: 1440 минут (24 часа)

### Часовой пояс

Поддерживаются все стандартные часовые пояса IANA:

- ✅ `UTC`, `Europe/Moscow`, `America/New_York`
- ❌ `GMT+3`, `Moscow`, `invalid`

## Ошибки

### Коды ошибок

| Код | Описание |
|-----|----------|
| 400 | Неверные параметры запроса |
| 401 | Неавторизованный доступ |
| 404 | Напоминание не найдено |
| 405 | Неподдерживаемый метод |
| 500 | Внутренняя ошибка сервера |

### Примеры ошибок

```json
{
  "success": false,
  "error": "Недопустимый тип напоминания. Используйте 'water' или 'meal'"
}
```

```json
{
  "success": false,
  "error": "Для напоминаний о воде необходимо указать интервал"
}
```

```json
{
  "success": false,
  "error": "Напоминание не найдено или не принадлежит пользователю"
}
```

## Безопасность

- Все операции проверяют принадлежность напоминания пользователю
- Используется RLS (Row Level Security) на уровне базы данных
- Поддерживается CORS для веб-приложений
- Валидация всех входных данных

## Переменные окружения

| Переменная | Описание | Обязательная |
|------------|----------|--------------|
| `SUPABASE_URL` | URL проекта Supabase | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Service Role ключ | ✅ |

## Примеры использования

### Создание напоминания о воде каждые 2 часа

```javascript
const response = await fetch('/functions/v1/reminders-crud?telegram_user_id=123456789', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    reminder_type: 'water',
    interval_minutes: 120,
    timezone: 'Europe/Moscow'
  })
});

const result = await response.json();
```

### Создание напоминания о завтраке

```javascript
const response = await fetch('/functions/v1/reminders-crud?telegram_user_id=123456789', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    reminder_type: 'meal',
    reminder_time: '08:00',
    timezone: 'Europe/Moscow'
  })
});

const result = await response.json();
```

### Получение всех напоминаний пользователя

```javascript
const response = await fetch('/functions/v1/reminders-crud?telegram_user_id=123456789');

const result = await response.json();
console.log('Напоминания:', result.data);
```

### Отключение напоминания

```javascript
const response = await fetch('/functions/v1/reminders-crud/uuid-here?telegram_user_id=123456789', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    is_enabled: false
  })
});

const result = await response.json();
```

## Развертывание

```bash
# Развертывание функции
supabase functions deploy reminders-crud

# Проверка статуса
supabase functions list
```

## Мониторинг

Проверьте логи функции в Supabase Dashboard или используйте:

```bash
supabase functions logs reminders-crud
```
