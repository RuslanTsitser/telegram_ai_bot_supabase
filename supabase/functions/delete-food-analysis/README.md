# Delete Food Analysis Function

Эта Edge Function позволяет удалять записи анализа еды из базы данных.

## Описание

Функция `delete-food-analysis` предоставляет API для удаления конкретной записи анализа еды. Она проверяет права доступа пользователя и удаляет только те анализы, которые принадлежат указанному пользователю.

## Использование

### Endpoint

```
DELETE /functions/v1/delete-food-analysis
```

### Параметры запроса

Тело запроса должно содержать JSON с следующими полями:

| Поле | Тип | Обязательное | Описание |
|------|-----|--------------|----------|
| `analysis_id` | string | Да | Уникальный ID анализа для удаления |
| `telegram_user_id` | number | Да | ID пользователя в Telegram |

### Пример запроса

```bash
curl -X DELETE "https://your-project.supabase.co/functions/v1/delete-food-analysis" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "analysis_id": "123e4567-e89b-12d3-a456-426614174000",
    "telegram_user_id": 123456789
  }'
```

### Ответы

#### Успешное удаление (200)

```json
{
  "success": true,
  "message": "Analysis deleted successfully",
  "deleted_analysis": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "description": "Яблоко",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

#### Анализ не найден (404)

```json
{
  "error": "Analysis not found",
  "details": "Analysis does not exist or does not belong to this user"
}
```

#### Отсутствует обязательное поле (400)

```json
{
  "error": "Missing required field",
  "details": "analysis_id is required"
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

- Функция проверяет, что анализ принадлежит указанному пользователю перед удалением
- Используется Service Role Key для доступа к базе данных
- Поддерживается CORS для веб-приложений

## Ограничения

- Можно удалить только один анализ за один запрос
- Удаление необратимо - данные не восстанавливаются
- Пользователь может удалять только свои собственные анализы

## Коды ошибок

| Код | Описание |
|-----|----------|
| 200 | Успешное удаление |
| 400 | Некорректные параметры запроса |
| 404 | Анализ не найден |
| 405 | Неподдерживаемый HTTP метод |
| 500 | Внутренняя ошибка сервера |

## Примеры использования

### JavaScript/TypeScript

```typescript
async function deleteFoodAnalysis(analysisId: string, telegramUserId: number) {
  const response = await fetch('/functions/v1/delete-food-analysis', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({
      analysis_id: analysisId,
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
  const result = await deleteFoodAnalysis(
    '123e4567-e89b-12d3-a456-426614174000',
    123456789
  );
  console.log('Analysis deleted:', result.deleted_analysis);
} catch (error) {
  console.error('Error deleting analysis:', error);
}
```

### Python

```python
import requests
import json

def delete_food_analysis(analysis_id: str, telegram_user_id: int):
    url = "https://your-project.supabase.co/functions/v1/delete-food-analysis"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}"
    }
    data = {
        "analysis_id": analysis_id,
        "telegram_user_id": telegram_user_id
    }
    
    response = requests.delete(url, headers=headers, json=data)
    
    if response.status_code == 200:
        return response.json()
    else:
        raise Exception(f"HTTP error! status: {response.status_code}")

# Использование
try:
    result = delete_food_analysis(
        "123e4567-e89b-12d3-a456-426614174000",
        123456789
    )
    print("Analysis deleted:", result["deleted_analysis"])
except Exception as e:
    print("Error deleting analysis:", e)
```
