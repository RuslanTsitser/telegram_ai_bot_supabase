# Load User Stats API

Функция для получения статистики конкретного пользователя по его анализам еды.

## Endpoint

```
https://your-project.supabase.co/functions/v1/load-user-stats
```

## Метод

**POST** - получение статистики пользователя

## Параметры запроса

| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| `user_id` | number | Да | ID пользователя в Telegram |

## Пример запроса

```bash
curl -X POST "https://your-project.supabase.co/functions/v1/load-user-stats" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"user_id": 123456789}'
```

## Ответ

```json
{
  "success": true,
  "data": {
    "user_id": 123456789,
    "total_analyses": 25,
    "analyses_with_images": 18,
    "avg_calories": 245.6,
    "avg_protein": 12.3,
    "avg_carbs": 28.7,
    "avg_fats": 8.9,
    "avg_nutrition_score": 7.2
  }
}
```

## Поля статистики

| Поле | Тип | Описание |
|------|-----|----------|
| `user_id` | number | ID пользователя в Telegram |
| `total_analyses` | number | Общее количество анализов пользователя |
| `analyses_with_images` | number | Количество анализов с изображениями |
| `avg_calories` | number \| null | Среднее количество калорий (округлено до 1 знака) |
| `avg_protein` | number \| null | Среднее количество белков в граммах (округлено до 1 знака) |
| `avg_carbs` | number \| null | Среднее количество углеводов в граммах (округлено до 1 знака) |
| `avg_fats` | number \| null | Среднее количество жиров в граммах (округлено до 1 знака) |
| `avg_nutrition_score` | number \| null | Средняя оценка питательности (округлено до 1 знака) |

## Особенности расчета

### Общее количество анализов

- Подсчитывается количество всех анализов пользователя в таблице `food_analysis`
- Включает все проведенные анализы еды конкретного пользователя

### Анализы с изображениями

- Подсчитывается количество анализов, где поле `has_image` равно `true`
- Показывает, сколько раз пользователь отправлял фотографии еды

### Средние значения КБЖУ

- **Калории**: среднее арифметическое всех значений `calories`
- **Белки**: среднее арифметическое всех значений `protein`
- **Углеводы**: среднее арифметическое всех значений `carbs`
- **Жиры**: среднее арифметическое всех значений `fats`
- Исключаются записи с `null` значениями
- Округляются до 1 знака после запятой
- Могут быть `null` если нет анализов с соответствующими значениями

### Средняя оценка питательности

- Рассчитывается как среднее арифметическое всех оценок `nutrition_score`
- Исключаются записи с `null` значениями
- Округляется до 1 знака после запятой
- Может быть `null` если нет анализов с оценками

## Коды ошибок

| Код | Описание |
|-----|----------|
| `400` | Отсутствует обязательный параметр `user_id` |
| `500` | Внутренняя ошибка сервера |

## Особенности

- **Персональная статистика** - функция возвращает данные только для конкретного пользователя
- **Детальная аналитика** - включает как количественные, так и качественные показатели
- **Безопасность** - пользователь может получить только свою статистику
- **CORS поддержка** - функция поддерживает кросс-доменные запросы
- **Оптимизация** - эффективно обрабатывает большие объемы данных пользователя
- **Гибкость** - корректно обрабатывает случаи отсутствия данных

## Тестирование

### Успешный запрос

```bash
curl -X POST "https://cmztehabpooymgggejgg.supabase.co/functions/v1/load-user-stats" \
  -H "Content-Type: application/json" \
  -d '{"user_id": 747213289}' | jq .
```

**Ответ:**

```json
{
  "success": true,
  "data": {
    "user_id": 747213289,
    "total_analyses": 1000,
    "analyses_with_images": 606,
    "avg_calories": 281.3,
    "avg_protein": 17.4,
    "avg_carbs": 29.7,
    "avg_fats": 11.4,
    "avg_nutrition_score": 6.8
  }
}
```

### Проверка CORS

```bash
curl -X OPTIONS "https://cmztehabpooymgggejgg.supabase.co/functions/v1/load-user-stats" \
  -H "Origin: https://example.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v
```

**CORS заголовки:**

- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization`

## Примеры использования

### Получение статистики активного пользователя

```javascript
const response = await fetch('/functions/v1/load-user-stats', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${anonKey}`
  },
  body: JSON.stringify({ user_id: 123456789 })
});

const { data } = await response.json();
console.log(`Пользователь провел ${data.total_analyses} анализов`);
```

### Обработка пустого профиля

```javascript
const { data } = await response.json();

if (data.total_analyses === 0) {
  console.log('У пользователя пока нет анализов');
} else {
  console.log(`Средняя оценка питательности: ${data.avg_nutrition_score}`);
}
```

### Использование в React компоненте

```javascript
const [userStats, setUserStats] = useState(null);

useEffect(() => {
  const fetchUserStats = async () => {
    try {
      const response = await fetch('/functions/v1/load-user-stats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: currentUserId })
      });
      
      const result = await response.json();
      if (result.success) {
        setUserStats(result.data);
      }
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error);
    }
  };

  fetchUserStats();
}, [currentUserId]);
```
