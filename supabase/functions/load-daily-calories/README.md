# Load Daily Calories API

Функция для получения списка дней с количеством калорий за каждый день. Поддерживает курсорную пагинацию.

## Endpoint

```
https://your-project.supabase.co/functions/v1/load-daily-calories
```

## Метод

**GET** или **POST** - получение списка дней с калориями

## Параметры запроса

| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| `user_id` | number | ❌ | ID пользователя в Telegram. Если не указан, возвращаются данные для всех пользователей |
| `cursor` | string | ❌ | Курсор для пагинации (дата в формате ISO 8601). Используется для получения следующей страницы |
| `limit` | number | ❌ | Количество дней на странице (по умолчанию: 30, максимум: 100) |

## Пример запроса (GET)

```bash
curl -X GET "https://your-project.supabase.co/functions/v1/load-daily-calories?user_id=123456789&limit=30" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

## Пример запроса (POST)

```bash
curl -X POST "https://your-project.supabase.co/functions/v1/load-daily-calories" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"user_id": 123456789, "limit": 30}'
```

## Пример запроса с курсором (следующая страница)

```bash
curl -X GET "https://your-project.supabase.co/functions/v1/load-daily-calories?user_id=123456789&cursor=2024-01-15T00:00:00.000Z&limit=30" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

## Ответ

```json
{
  "success": true,
  "data": [
    {
      "date": "2024-01-20T00:00:00.000Z",
      "calories": 2150.5
    },
    {
      "date": "2024-01-19T00:00:00.000Z",
      "calories": 1980.2
    },
    {
      "date": "2024-01-18T00:00:00.000Z",
      "calories": 2234.8
    }
  ],
  "cursor": null,
  "next_cursor": "2024-01-18T00:00:00.000Z",
  "limit": 30,
  "has_more": true
}
```

## Поля ответа

| Поле | Тип | Описание |
|------|-----|----------|
| `success` | boolean | Успешность запроса |
| `data` | array | Массив объектов с данными о днях |
| `data[].date` | string | Дата в формате ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ) |
| `data[].calories` | number | Сумма калорий за этот день (округлено до 2 знаков) |
| `cursor` | string \| null | Текущий курсор (дата в формате ISO 8601, с которой началась выборка) |
| `next_cursor` | string \| null | Курсор для следующей страницы (дата в формате ISO 8601 последнего элемента). Если `null`, значит больше нет данных |
| `limit` | number | Количество дней на странице |
| `has_more` | boolean | Есть ли еще данные для загрузки |

## Особенности

### Группировка по дням

- Данные группируются по дате (без учета времени)
- Калории суммируются для каждого дня
- Учитываются только записи с непустым значением `calories`

### Курсорная пагинация

- Курсор - это дата в формате ISO 8601 (`YYYY-MM-DDTHH:mm:ss.sssZ`)
- Для получения следующей страницы используйте значение `next_cursor` из предыдущего ответа
- Данные сортируются по дате по убыванию (от новых к старым)
- Если `next_cursor` равен `null`, значит больше нет данных

### Фильтрация по пользователю

- Если указан `user_id`, возвращаются данные только для этого пользователя
- Если `user_id` не указан, возвращаются данные для всех пользователей

### Ограничения

- Максимальное значение `limit`: 100
- Минимальное значение `limit`: 1
- По умолчанию `limit`: 30

## Коды ошибок

| Код | Описание |
|-----|----------|
| `400` | Некорректный параметр `limit` (должен быть от 1 до 100) |
| `500` | Внутренняя ошибка сервера |

## Особенности реализации

- **Курсорная пагинация** - более эффективна, чем offset-based пагинация для больших объемов данных
- **Группировка в памяти** - данные группируются по дате после получения из базы
- **CORS поддержка** - функция поддерживает кросс-доменные запросы
- **Гибкость** - поддерживает как GET, так и POST запросы

## Примеры использования

### Получение первых 30 дней

```javascript
const response = await fetch('/functions/v1/load-daily-calories?user_id=123456789&limit=30', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${anonKey}`
  }
});

const { data, next_cursor, has_more } = await response.json();
console.log('Дни с калориями:', data);
```

### Получение следующей страницы

```javascript
const response = await fetch(`/functions/v1/load-daily-calories?user_id=123456789&cursor=${nextCursor}&limit=30`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${anonKey}`
  }
});

const { data, next_cursor, has_more } = await response.json();
```

### Загрузка всех данных с пагинацией

```javascript
async function loadAllDailyCalories(userId) {
  const allData = [];
  let cursor = null;
  let hasMore = true;

  while (hasMore) {
    const url = `/functions/v1/load-daily-calories?user_id=${userId}&limit=100${cursor ? `&cursor=${cursor}` : ''}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${anonKey}`
      }
    });

    const result = await response.json();
    allData.push(...result.data);
    cursor = result.next_cursor;
    hasMore = result.has_more;
  }

  return allData;
}
```

### Использование в React компоненте

```javascript
const [dailyCalories, setDailyCalories] = useState([]);
const [nextCursor, setNextCursor] = useState(null);
const [hasMore, setHasMore] = useState(false);

const loadMore = async () => {
  const url = `/functions/v1/load-daily-calories?user_id=${userId}&limit=30${nextCursor ? `&cursor=${nextCursor}` : ''}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${anonKey}`
    }
  });

  const result = await response.json();
  setDailyCalories([...dailyCalories, ...result.data]);
  setNextCursor(result.next_cursor);
  setHasMore(result.has_more);
};

useEffect(() => {
  loadMore();
}, [userId]);
```

## Тестирование

### Успешный запрос

```bash
curl -X POST "https://cmztehabpooymgggejgg.supabase.co/functions/v1/load-daily-calories" \
  -H "Content-Type: application/json" \
  -d '{"user_id": 747213289, "limit": 10}' | jq .
```

### Проверка CORS

```bash
curl -X OPTIONS "https://cmztehabpooymgggejgg.supabase.co/functions/v1/load-daily-calories" \
  -H "Origin: https://example.com" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type, Authorization" \
  -v
```

**CORS заголовки:**

- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization`
