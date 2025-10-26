# Supabase Edge Functions для Bakery UI

Этот документ описывает 4 новые Supabase Edge Functions, которые заменяют SQL-запросы на REST API вызовы для Bakery UI.

## Созданные функции

### 1. load-users

**Эндпоинт:** `/functions/v1/load-users`

**Описание:** Получает список всех пользователей с пагинацией и сортировкой.

**Параметры запроса:**

- `limit` (опционально): количество записей (по умолчанию 100)
- `offset` (опционально): смещение (по умолчанию 0)
- `sort_by` (опционально): поле для сортировки (по умолчанию "created_at")
- `sort_order` (опционально): направление сортировки "asc" или "desc" (по умолчанию "desc")

**Доступные поля для сортировки:**

- `created_at`, `last_activity`, `telegram_user_id`, `username`, `first_name`, `last_name`, `is_premium`

**Ответ:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "telegram_user_id": 123456789,
      "username": "username",
      "first_name": "Имя",
      "last_name": "Фамилия",
      "is_premium": false,
      "premium_expires_at": null,
      "created_at": "2024-01-01T00:00:00Z",
      "last_activity": "2024-01-01T00:00:00Z",
      "trial_used": false,
      "promo": "PROMO_CODE",
      "language": "ru"
    }
  ],
  "count": 1,
  "limit": 100,
  "offset": 0,
  "total_count": 27,
  "total_pages": 1,
  "current_page": 1,
  "sort_by": "created_at",
  "sort_order": "desc"
}
```

### 2. load-analyses

**Эндпоинт:** `/functions/v1/load-analyses`

**Описание:** Получает список анализов еды с пагинацией и сортировкой.

**Параметры запроса:**

- `limit` (опционально): количество записей (по умолчанию 100)
- `offset` (опционально): смещение (по умолчанию 0)
- `sort_by` (опционально): поле для сортировки (по умолчанию "created_at")
- `sort_order` (опционально): направление сортировки "asc" или "desc" (по умолчанию "desc")

**Доступные поля для сортировки:**

- `created_at`, `nutrition_score`, `calories`, `mass`, `chat_id`, `user_id`

**Ответ:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "chat_id": 123456789,
      "user_id": "uuid",
      "message_id": 123,
      "description": "Описание еды",
      "mass": 100.5,
      "calories": 250.0,
      "protein": 15.0,
      "carbs": 30.0,
      "sugar": 5.0,
      "fats": 10.0,
      "saturated_fats": 3.0,
      "fiber": 5.0,
      "nutrition_score": 7.5,
      "recommendation": "Рекомендация",
      "created_at": "2024-01-01T00:00:00Z",
      "has_image": true,
      "user_text": "Текст пользователя"
    }
  ],
  "count": 1,
  "limit": 100,
  "offset": 0,
  "total_count": 1250,
  "total_pages": 13,
  "current_page": 1
}
```

### 3. load-profiles

**Эндпоинт:** `/functions/v1/load-profiles`

**Описание:** Получает список профилей пользователей с пагинацией и сортировкой.

**Параметры запроса:**

- `limit` (опционально): количество записей (по умолчанию 100)
- `offset` (опционально): смещение (по умолчанию 0)
- `sort_by` (опционально): поле для сортировки (по умолчанию "created_at")
- `sort_order` (опционально): направление сортировки "asc" или "desc" (по умолчанию "desc")

**Доступные поля для сортировки:**

- `created_at`, `updated_at`, `telegram_user_id`, `height_cm`, `weight_kg`, `target_weight_kg`, `birth_year`, `activity_level`

**Ответ:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "telegram_user_id": 123456789,
      "gender": 0,
      "birth_year": 1990,
      "height_cm": 175,
      "weight_kg": 70,
      "target_weight_kg": 65,
      "activity_level": 1,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ],
  "count": 1,
  "limit": 100,
  "offset": 0,
  "total_count": 11,
  "total_pages": 1,
  "current_page": 1
}
```

### 4. load-stats

**Эндпоинт:** `/functions/v1/load-stats`

**Описание:** Получает общую статистику системы.

**Ответ:**

```json
{
  "success": true,
  "data": {
    "total_users": 150,
    "total_analyses": 1250,
    "avg_score": 7.2
  }
}
```

### 5. get-food-analyses

**Эндпоинт:** `/functions/v1/get-food-analyses`

**Описание:** Получает список анализов еды для конкретного пользователя по telegram_user_id с группировкой по периодам и пагинацией групп.

**Параметры запроса:**

- `telegram_user_id` (обязательно): ID пользователя в Telegram
- `page` (опционально): номер страницы (по умолчанию 1)
- `limit` (опционально): количество записей на страницу (по умолчанию 10)
- `group_by` (опционально): группировка по периодам - "day" (по умолчанию), "week", "month"
- `start_date` (опционально): начальная дата фильтрации (формат YYYY-MM-DD)
- `end_date` (опционально): конечная дата фильтрации (формат YYYY-MM-DD)

**Ответ (единый формат):**

```json
{
  "success": true,
  "count": 1,
  "limit": 10,
  "offset": 0,
  "total_count": 25,
  "total_pages": 3,
  "current_page": 1,
  "group_by": "day",
  "grouped_data": [
    {
      "period": "2025-09-01",
      "analyses": [
        {
          "id": "uuid",
          "description": "Описание еды",
          "mass": 350,
          "calories": 500,
          "protein": 25,
          "carbs": 60,
          "fats": 20,
          "nutrition_score": 6,
          "recommendation": "Рекомендация",
          "has_image": true,
          "created_at": "2025-09-01T07:57:58Z"
        }
      ],
      "summary": {
        "totalCalories": 500,
        "totalProtein": 25,
        "totalCarbs": 60,
        "totalFats": 20,
        "averageNutritionScore": 6,
        "count": 1
      }
    }
  ]
}
```

**Примечания:**

- **Всегда группировка**: данные всегда группируются по периодам (по умолчанию по дням)
- **Пагинация по группам**: `limit` определяет количество групп на страницу, `page` - номер страницы групп
- **Единый формат**: все данные находятся в `grouped_data`
- Функция возвращает только необходимые поля для отображения списка анализов (оптимизированный набор данных)
- Исключены технические поля: `chat_id`, `user_id`, `message_id`, `bot_id`, `image_file_id`, `user_text`, `sugar`, `saturated_fats`, `fiber`

## Использование

**Важно:**

- Все функции работают без авторизации и не требуют заголовков Authorization
- Поддерживается CORS для запросов из браузера (Access-Control-Allow-Origin: *)
- Функция `get-food-analyses` поддерживает CORS preflight запросы (OPTIONS)

### Развертывание функций

```bash
# Развернуть все функции
supabase functions deploy load-users
supabase functions deploy load-analyses
supabase functions deploy load-profiles
supabase functions deploy load-stats
supabase functions deploy get-food-analyses
```

### Примеры вызовов

```javascript
// Получить пользователей с пагинацией
const usersResponse = await fetch('https://your-project.supabase.co/functions/v1/load-users?limit=50&offset=0');
const users = await usersResponse.json();

// Получить анализы с пагинацией
const analysesResponse = await fetch('https://your-project.supabase.co/functions/v1/load-analyses?limit=50&offset=0');
const analyses = await analysesResponse.json();

// Получить профили с пагинацией
const profilesResponse = await fetch('https://your-project.supabase.co/functions/v1/load-profiles?limit=50&offset=0');
const profiles = await profilesResponse.json();

// Получить статистику
const statsResponse = await fetch('https://your-project.supabase.co/functions/v1/load-stats');
const stats = await statsResponse.json();

// Получить анализы пользователя с группировкой по дням (по умолчанию)
const userAnalysesResponse = await fetch('https://your-project.supabase.co/functions/v1/get-food-analyses?telegram_user_id=123456789&page=1&limit=10');
const userAnalyses = await userAnalysesResponse.json();
// userAnalyses.grouped_data содержит сгруппированные по дням данные

// Получить анализы пользователя с группировкой по неделям
const groupedByWeekResponse = await fetch('https://your-project.supabase.co/functions/v1/get-food-analyses?telegram_user_id=123456789&group_by=week');
const groupedByWeek = await groupedByWeekResponse.json();
// groupedByWeek.grouped_data содержит сгруппированные по неделям данные

// Получить анализы пользователя с группировкой по месяцам
const groupedByMonthResponse = await fetch('https://your-project.supabase.co/functions/v1/get-food-analyses?telegram_user_id=123456789&group_by=month');
const groupedByMonth = await groupedByMonthResponse.json();
// groupedByMonth.grouped_data содержит сгруппированные по месяцам данные

// Получить анализы пользователя за определенный период
const filteredResponse = await fetch('https://your-project.supabase.co/functions/v1/get-food-analyses?telegram_user_id=123456789&start_date=2025-08-01&end_date=2025-08-31');
const filteredAnalyses = await filteredResponse.json();
```

## Обработка ошибок

Все функции возвращают стандартизированные ответы об ошибках:

```json
{
  "error": "Описание ошибки",
  "details": "Детали ошибки (если доступны)"
}
```

HTTP статус коды:

- `200` - Успешный запрос
- `500` - Внутренняя ошибка сервера

## Информация о пагинации

Все функции с пагинацией (`load-users`, `load-analyses`, `load-profiles`) возвращают дополнительную информацию:

### Поля пагинации

- `count` - количество записей на текущей странице
- `limit` - лимит записей на страницу  
- `offset` - смещение для текущей страницы
- `total_count` - общее количество записей в базе
- `total_pages` - общее количество страниц
- `current_page` - номер текущей страницы (начиная с 1)

### Пример использования пагинации

```javascript
// Получить первую страницу (5 записей)
const page1 = await fetch('https://your-project.supabase.co/functions/v1/load-users?limit=5&offset=0');

// Получить вторую страницу
const page2 = await fetch('https://your-project.supabase.co/functions/v1/load-users?limit=5&offset=5');

// Получить последнюю страницу
const lastPage = await fetch('https://your-project.supabase.co/functions/v1/load-users?limit=5&offset=20');
```

## Информация о сортировке

Все функции с пагинацией поддерживают сортировку по различным полям:

### Параметры сортировки

- `sort_by` - поле для сортировки (по умолчанию "created_at")
- `sort_order` - направление сортировки "asc" или "desc" (по умолчанию "desc")

### Примеры использования сортировки

```javascript
// Сортировка пользователей по имени (A-Z)
const usersByName = await fetch('https://your-project.supabase.co/functions/v1/load-users?sort_by=first_name&sort_order=asc');

// Сортировка анализов по калориям (по убыванию)
const analysesByCalories = await fetch('https://your-project.supabase.co/functions/v1/load-analyses?sort_by=calories&sort_order=desc');

// Сортировка профилей по весу (по возрастанию)
const profilesByWeight = await fetch('https://your-project.supabase.co/functions/v1/load-profiles?sort_by=weight_kg&sort_order=asc');

// Комбинирование сортировки и пагинации
const sortedPage = await fetch('https://your-project.supabase.co/functions/v1/load-users?limit=10&offset=0&sort_by=last_activity&sort_order=desc');
```

## Специальные возможности get-food-analyses

Функция `get-food-analyses` предоставляет уникальные возможности для работы с анализами еды конкретного пользователя:

### Единый формат ответа

Функция всегда возвращает единый формат ответа с группировкой:

- **Всегда группировка**: данные всегда группируются по периодам (по умолчанию по дням)
- **Единый формат**: все данные находятся в `grouped_data`
- **Пагинация по группам**: работает по группам (дням/неделям/месяцам), а не по отдельным анализам

### Группировка по периодам

Функция поддерживает группировку анализов по трем периодам:

- **day** - группировка по дням (формат: YYYY-MM-DD)
- **week** - группировка по неделям (формат: YYYY-WW)  
- **month** - группировка по месяцам (формат: YYYY-MM)

### Сводная статистика

При группировке каждая группа в `grouped_data` содержит сводную статистику:

- `totalCalories` - общее количество калорий
- `totalProtein` - общее количество белка
- `totalCarbs` - общее количество углеводов
- `totalFats` - общее количество жиров
- `averageNutritionScore` - средний балл питательности
- `count` - количество анализов в группе

### Фильтрация по датам

Поддерживается фильтрация анализов по датам:

```javascript
// Анализы за последний месяц
const lastMonth = await fetch('https://your-project.supabase.co/functions/v1/get-food-analyses?telegram_user_id=123456789&start_date=2025-08-01&end_date=2025-08-31');

// Анализы за конкретный день
const specificDay = await fetch('https://your-project.supabase.co/functions/v1/get-food-analyses?telegram_user_id=123456789&start_date=2025-09-01&end_date=2025-09-01');
```

### Комбинирование параметров

Можно комбинировать различные параметры:

```javascript
// Группировка по неделям за определенный период
const weeklyStats = await fetch('https://your-project.supabase.co/functions/v1/get-food-analyses?telegram_user_id=123456789&group_by=week&start_date=2025-08-01&end_date=2025-08-31');

// Пагинация с фильтрацией по датам
const paginatedFiltered = await fetch('https://your-project.supabase.co/functions/v1/get-food-analyses?telegram_user_id=123456789&page=2&limit=5&start_date=2025-08-01&end_date=2025-08-31');
```

### Пагинация при группировке

Функция всегда группирует данные, поэтому пагинация работает по **группам**, а не по отдельным анализам:

```javascript
// Первая страница групп (1 группа на страницу)
const page1 = await fetch('https://your-project.supabase.co/functions/v1/get-food-analyses?telegram_user_id=123456789&page=1&limit=1');
// page1.grouped_data содержит 1 группу (например, анализы за 1 день)

// Вторая страница групп
const page2 = await fetch('https://your-project.supabase.co/functions/v1/get-food-analyses?telegram_user_id=123456789&page=2&limit=1');
// page2.grouped_data содержит следующую группу (анализы за другой день)

// Несколько групп на страницу
const multipleGroups = await fetch('https://your-project.supabase.co/functions/v1/get-food-analyses?telegram_user_id=123456789&group_by=week&page=1&limit=3');
// multipleGroups.grouped_data содержит до 3 групп (недель)

// Группировка по месяцам с пагинацией
const monthlyGroups = await fetch('https://your-project.supabase.co/functions/v1/get-food-analyses?telegram_user_id=123456789&group_by=month&page=1&limit=2');
// monthlyGroups.grouped_data содержит до 2 групп (месяцев)
```

**Важно:** Параметр `limit` определяет количество **групп** на страницу, а не количество анализов.
