# Supabase Edge Functions

Этот документ содержит ссылки на документацию для всех Supabase Edge Functions в проекте.

## Доступные функции

### 📊 Аналитика и статистика

- **[get-food-analyses](./get-food-analyses/README.md)** - Получение анализов еды пользователя с группировкой по периодам
- **[load-analyses](./load-analyses/README.md)** - Загрузка всех анализов еды с пагинацией и сортировкой  
- **[load-stats](./load-stats/README.md)** - Получение общей статистики системы

### 👥 Управление пользователями

- **[load-users](./load-users/README.md)** - Загрузка всех пользователей системы с пагинацией
- **[user-profiles-crud](./user-profiles-crud/README.md)** - CRUD операции с профилями пользователей
- **[load-profiles](./load-profiles/README.md)** - Загрузка всех профилей пользователей

## Развертывание

```bash
# Развернуть все функции
supabase functions deploy load-users
supabase functions deploy load-analyses
supabase functions deploy load-profiles
supabase functions deploy load-stats
supabase functions deploy get-food-analyses
supabase functions deploy user-profiles-crud
```

## Общие особенности

- **CORS поддержка** - все функции поддерживают кросс-доменные запросы
- **Стандартизированные ответы** - единый формат ответов и обработки ошибок
- **Пагинация** - поддержка больших объемов данных
- **Валидация** - проверка входных данных

## Структура проекта

```
supabase/functions/
├── README.md                    # Этот файл
├── get-food-analyses/
│   ├── README.md               # Документация функции
│   ├── index.ts                # Код функции
│   └── deno.json               # Конфигурация Deno
├── load-analyses/
│   ├── README.md
│   ├── index.ts
│   └── deno.json
├── load-profiles/
│   ├── README.md
│   ├── index.ts
│   └── deno.json
├── load-stats/
│   ├── README.md
│   ├── index.ts
│   └── deno.json
├── load-users/
│   ├── README.md
│   ├── index.ts
│   └── deno.json
└── user-profiles-crud/
    ├── README.md
    ├── index.ts
    └── deno.json
```
