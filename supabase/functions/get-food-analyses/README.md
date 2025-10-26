# Get Food Analyses API

Функция для получения анализов еды пользователя с группировкой по периодам и пагинацией.

## Endpoint


```
https://your-project.supabase.co/functions/v1/get-food-analyses
```


## Метод

**GET** - получение анализов еды пользователя

## Параметры запроса

| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| `telegram_user_id` | number | ✅ | ID пользователя в Telegram |
| `page` | number | ❌ | Номер страницы (по умолчанию: 1) |
| `limit` | number | ❌ | Количество записей на странице (по умолчанию: 10) |
| `group_by` | string | ❌ | Группировка: `day`, `week`, `month` (по умолчанию: `day`) |
| `start_date` | string | ❌ | Начальная дата фильтрации (YYYY-MM-DD) |
| `end_date` | string | ❌ | Конечная дата фильтрации (YYYY-MM-DD) |

## Пример запроса

```bash
curl -X GET "https://your-project.supabase.co/functions/v1/get-food-analyses?telegram_user_id=123456789&page=1&limit=5&group_by=day&start_date=2024-01-01&end_date=2024-01-31" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

## Ответ

```json
{
  "success": true,
  "count": 3,
  "limit": 5,
  "offset": 0,
  "total_count": 15,
  "total_pages": 3,
  "current_page": 1,
  "group_by": "day",
  "grouped_data": [
    {
      "period": "2024-01-15",
      "analyses": [
        {
          "id": "uuid",
          "description": "Яблоко",
          "mass": 150,
          "calories": 78,
          "protein": 0.4,
          "carbs": 20.6,
          "fats": 0.2,
          "nutrition_score": 8.5,
          "recommendation": "Отличный выбор!",
          "has_image": true,
          "created_at": "2024-01-15T10:30:00Z"
        }
      ],
      "summary": {
        "totalCalories": 78,
        "totalProtein": 0.4,
        "totalCarbs": 20.6,
        "totalFats": 0.2,
        "averageNutritionScore": 8.5,
        "count": 1
      }
    }
  ]
}
```

## Группировка


### По дням (`day`)

- Период: `YYYY-MM-DD`

- Пример: `2024-01-15`

### По неделям (`week`)


- Период: `YYYY-WXX`
- Пример: `2024-W03`

### По месяцам (`month`)

- Период: `YYYY-MM`
- Пример: `2024-01`

## Поля анализа еды

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | string | Уникальный ID анализа |
| `description` | string | Описание продукта |
| `mass` | number | Масса в граммах |
| `calories` | number | Калории |
| `protein` | number | Белки (г) |
| `carbs` | number | Углеводы (г) |
| `fats` | number | Жиры (г) |
| `nutrition_score` | number | Оценка питательности (0-10) |
| `recommendation` | string | Рекомендация |
| `has_image` | boolean | Есть ли изображение |

| `created_at` | string | Дата создания |

## Сводка по периоду

Каждая группа содержит сводку:

- `totalCalories` - общие калории за период
- `totalProtein` - общие белки за период
- `totalCarbs` - общие углеводы за период
- `totalFats` - общие жиры за период
- `averageNutritionScore` - средняя оценка питательности
- `count` - количество анализов за период

## Коды ошибок

- `400` - Отсутствует `telegram_user_id`
- `404` - Пользователь не найден
- `500` - Внутренняя ошибка сервера

## Особенности

- **Автоматическая группировка** - данные всегда группируются по выбранному периоду
- **Пагинация по группам** - пагинация применяется к группам, а не к отдельным анализам
- **Фильтрация по датам** - можно ограничить период выборки
- **Сортировка** - группы сортируются по убыванию периода (новые сначала)
- **CORS поддержка** - функция поддерживает кросс-доменные запросы
