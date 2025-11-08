# События аналитики

Документация всех событий, которые логируются в боте через Edge Function `log-event`.

## Структура события

Все события имеют следующую структуру:

- `user_id` - Telegram user ID
- `platform` - `telegram` или `web`
- `event_type` - тип события
- `properties` - дополнительные свойства события (JSON объект)
- `created_at` - время создания события

## События

### 1. `user_registered`

**Когда логируется:** При регистрации нового пользователя в боте (первое обращение к боту).

**Где:** `src/db/upsertUser.ts` - функция `upsertUser()`

**Properties:**

- `language` - язык пользователя (`ru` или `en`)
- `username` - username пользователя в Telegram (может быть `null`)

**Пример:**

```json
{
  "user_id": 123456789,
  "platform": "telegram",
  "event_type": "user_registered",
  "properties": {
    "language": "ru",
    "username": "username"
  }
}
```

---

### 2. `onboarding_completed`

**Когда логируется:** При завершении онбординга (отправка приветственного сообщения).

**Где:** `src/bot/onboarding_simple.ts` - функция `onboardingSimple()`

**Properties:**

- `language` - язык пользователя (`ru` или `en`)
- `has_photo` - было ли отправлено фото (только для русского языка)

**Пример:**

```json
{
  "user_id": 123456789,
  "platform": "telegram",
  "event_type": "onboarding_completed",
  "properties": {
    "language": "ru",
    "has_photo": true
  }
}
```

---

### 3. `command_executed`

**Когда логируется:** При выполнении команды `/start`.

**Где:** `src/bot/handleCommands.ts` - функция `handleCommand()`

**Properties:**

- `command` - название команды (`/start`)
- `traffic_source` - источник трафика из параметра команды (может быть `undefined`)

**Пример:**

```json
{
  "user_id": 123456789,
  "platform": "telegram",
  "event_type": "command_executed",
  "properties": {
    "command": "/start",
    "traffic_source": "channel_name"
  }
}
```

---

### 4. `trial_activated`

**Когда логируется:** При активации триала по промокоду.

**Где:**

- `src/bot/handleCommands.ts` - при активации триала после `/start`
- `src/bot/handleFoodTextAnalysis.ts` - при активации триала через промокод в тексте
- `src/telegram/subscriptionHandlers.ts` - при активации триала через кнопку подписки

**Properties:**

- `promo_code` - промокод, по которому активирован триал
- `plan_id` - ID плана подписки (только в `subscriptionHandlers.ts`)

**Пример:**

```json
{
  "user_id": 123456789,
  "platform": "telegram",
  "event_type": "trial_activated",
  "properties": {
    "promo_code": "A",
    "plan_id": "uuid"
  }
}
```

---

### 5. `subscription_viewed`

**Когда логируется:** При просмотре доступных подписок (команда `/subscriptions` или `/subscriptions_test`).

**Где:** `src/bot/handleCommands.ts` - функция `handleCommand()`

**Properties:**

- `is_test` - используется ли тестовый режим (`true` или `false`)

**Пример:**

```json
{
  "user_id": 123456789,
  "platform": "telegram",
  "event_type": "subscription_viewed",
  "properties": {
    "is_test": false
  }
}
```

---

### 6. `subscription_invoice_created`

**Когда логируется:** При создании invoice для платной подписки.

**Где:** `src/telegram/subscriptionHandlers.ts` - функция `createSubscriptionInvoice()`

**Properties:**

- `plan_id` - ID плана подписки
- `plan_name` - название плана
- `price` - цена подписки
- `is_test` - используется ли тестовый режим

**Пример:**

```json
{
  "user_id": 123456789,
  "platform": "telegram",
  "event_type": "subscription_invoice_created",
  "properties": {
    "plan_id": "uuid",
    "plan_name": "Месячный",
    "price": 299,
    "is_test": false
  }
}
```

---

### 7. `subscription_purchased`

**Когда логируется:** При успешной покупке подписки (после обработки платежа).

**Где:** `src/db/processSuccessfulPayment.ts` - функция `processSuccessfulPayment()`

**Properties:**

- `plan_id` - ID плана подписки
- `plan_name` - название плана
- `price` - цена подписки
- `currency` - валюта платежа
- `duration_days` - длительность подписки в днях

**Пример:**

```json
{
  "user_id": 123456789,
  "platform": "telegram",
  "event_type": "subscription_purchased",
  "properties": {
    "plan_id": "uuid",
    "plan_name": "Месячный",
    "price": 299,
    "currency": "RUB",
    "duration_days": 30
  }
}
```

---

### 8. `food_analysis_text`

**Когда логируется:** При анализе еды по текстовому описанию (успешном или с ошибкой).

**Где:** `src/bot/handleFoodTextAnalysis.ts` - функция `handleFoodTextAnalysis()`

**Properties (успешный анализ):**

- `has_error` - `false`
- `calories` - количество калорий
- `nutrition_score` - оценка питательности

**Properties (ошибка):**

- `has_error` - `true`
- `error` - текст ошибки

**Пример (успешный):**

```json
{
  "user_id": 123456789,
  "platform": "telegram",
  "event_type": "food_analysis_text",
  "properties": {
    "has_error": false,
    "calories": 250,
    "nutrition_score": 8
  }
}
```

**Пример (ошибка):**

```json
{
  "user_id": 123456789,
  "platform": "telegram",
  "event_type": "food_analysis_text",
  "properties": {
    "has_error": true,
    "error": "Ошибка анализа"
  }
}
```

---

### 9. `food_analysis_image`

**Когда логируется:** При анализе еды по изображению (успешном или с ошибкой).

**Где:** `src/bot/handleFoodImageAnalysis.ts` - функция `handleFoodImageAnalysis()`

**Properties (успешный анализ):**

- `has_error` - `false`
- `has_caption` - было ли подписание к изображению
- `calories` - количество калорий
- `nutrition_score` - оценка питательности

**Properties (ошибка):**

- `has_error` - `true`
- `error` - текст ошибки

**Пример (успешный):**

```json
{
  "user_id": 123456789,
  "platform": "telegram",
  "event_type": "food_analysis_image",
  "properties": {
    "has_error": false,
    "has_caption": true,
    "calories": 350,
    "nutrition_score": 7
  }
}
```

---

### 10. `limit_reached`

**Когда логируется:** При достижении лимита на анализ (текст или изображение).

**Где:**

- `src/bot/handleFoodTextAnalysis.ts` - при достижении лимита на текстовый анализ
- `src/bot/handleFoodImageAnalysis.ts` - при достижении лимита на анализ изображений

**Properties:**

- `limit_type` - тип лимита (`text` или `image`)
- `is_premium` - является ли пользователь премиум

**Пример:**

```json
{
  "user_id": 123456789,
  "platform": "telegram",
  "event_type": "limit_reached",
  "properties": {
    "limit_type": "text",
    "is_premium": false
  }
}
```

---

### 11. `support_mode_activated`

**Когда логируется:** При активации режима поддержки (команда `/support`).

**Где:** `src/bot/handleCommands.ts` - функция `handleCommand()`

**Properties:**

- `has_existing_thread` - существует ли уже тред поддержки для пользователя

**Пример:**

```json
{
  "user_id": 123456789,
  "platform": "telegram",
  "event_type": "support_mode_activated",
  "properties": {
    "has_existing_thread": false
  }
}
```

---

## События для веб-приложения

Следующие события должны логироваться из веб-приложения:

### `web_app_opened`

**Когда логируется:** При открытии веб-приложения.

**Properties:**

- `page` - страница, на которую зашел пользователь
- `referrer` - источник перехода (например, `telegram`)

**Пример:**

```json
{
  "user_id": 123456789,
  "platform": "web",
  "event_type": "web_app_opened",
  "properties": {
    "page": "/dashboard",
    "referrer": "telegram"
  }
}
```

---

## SQL запросы для анализа

### Воронка конверсии

```sql
SELECT 
  COUNT(DISTINCT CASE WHEN event_type = 'user_registered' THEN user_id END) as registered,
  COUNT(DISTINCT CASE WHEN event_type = 'onboarding_completed' THEN user_id END) as onboarded,
  COUNT(DISTINCT CASE WHEN event_type IN ('food_analysis_text', 'food_analysis_image') THEN user_id END) as analyzed,
  COUNT(DISTINCT CASE WHEN event_type = 'subscription_purchased' THEN user_id END) as subscribed
FROM events
WHERE created_at >= NOW() - INTERVAL '30 days';
```

### Анализ использования функций

```sql
SELECT 
  event_type,
  COUNT(*) as count,
  COUNT(DISTINCT user_id) as unique_users
FROM events
WHERE platform = 'telegram'
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY event_type
ORDER BY count DESC;
```

### Конверсия в подписку

```sql
SELECT 
  COUNT(DISTINCT CASE WHEN event_type = 'subscription_viewed' THEN user_id END) as viewed,
  COUNT(DISTINCT CASE WHEN event_type = 'subscription_invoice_created' THEN user_id END) as invoice_created,
  COUNT(DISTINCT CASE WHEN event_type = 'subscription_purchased' THEN user_id END) as purchased
FROM events
WHERE created_at >= NOW() - INTERVAL '30 days';
```
