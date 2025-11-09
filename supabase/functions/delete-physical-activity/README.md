# Delete Physical Activity Function

Эта Edge Function позволяет удалять записи активности из базы данных.

## Описание

Функция `delete-physical-activity` предоставляет API для удаления конкретной записи активности. Она проверяет права доступа пользователя и удаляет только те активности, которые принадлежат указанному пользователю.

## Использование

### Endpoint

```
DELETE /functions/v1/delete-physical-activity
```

### Параметры запроса

Тело запроса должно содержать JSON с следующими полями:

| Поле | Тип | Обязательное | Описание |
|------|-----|--------------|----------|
| `activity_id` | string | Да | Уникальный ID активности для удаления |
| `telegram_user_id` | number | Да | ID пользователя в Telegram |

### Пример запроса

```bash
curl -X DELETE "https://your-project.supabase.co/functions/v1/delete-physical-activity" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "activity_id": "123e4567-e89b-12d3-a456-426614174000",
    "telegram_user_id": 123456789
  }'
```

### Ответы

#### Успешное удаление (200)

```json
{
  "success": true,
  "message": "Activity deleted successfully",
  "deleted_activity": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "description": "Бег 5 км",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

#### Активность не найдена (404)

```json
{
  "error": "Activity not found",
  "details": "Activity does not exist or does not belong to this user"
}
```

#### Отсутствует обязательное поле (400)

```json
{
  "error": "Missing required field",
  "details": "activity_id is required"
}
```

#### Ошибка сервера (500)

```json
{
  "error": "Internal server error",
  "details": "Database connection failed"
}
```

## Безопасность

- Функция проверяет, что активность принадлежит указанному пользователю перед удалением
- Используется Service Role Key для доступа к базе данных
- Поддерживается CORS для веб-приложений

## Ограничения

- Можно удалить только одну активность за один запрос
- Удаление необратимо - данные не восстанавливаются
- Пользователь может удалять только свои собственные активности

## Коды ошибок

| Код | Описание |
|-----|----------|
| 200 | Успешное удаление |
| 400 | Некорректные параметры запроса |
| 404 | Активность не найдена |
| 405 | Неподдерживаемый HTTP метод |
| 500 | Внутренняя ошибка сервера |

## Примеры использования

### JavaScript/TypeScript

```typescript
async function deletePhysicalActivity(activityId: string, telegramUserId: number) {
  const response = await fetch('/functions/v1/delete-physical-activity', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({
      activity_id: activityId,
      telegram_user_id: telegramUserId
    })
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

// Использование
try {
  const result = await deletePhysicalActivity(
    '123e4567-e89b-12d3-a456-426614174000',
    123456789
  );
  console.log('Activity deleted:', result.deleted_activity);
} catch (error) {
  console.error('Error deleting activity:', error);
}
```

### Python

```python
import requests
import json

def delete_physical_activity(activity_id: str, telegram_user_id: int):
    url = "https://your-project.supabase.co/functions/v1/delete-physical-activity"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}"
    }
    data = {
        "activity_id": activity_id,
        "telegram_user_id": telegram_user_id
    }
    
    response = requests.delete(url, headers=headers, json=data)
    
    if response.status_code == 200:
        return response.json()
    else:
        raise Exception(f"HTTP error! status: {response.status_code}")

# Использование
try:
    result = delete_physical_activity(
        "123e4567-e89b-12d3-a456-426614174000",
        123456789
    )
    print("Activity deleted:", result["deleted_activity"])
except Exception as e:
    print("Error deleting activity:", e)
```
