# Telegram Bot для анализа питания

Telegram бот, который помогает анализировать рацион питания. Бот использует GPT-4 для анализа текстовых описаний и изображений еды.

## Функциональность

### 🍽 Анализ рациона

- Анализ текстового описания рациона за день
- Расчет КБЖУ и других показателей
- Разделение по приемам пищи
- Рекомендации по сбалансированности питания

### 📸 Анализ фото еды

- Распознавание блюд на фотографиях
- Оценка питательной ценности
- Расчет калорий, белков, жиров, углеводов
- Рекомендации по питательности

## Технологии

- Deno
- Telegram Bot API
- Supabase
- GPT-4 API
- TypeScript

## Установка и запуск

1. Клонируйте репозиторий:

```bash
git clone [repository-url]
cd telegram_bot_supabase
```

2. Создайте файл `.env` в корневой директории:

```env
DEEPSEEK_BOT_TOKEN=your_telegram_bot_token
DEEPSEEK_BOT_FUNCTION_SECRET=your_function_secret
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_ANON_KEY
PIAPI_KEY=your_piapi_key
```

3. Установите зависимости:

```bash
deno cache --reload main.ts
```

4. Запустите бота локально:

```bash
deno run --allow-net --allow-env main.ts
```

## Деплой

### Локальная разработка

1. Запустите локальное окружение Supabase:

```bash
supabase start
```

2. Настройте переменные окружения:

```bash
cd supabase/functions/deepseek-bot
./set_env.sh
```

### Настройка Telegram для локального тестирования

1. Создайте бота через [@BotFather](https://t.me/BotFather) и получите токен
2. Настройте вебхук для локального тестирования:

```bash
# Установите ngrok для создания публичного URL
brew install ngrok  # для macOS
# или скачайте с https://ngrok.com/download

# Запустите ngrok для проксирования локального порта
ngrok http 54321

# Скопируйте полученный HTTPS URL (например, https://xxxx-xx-xx-xxx-xx.ngrok.io)
```

3. Установите вебхук для бота:

```bash
# Замените {BOT_TOKEN} на токен вашего бота
# Замените {NGROK_URL} на URL, полученный от ngrok
curl -F "url={NGROK_URL}/functions/v1/deepseek-bot" \
     -F "secret_token={DEEPSEEK_BOT_FUNCTION_SECRET}" \
     https://api.telegram.org/bot{BOT_TOKEN}/setWebhook
```

4. Проверьте настройку вебхука:

```bash
curl https://api.telegram.org/bot{BOT_TOKEN}/getWebhookInfo
```

5. Для остановки вебхука после тестирования:

```bash
curl https://api.telegram.org/bot{BOT_TOKEN}/deleteWebhook
```

### Деплой в Supabase

1. Деплой функции:

```bash
cd supabase/functions/deepseek-bot
./deploy.sh
```

2. Проверьте статус деплоя:

```bash
supabase functions list
```

### Скрипты

В директории `supabase/functions/deepseek-bot/` доступны следующие скрипты:

- `set_env.sh` - настройка переменных окружения
- `deploy.sh` - деплой функции в Supabase
- `run.sh` - запуск функции локально

## Использование

### Анализ рациона

1. Отправьте сообщение "Оцени рацион" и опишите свой рацион за день
2. Бот проанализирует питательную ценность и даст рекомендации

### Анализ фото еды

1. Отправьте фотографию еды с подписью "Проанализируй изображение еды"
2. Бот распознает блюдо и предоставит анализ питательной ценности

## Структура проекта

```
telegram_bot_supabase/
├── supabase/
│   └── functions/
│       └── deepseek-bot/
│           ├── index.ts              # Основной файл бота
│           ├── handle_calculate_food.ts  # Обработчик анализа рациона
│           └── handle_food_image.ts  # Обработчик анализа фото
├── .env
└── README.md
```

## Разработка

### Добавление новых функций

1. Создайте новый файл обработчика в директории `supabase/functions/deepseek-bot/`
2. Импортируйте и используйте новый обработчик в `index.ts`
3. Обновите приветственное сообщение, если необходимо

### Тестирование

1. Запустите бота локально
2. Протестируйте новую функциональность в Telegram
3. Проверьте логи на наличие ошибок

## Лицензия

MIT
