# User Profiles CRUD API

Полноценная CRUD функция для работы с профилями пользователей.

## Endpoint
```
https://your-project.supabase.co/functions/v1/user-profiles-crud
```

## Поддерживаемые операции

### 1. GET - Получить профиль пользователя
```bash
curl -X GET "https://your-project.supabase.co/functions/v1/user-profiles-crud?telegram_user_id=123456789" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

**Ответ:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "telegram_user_id": 123456789,
    "height_cm": 175,
    "weight_kg": 70,
    "target_weight_kg": 65,
    "gender": 0,
    "birth_year": 1990,
    "activity_level": 2,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T12:00:00Z"
  }
}
```

### 2. POST - Создать новый профиль
```bash
curl -X POST "https://your-project.supabase.co/functions/v1/user-profiles-crud" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "telegram_user_id": 123456789,
    "height_cm": 175,
    "weight_kg": 70,
    "target_weight_kg": 65,
    "gender": 0,
    "birth_year": 1990,
    "activity_level": 2
  }'
```

**Ответ:**
```json
{
  "success": true,
  "data": { /* профиль пользователя */ },
  "message": "User profile created successfully"
}
```

### 3. PUT - Обновить профиль (полное обновление)
```bash
curl -X PUT "https://your-project.supabase.co/functions/v1/user-profiles-crud" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "telegram_user_id": 123456789,
    "height_cm": 180,
    "weight_kg": 75,
    "target_weight_kg": 70,
    "gender": 0,
    "birth_year": 1990,
    "activity_level": 3
  }'
```

**Ответ:**
```json
{
  "success": true,
  "data": { /* обновленный профиль */ },
  "message": "User profile updated successfully"
}
```

### 4. DELETE - Удалить профиль
```bash
curl -X DELETE "https://your-project.supabase.co/functions/v1/user-profiles-crud?telegram_user_id=123456789" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

**Ответ:**
```json
{
  "success": true,
  "message": "User profile deleted successfully"
}
```

## Поля профиля

| Поле | Тип | Описание | Валидация |
|------|-----|----------|-----------|
| `telegram_user_id` | number | ID пользователя в Telegram | Обязательное |
| `height_cm` | number | Рост в сантиметрах | 50-300 см |
| `weight_kg` | number | Вес в килограммах | 20-500 кг |
| `target_weight_kg` | number | Целевой вес в килограммах | 20-500 кг |
| `gender` | number | Пол | 0 (мужской) или 1 (женский) |
| `birth_year` | number | Год рождения | 1900-текущий год |
| `activity_level` | number | Уровень активности | 0-4 |

## Уровни активности

- `0` - Сидячий образ жизни
- `1` - Легкая активность (1-3 раза в неделю)
- `2` - Умеренная активность (3-5 раз в неделю)
- `3` - Высокая активность (6-7 раз в неделю)
- `4` - Очень высокая активность (2 раза в день)

## Коды ошибок

- `400` - Неверные данные или отсутствуют обязательные поля
- `404` - Профиль не найден (только для GET и DELETE)
- `405` - Неподдерживаемый HTTP метод
- `500` - Внутренняя ошибка сервера

## Особенности

- **CORS поддержка** - функция поддерживает кросс-доменные запросы
- **Валидация данных** - все поля проверяются на корректность
- **Upsert для PUT** - если профиль не существует, он будет создан
- **Детальные ошибки** - подробные сообщения об ошибках валидации
