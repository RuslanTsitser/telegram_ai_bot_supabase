# Load Users API

Функция для загрузки всех пользователей системы с пагинацией и сортировкой.

## Endpoint

```
https://your-project.supabase.co/functions/v1/load-users
```

## Метод

**GET** - получение всех пользователей системы

## Параметры запроса

| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| `limit` | number | ❌ | Количество записей на странице (по умолчанию: 100) |
| `offset` | number | ❌ | Смещение для пагинации (по умолчанию: 0) |
| `sort_by` | string | ❌ | Поле для сортировки (по умолчанию: `created_at`) |
| `sort_order` | string | ❌ | Порядок сортировки: `asc`, `desc` (по умолчанию: `desc`) |

## Доступные поля для сортировки

- `created_at` - дата регистрации
- `last_activity` - дата последней активности
- `telegram_user_id` - ID пользователя в Telegram
- `username` - имя пользователя в Telegram
- `first_name` - имя
- `last_name` - фамилия
- `is_premium` - статус премиум

## Пример запроса

```bash
curl -X GET "https://your-project.supabase.co/functions/v1/load-users?limit=50&offset=0&sort_by=created_at&sort_order=desc" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

## Ответ

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "telegram_user_id": 123456789,
      "username": "john_doe",
      "first_name": "John",
      "last_name": "Doe",
      "is_premium": true,
      "premium_expires_at": "2024-12-31T23:59:59Z",
      "created_at": "2024-01-15T10:30:00Z",
      "last_activity": "2024-01-20T15:45:00Z",
      "trial_used": true,
      "used_promo": ["WELCOME2024", "SUMMER2024"],
      "promo": "WELCOME2024",
      "language": "ru",
      "traffic_source": "channel_name"
    }
  ],
  "count": 50,
  "limit": 50,
  "offset": 0,
  "total_count": 1250,
  "total_pages": 25,
  "current_page": 1,
  "sort_by": "created_at",
  "sort_order": "desc"
}
```

## Поля пользователя

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | string | Уникальный ID пользователя в системе |
| `telegram_user_id` | number | ID пользователя в Telegram |
| `username` | string | Имя пользователя в Telegram (может быть null) |
| `first_name` | string | Имя пользователя (может быть null) |
| `last_name` | string | Фамилия пользователя (может быть null) |
| `is_premium` | boolean | Статус премиум подписки |
| `premium_expires_at` | string | Дата окончания премиум подписки (может быть null) |
| `created_at` | string | Дата регистрации |
| `last_activity` | string | Дата последней активности (может быть null) |
| `trial_used` | boolean | Использован ли пробный период |
| `used_promo` | string[] | Массив использованных промо-кодов |
| `promo` | string | Использованный промо-код |
| `language` | string | Язык интерфейса (ru/en) |
| `traffic_source` | string | Источник трафика (откуда пришел пользователь, например channel_name из команды /start). Может быть null |

## Статусы премиум

- `is_premium: true` - активная премиум подписка
- `is_premium: false` - обычный пользователь
- `premium_expires_at` - дата окончания подписки (если есть)

## Языки

- `ru` - русский язык
- `en` - английский язык

## Пагинация

- `count` - количество записей в текущем ответе
- `limit` - максимальное количество записей на странице
- `offset` - смещение от начала
- `total_count` - общее количество записей
- `total_pages` - общее количество страниц
- `current_page` - текущая страница

## Коды ошибок

- `400` - Неверные параметры сортировки
- `500` - Внутренняя ошибка сервера

## Особенности

- **Полная информация** - возвращает все поля пользователя
- **Гибкая сортировка** - можно сортировать по любому доступному полю
- **Пагинация** - поддержка больших объемов данных
- **CORS поддержка** - функция поддерживает кросс-доменные запросы
- **Административная функция** - предназначена для управления пользователями
- **Аналитика** - полезна для анализа пользовательской базы
- **CRM** - подходит для систем управления клиентами
