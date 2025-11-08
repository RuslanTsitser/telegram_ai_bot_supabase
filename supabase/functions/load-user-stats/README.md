# Load User Stats API

Функция для получения статистики конкретного пользователя по его анализам еды и потреблению воды.

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
    "avg_daily_calories": 2212.8,
    "avg_daily_protein": 137,
    "avg_daily_carbs": 233.4,
    "avg_daily_fats": 89.7,
    "avg_calories": 281,
    "avg_protein": 17.4,
    "avg_carbs": 29.6,
    "avg_fats": 11.4,
    "avg_nutrition_score": 7.2,
    "active_days": 15,
    "total_water_intake": 42,
    "total_water_ml": 8500,
    "avg_daily_water": 566.7
  }
}
```

## Поля статистики

| Поле | Тип | Описание |
|------|-----|----------|
| `user_id` | number | ID пользователя в Telegram |
| `total_analyses` | number | Общее количество анализов пользователя |
| `analyses_with_images` | number | Количество анализов с изображениями |
| `avg_daily_calories` | number \| null | Среднесуточное количество калорий (округлено до 1 знака) |
| `avg_daily_protein` | number \| null | Среднесуточное количество белков в граммах (округлено до 1 знака) |
| `avg_daily_carbs` | number \| null | Среднесуточное количество углеводов в граммах (округлено до 1 знака) |
| `avg_daily_fats` | number \| null | Среднесуточное количество жиров в граммах (округлено до 1 знака) |
| `avg_calories` | number \| null | Среднее количество калорий за анализ (округлено до 1 знака) |
| `avg_protein` | number \| null | Среднее количество белков за анализ в граммах (округлено до 1 знака) |
| `avg_carbs` | number \| null | Среднее количество углеводов за анализ в граммах (округлено до 1 знака) |
| `avg_fats` | number \| null | Среднее количество жиров за анализ в граммах (округлено до 1 знака) |
| `avg_nutrition_score` | number \| null | Средняя оценка питательности (округлено до 1 знака) |
| `active_days` | number | Количество дней, в которые пользователь делал анализы |
| `total_water_intake` | number | Общее количество записей о потреблении воды |
| `total_water_ml` | number | Общее количество выпитой воды в миллилитрах |
| `avg_daily_water` | number \| null | Среднее потребление воды в день в миллилитрах (округлено до 1 знака) |

## Особенности расчета

### Общее количество анализов

- Подсчитывается количество всех анализов пользователя в таблице `food_analysis`
- Включает все проведенные анализы еды конкретного пользователя

### Анализы с изображениями

- Подсчитывается количество анализов, где поле `has_image` равно `true`
- Показывает, сколько раз пользователь отправлял фотографии еды

### Среднесуточные значения КБЖУ

- **Калории**: сумма всех калорий за день, затем среднее по дням
- **Белки**: сумма всех белков за день, затем среднее по дням  
- **Углеводы**: сумма всех углеводов за день, затем среднее по дням
- **Жиры**: сумма всех жиров за день, затем среднее по дням
- Исключаются записи с `null` значениями
- Округляются до 1 знака после запятой
- Могут быть `null` если нет анализов с соответствующими значениями
- **Активные дни**: количество уникальных дней, в которые пользователь делал анализы

### Средние значения КБЖУ (за анализ)

- **Калории**: среднее арифметическое всех значений `calories` по анализам
- **Белки**: среднее арифметическое всех значений `protein` по анализам
- **Углеводы**: среднее арифметическое всех значений `carbs` по анализам
- **Жиры**: среднее арифметическое всех значений `fats` по анализам
- Исключаются записи с `null` значениями
- Округляются до 1 знака после запятой
- Могут быть `null` если нет анализов с соответствующими значениями
- Показывают среднее потребление за один анализ еды

### Средняя оценка питательности

- Рассчитывается как среднее арифметическое всех оценок `nutrition_score`
- Исключаются записи с `null` значениями
- Округляется до 1 знака после запятой
- Может быть `null` если нет анализов с оценками

### Статистика потребления воды

- **Общее количество записей** (`total_water_intake`): подсчитывается количество всех записей о потреблении воды пользователя в таблице `water_intake`
- **Общее количество воды** (`total_water_ml`): сумма всех выпитых миллилитров воды
  - `sips` (пару глотков) = 50 мл
  - `glass` (стакан) = 250 мл
- **Среднее потребление в день** (`avg_daily_water`): среднее количество воды в миллилитрах за день
  - Рассчитывается как общее количество воды, деленное на количество дней, в которые были записи о воде
  - Округляется до 1 знака после запятой
  - Может быть `null` если нет записей о воде

## Коды ошибок

| Код | Описание |
|-----|----------|
| `400` | Отсутствует обязательный параметр `user_id` |
| `500` | Внутренняя ошибка сервера |

## Особенности

- **Персональная статистика** - функция возвращает данные только для конкретного пользователя
- **Детальная аналитика** - включает как количественные, так и качественные показатели по еде и воде
- **Безопасность** - пользователь может получить только свою статистику
- **CORS поддержка** - функция поддерживает кросс-доменные запросы
- **Оптимизация** - эффективно обрабатывает большие объемы данных пользователя
- **Гибкость** - корректно обрабатывает случаи отсутствия данных
- **Учет воды** - включает статистику потребления воды с расчетом в миллилитрах

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
    "analyses_with_images": 604,
    "avg_daily_calories": 2212.8,
    "avg_daily_protein": 137,
    "avg_daily_carbs": 233.4,
    "avg_daily_fats": 89.7,
    "avg_calories": 281,
    "avg_protein": 17.4,
    "avg_carbs": 29.6,
    "avg_fats": 11.4,
    "avg_nutrition_score": 6.8,
    "active_days": 127,
    "total_water_intake": 156,
    "total_water_ml": 31200,
    "avg_daily_water": 245.7
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
console.log(`Выпито воды: ${data.total_water_ml} мл (${data.avg_daily_water} мл/день)`);
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
