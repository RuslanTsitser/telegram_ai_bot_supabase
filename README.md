# Telegram Bot для анализа питания

Telegram бот, который помогает анализировать рацион питания.
Бот использует GPT-4 для анализа текстовых описаний и изображений еды.

## Пример работающего бота

[**@food_analyze_bot**](https://t.me/food_analyze_bot) - живой пример бота для анализа питания

## Структура проекта

```structure
telegram_bot_supabase/
|--- supabase/
    |--- functions/
        |--- deepseek-bot/
            |--- scripts/               # Скрипты
                |--- deploy.sh             # Деплой
                |--- run.sh                # Запуск
                |--- set_env.sh            # Настройка переменных окружения
                |--- setup_webhooks.sh     # Настройка webhook'ов
            |--- src/                     # Исходный код
                |--- ai/                   # AI обработчики
                |--- bot/                  # Обработчики ботов
                |--- config/               # Конфигурация ботов
                |--- db/                   # БД обработчики
                |--- interfaces/           # Интерфейсы
                |--- prompts/              # Промпты
                |--- telegram/             # Telegram обработчики
                |--- utils/                # Утилиты
            |--- .env                  # Переменные окружения
            |--- deno.json             # Дено зависимости
            |--- index.ts              # Основной файл бота
    |--- migrations/                   # Миграции БД
        |--- 20240321000000_initial_schema.sql
        |--- 20250920220000_create_user_sessions.sql
        |--- 20250922220000_add_bot_id_to_message_relationships.sql
        |--- 20250922220001_add_bot_id_to_food_analysis.sql
|--- CHANGELOG.md                     # История изменений
|--- LICENSE                          # Лицензия MIT
|--- README.md                        # Документация
```

## Переменные окружения

```env
DEEPSEEK_BOT_TOKEN=your_telegram_bot_token
DEEPSEEK_BOT_FUNCTION_SECRET=your_function_secret
PIAPI_KEY=your_piapi_key
DEEPSEEK_YOOKASSA_PROVIDER_TOKEN=your_yookassa_provider_token
DEEPSEEK_YOOKASSA_PROVIDER_TOKEN_TEST=your_yookassa_provider_token_test
```

## Бизнес правила

В таблице у юзеров есть поля
is_premium - это поле перманентный премиум. Я как админ могу назначать, кому доступен полный функционал
premium_expires_at - для тех, кто купил

Проверка премиума в таком формате:

1) Сначала проверяю is_premium
2) Если не премиум, то проверяю активен ли еще текущий премиум

Тарифы:

1) Пробный на 5 дней
2) Недельный
3) Месячный

Для бесплатного юзера будет доступен анализ по текстовому описанию еды 5 записей в сутки
Для премиум юзера будет доступен анализ по текстовому описанию еды и изображению еды без ограничений

## Лицензия

MIT
