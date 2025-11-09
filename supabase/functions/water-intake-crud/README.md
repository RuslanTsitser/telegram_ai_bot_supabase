# Water Intake CRUD API

Полноценная CRUD функция для работы с записями о потреблении воды.

## Endpoint

```
https://your-project.supabase.co/functions/v1/water-intake-crud
```

## Поддерживаемые операции

### 1. GET - Получить записи о воде

#### Получить конкретную запись по ID

```bash
curl -X GET "https://your-project.supabase.co/functions/v1/water-intake-crud?id=abc-123" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

**Ответ:**

```json
{
  "success": true,
  "data": {
    "id": "abc-123",
    "telegram_user_id": 123456789,
    "amount": "sips",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

#### Получить все записи пользователя

```bash
curl -X GET "https://your-project.supabase.co/functions/v1/water-intake-crud?telegram_user_id=123456789" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

**Ответ:**

```json
{
  "success": true,
  "data": [
    {
      "id": "abc-123",
      "telegram_user_id": 123456789,
      "amount": "sips",
      "created_at": "2024-01-15T10:30:00Z"
    },
    {
      "id": "def-456",
      "telegram_user_id": 123456789,
      "amount": "glass",
      "created_at": "2024-01-15T09:15:00Z"
    }
  ],
  "count": 2
}
```

### 2. POST - Создать новую запись о воде

```bash
curl -X POST "https://your-project.supabase.co/functions/v1/water-intake-crud" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "telegram_user_id": 123456789,
    "amount": "sips"
  }'
```

**Ответ:**

```json
{
  "success": true,
  "data": {
    "id": "abc-123",
    "telegram_user_id": 123456789,
    "amount": "sips",
    "created_at": "2024-01-15T10:30:00Z"
  },
  "message": "Water intake recorded successfully"
}
```

### 3. PUT - Обновить запись о воде

```bash
curl -X PUT "https://your-project.supabase.co/functions/v1/water-intake-crud?id=abc-123" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "amount": "glass"
  }'
```

**Ответ:**

```json
{
  "success": true,
  "data": {
    "id": "abc-123",
    "telegram_user_id": 123456789,
    "amount": "glass",
    "created_at": "2024-01-15T10:30:00Z"
  },
  "message": "Water intake updated successfully"
}
```

### 4. DELETE - Удалить запись о воде

```bash
curl -X DELETE "https://your-project.supabase.co/functions/v1/water-intake-crud?id=abc-123&telegram_user_id=123456789" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

**Ответ:**

```json
{
  "success": true,
  "message": "Water intake deleted successfully",
  "deleted_water_intake": {
    "id": "abc-123",
    "telegram_user_id": 123456789,
    "amount": "sips",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

## Параметры запроса

### GET

| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| `id` | string | ❌* | ID записи о воде (для получения конкретной записи) |
| `telegram_user_id` | number | ❌* | ID пользователя в Telegram (для получения всех записей пользователя) |

\* Требуется указать либо `id`, либо `telegram_user_id`

### POST

| Поле | Тип | Обязательное | Описание |
|------|-----|--------------|----------|
| `telegram_user_id` | number | ✅ | ID пользователя в Telegram |
| `amount` | string | ✅ | Количество воды: `"sips"` или `"glass"` |

### PUT

| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| `id` | string | ✅ | ID записи о воде (в query параметрах) |

| Поле | Тип | Обязательное | Описание |
|------|-----|--------------|----------|
| `amount` | string | ✅ | Количество воды: `"sips"` или `"glass"` |

### DELETE

| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| `id` | string | ✅ | ID записи о воде |
| `telegram_user_id` | number | ❌ | ID пользователя в Telegram (для проверки принадлежности) |

## Типы количества воды

| Значение | Описание |
|----------|----------|
| `"sips"` | Несколько глотков (примерно 50 мл) |
| `"glass"` | Стакан воды (примерно 250 мл) |

## Поля записи о воде

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | string | Уникальный ID записи |
| `telegram_user_id` | number | ID пользователя в Telegram |
| `amount` | string | Количество воды: `"sips"` или `"glass"` |
| `created_at` | string | Дата и время создания записи (ISO 8601) |

## Коды ошибок

| Код | Описание |
|-----|----------|
| `200` | Успешный запрос |
| `201` | Успешное создание записи |
| `400` | Некорректные параметры запроса или отсутствуют обязательные поля |
| `404` | Запись или пользователь не найдены |
| `405` | Неподдерживаемый HTTP метод |
| `500` | Внутренняя ошибка сервера |

## Примеры ошибок

### Отсутствует обязательное поле (400)

```json
{
  "error": "Missing required field",
  "details": "telegram_user_id is required"
}
```

### Некорректное значение amount (400)

```json
{
  "error": "Invalid amount value",
  "details": "amount must be either 'sips' or 'glass'"
}
```

### Пользователь не найден (404)

```json
{
  "error": "User not found",
  "details": "User with the provided telegram_user_id does not exist"
}
```

### Запись не найдена (404)

```json
{
  "error": "Water intake not found",
  "details": "Water intake record does not exist"
}
```

## Примеры использования

### JavaScript/TypeScript

```typescript
// Создать запись о воде
async function createWaterIntake(telegramUserId: number, amount: 'sips' | 'glass') {
  const response = await fetch('/functions/v1/water-intake-crud', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({
      telegram_user_id: telegramUserId,
      amount: amount
    })
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

// Получить все записи пользователя
async function getWaterIntakes(telegramUserId: number) {
  const response = await fetch(
    `/functions/v1/water-intake-crud?telegram_user_id=${telegramUserId}`,
    {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    }
  );

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

// Обновить запись
async function updateWaterIntake(id: string, amount: 'sips' | 'glass') {
  const response = await fetch(
    `/functions/v1/water-intake-crud?id=${id}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ amount })
    }
  );

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

// Удалить запись
async function deleteWaterIntake(id: string, telegramUserId?: number) {
  const url = telegramUserId
    ? `/functions/v1/water-intake-crud?id=${id}&telegram_user_id=${telegramUserId}`
    : `/functions/v1/water-intake-crud?id=${id}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

// Использование
try {
  // Создать запись
  const created = await createWaterIntake(123456789, 'sips');
  console.log('Water intake created:', created.data);

  // Получить все записи
  const intakes = await getWaterIntakes(123456789);
  console.log('Water intakes:', intakes.data);

  // Обновить запись
  const updated = await updateWaterIntake(created.data.id, 'glass');
  console.log('Water intake updated:', updated.data);

  // Удалить запись
  const deleted = await deleteWaterIntake(created.data.id, 123456789);
  console.log('Water intake deleted:', deleted.deleted_water_intake);
} catch (error) {
  console.error('Error:', error);
}
```

### Python

```python
import requests

SUPABASE_URL = "https://your-project.supabase.co"
SUPABASE_ANON_KEY = "YOUR_ANON_KEY"

def create_water_intake(telegram_user_id: int, amount: str):
    """Создать запись о воде"""
    url = f"{SUPABASE_URL}/functions/v1/water-intake-crud"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}"
    }
    data = {
        "telegram_user_id": telegram_user_id,
        "amount": amount
    }
    
    response = requests.post(url, headers=headers, json=data)
    response.raise_for_status()
    return response.json()

def get_water_intakes(telegram_user_id: int):
    """Получить все записи пользователя"""
    url = f"{SUPABASE_URL}/functions/v1/water-intake-crud"
    params = {"telegram_user_id": telegram_user_id}
    headers = {
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}"
    }
    
    response = requests.get(url, params=params, headers=headers)
    response.raise_for_status()
    return response.json()

def update_water_intake(water_intake_id: str, amount: str):
    """Обновить запись о воде"""
    url = f"{SUPABASE_URL}/functions/v1/water-intake-crud"
    params = {"id": water_intake_id}
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}"
    }
    data = {"amount": amount}
    
    response = requests.put(url, params=params, headers=headers, json=data)
    response.raise_for_status()
    return response.json()

def delete_water_intake(water_intake_id: str, telegram_user_id: int = None):
    """Удалить запись о воде"""
    url = f"{SUPABASE_URL}/functions/v1/water-intake-crud"
    params = {"id": water_intake_id}
    if telegram_user_id:
        params["telegram_user_id"] = telegram_user_id
    headers = {
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}"
    }
    
    response = requests.delete(url, params=params, headers=headers)
    response.raise_for_status()
    return response.json()

# Использование
try:
    # Создать запись
    created = create_water_intake(123456789, "sips")
    print("Water intake created:", created["data"])

    # Получить все записи
    intakes = get_water_intakes(123456789)
    print("Water intakes:", intakes["data"])

    # Обновить запись
    updated = update_water_intake(created["data"]["id"], "glass")
    print("Water intake updated:", updated["data"])

    # Удалить запись
    deleted = delete_water_intake(created["data"]["id"], 123456789)
    print("Water intake deleted:", deleted["deleted_water_intake"])
except requests.exceptions.HTTPError as e:
    print(f"HTTP error: {e}")
except Exception as e:
    print(f"Error: {e}")
```

## Безопасность

- Функция проверяет существование пользователя перед созданием записи
- При удалении можно указать `telegram_user_id` для проверки принадлежности записи
- Используется Service Role Key для доступа к базе данных
- Поддерживается CORS для веб-приложений

## Особенности

- **CORS поддержка** - функция поддерживает кросс-доменные запросы
- **Валидация данных** - все поля проверяются на корректность
- **Сортировка** - записи пользователя сортируются по дате создания (новые сначала)
- **Детальные ошибки** - подробные сообщения об ошибках валидации
- **Гибкие запросы** - можно получить конкретную запись или все записи пользователя
