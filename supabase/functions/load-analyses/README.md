# Load Analyses API

Функция для загрузки всех анализов еды с пагинацией и сортировкой.

## Endpoint
```
https://your-project.supabase.co/functions/v1/load-analyses
```

## Метод
**GET** - получение всех анализов еды

## Параметры запроса

| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| `limit` | number | ❌ | Количество записей на странице (по умолчанию: 100) |
| `offset` | number | ❌ | Смещение для пагинации (по умолчанию: 0) |
| `sort_by` | string | ❌ | Поле для сортировки (по умолчанию: `created_at`) |
| `sort_order` | string | ❌ | Порядок сортировки: `asc`, `desc` (по умолчанию: `desc`) |

## Доступные поля для сортировки

- `created_at` - дата создания
- `nutrition_score` - оценка питательности
- `calories` - калории
- `mass` - масса
- `chat_id` - ID чата
- `user_id` - ID пользователя

## Пример запроса

```bash
curl -X GET "https://your-project.supabase.co/functions/v1/load-analyses?limit=50&offset=0&sort_by=created_at&sort_order=desc" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

## Ответ

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "chat_id": 123456789,
      "user_id": "user-uuid",
      "message_id": 123,
      "description": "Яблоко",
      "mass": 150,
      "calories": 78,
      "protein": 0.4,
      "carbs": 20.6,
      "sugar": 19.1,
      "fats": 0.2,
      "saturated_fats": 0.1,
      "fiber": 2.4,
      "nutrition_score": 8.5,
      "recommendation": "Отличный выбор!",
      "created_at": "2024-01-15T10:30:00Z",
      "has_image": true,
      "user_text": "Покажи анализ этого яблока"
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

## Поля анализа еды

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | string | Уникальный ID анализа |
| `chat_id` | number | ID чата в Telegram |
| `user_id` | string | ID пользователя в системе |
| `message_id` | number | ID сообщения в Telegram |
| `description` | string | Описание продукта |
| `mass` | number | Масса в граммах |
| `calories` | number | Калории |
| `protein` | number | Белки (г) |
| `carbs` | number | Углеводы (г) |
| `sugar` | number | Сахар (г) |
| `fats` | number | Жиры (г) |
| `saturated_fats` | number | Насыщенные жиры (г) |
| `fiber` | number | Клетчатка (г) |
| `nutrition_score` | number | Оценка питательности (0-10) |
| `recommendation` | string | Рекомендация |
| `created_at` | string | Дата создания |
| `has_image` | boolean | Есть ли изображение |
| `user_text` | string | Текст пользователя |

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

- **Полная информация** - возвращает все поля анализа еды
- **Гибкая сортировка** - можно сортировать по любому доступному полю
- **Пагинация** - поддержка больших объемов данных
- **CORS поддержка** - функция поддерживает кросс-доменные запросы
- **Административная функция** - предназначена для загрузки всех анализов системы
