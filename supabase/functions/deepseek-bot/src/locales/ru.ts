export const ru = {
  // Общие сообщения
  welcome: "👋 Добро пожаловать! Я помогу вам анализировать питание.",
  error: "❌ Произошла ошибка",
  cancel: "Отмена",

  // Команды
  start: "Начать",
  help: "Помощь",
  profile: "Профиль",
  limits: "Лимиты",
  subscriptions: "Подписки",
  language: "Язык",
  set_promo: "Промо-код",

  // Профиль пользователя
  profile_saved: "👤 Профиль успешно сохранен",
  profile_height: "📏 Рост",
  profile_weight: "⚖️ Вес",
  profile_target_weight: "🎯 Целевой вес",
  profile_gender: "👥 Пол",
  profile_birth_year: "📅 Год рождения",
  profile_activity_level: "💪 Уровень активности",
  profile_male: "Мужской",
  profile_female: "Женский",

  // Настройка профиля
  enter_height:
    "📏 Введите ваш рост в сантиметрах или введите /cancel для отмены",
  enter_weight: "⚖️ Теперь введите ваш вес в килограммах",
  enter_target_weight: "🎯 Теперь введите вашу цель в килограммах",
  enter_gender: "👥 Теперь укажите ваш пол (М или Ж)",
  enter_age: "Теперь укажите ваш год рождения (например, 1996)",
  enter_activity_level: `📏 Теперь укажите ваш уровень активности
0 - Низкая активность, сидячий образ жизни
1 - Легкая активность, прогулки, 1-3 тренировки в неделю
2 - Средняя активность, 3-5 тренировок в неделю
3 - Высокая активность, ежедневные тренировки
4 - Очень высокая активность, интенсивные ежедневные тренировки`,

  // Валидация
  invalid_height:
    "📏 Пожалуйста, введите ваш рост в сантиметрах или введите /cancel для отмены",
  invalid_weight:
    "⚖️ Пожалуйста, введите ваш вес в килограммах или введите /cancel для отмены",
  invalid_target_weight:
    "🎯 Пожалуйста, введите вашу цель в килограммах или введите /cancel для отмены",
  invalid_gender:
    "👥 Пожалуйста, укажите ваш пол (М или Ж) или введите /cancel для отмены",
  invalid_age:
    "📅 Пожалуйста, укажите ваш год рождения (например, 1996) или введите /cancel для отмены",
  invalid_activity_level:
    "💪 Пожалуйста, укажите ваш уровень активности (0-4) или введите /cancel для отмены",
  enter_promo_code: "🎟️ Введите ваш промо-код или введите /cancel для отмены",
  invalid_promo_code:
    "🎟️ Пожалуйста, введите корректный промо-код или введите /cancel для отмены",
  promo_code_update_error: "❌ Ошибка при обновлении промо-кода",
  promo_code_updated: "✅ Промо-код успешно обновлен: {code}",

  // Расчеты
  bmi: "Индекс массы тела",
  target_calories: "Цель по калориям",
  target_protein: "Цель по белкам",
  target_fats: "Цель по жирам",
  target_carbs: "Цель по углеводам",

  // Лимиты
  limits_title: "📊 Ваши текущие лимиты:",
  premium_active: "✅ Премиум статус активен",
  premium_unlimited: "🎉 Безлимитный доступ ко всем функциям:",
  premium_text_analysis: "• Анализ по тексту: без ограничений",
  premium_image_analysis: "• Анализ по изображениям: без ограничений",
  free_account: "🆓 Бесплатный аккаунт",
  free_features: "📝 Доступные функции:",
  free_text_analysis: "• Анализ по тексту:",
  free_text_analysis_limit: "из 5 в день",
  free_text_analysis_exhausted: "лимит исчерпан",
  free_image_analysis: "• Анализ по изображениям: только для премиум",
  subscribe_prompt:
    "💎 Оформите подписку командой /subscriptions для получения полного доступа",

  // Подписки
  subscriptions_title: "💳 Доступные тарифы:",
  subscription_activated: '🎉 Подписка "{planName}" успешно активирована!',
  subscription_expires: "Доступен до: {date}",
  subscription_full_access: "Теперь у вас есть полный доступ ко всем функциям!",
  payment_error: "❌ Произошла ошибка при обработке платежа",

  // Анализ изображений
  image_analysis_premium_only:
    "🚫 Анализ изображений доступен только премиум пользователям!",
  image_analysis_subscribe:
    "💎 Оформите подписку командой /subscriptions для получения полного доступа ко всем функциям.",
  access_check_error: "❌ Произошла ошибка при проверке доступа",
  image_get_error: "Извините, не удалось получить изображение.",
  image_default_prompt:
    "Проанализируй это изображение еды и предоставь детальный анализ питательной ценности.",
  server_response_error: "Извините, не удалось получить ответ от сервера.",
  response_processing_error: "Извините, произошла ошибка при обработке ответа.",

  // Анализ текста
  text_analysis_limit_reached: "🚫 Достигнут дневной лимит анализов!",
  text_analysis_remaining: "📊 Осталось анализов сегодня: {count}",
  text_analysis_subscribe:
    "💎 Оформите подписку командой /subscriptions для получения безлимитного доступа.",
  text_analysis_remaining_after: "📊 Осталось анализов сегодня: {count}",
  text_analysis_subscribe_after:
    "💎 Оформите подписку командой /subscriptions для безлимитного доступа!",

  // Языки
  language_changed: "🌐 Язык изменен на русский",
  select_language: "🌐 Выберите язык:",

  // Навигация
  change_profile: "Вы можете изменить профиль с помощью команды /set_profile",
  profile_settings:
    'Или в настройках профиля (кнопка Stats), вкладка "Профиль"',
  start_analysis:
    "Чтобы начать анализ, пожалуйста, пришлите фотографию блюда или опишите его текстом :)",

  // Единицы измерения
  cm: "см",
  kg: "кг",
  g: "г",
  kcal: "ккал",

  // Форматирование анализа еды
  food_description_emoji: "🍽 ",
  nutrition_title: "📊 Питательная ценность:",
  estimated_weight: "• Примерный вес: ",
  calories: "• Калории: ",
  protein: "• Белки: ",
  fats: "• Жиры: ",
  saturated_fats: "  - Насыщенные: ",
  carbs: "• Углеводы: ",
  sugar: "  - Сахар: ",
  fiber: "• Клетчатка: ",
  nutrition_score: "⭐ Оценка питательности: ",
  nutrition_score_max: "/10",
  recommendations: "💡 Рекомендации:",

  // Onboarding
  onboarding_welcome: "👋 Привет! Я бот для анализа питания.",
  onboarding_description:
    "🤖 Я помогу вам посчитать КБЖУ блюда по текстовому описанию или фотографии.",
  onboarding_photo:
    "📸 Для анализа по фотографии достаточно отправить фотографию блюда.",
  onboarding_text:
    "✍️ Для анализа по описанию достаточно отправить текст с описанием блюда.",
  onboarding_examples_title: "📝 Примеры текстового описания блюда:",
  onboarding_example1:
    "- Макароны из твердых сортов пшеницы вареные в воде 100 г, куриное филе отварное 100 г",
  onboarding_example2: "- Бургер из KFC с картофелем фри и напитком 500 мл",
  onboarding_example3: "- Перекус из банана и йогурта",
  onboarding_screenshots:
    "Ниже приведены скриншоты примеров анализа по фотографии",
  onboarding_important: "⚠️ Важно:",
  onboarding_text_tip:
    "📝 - Чтобы мне было проще посчитать питательную ценность, пожалуйста, опишите блюдо максимально подробно",
  onboarding_photo_tip:
    "📸 - На фотографии должны быть отчетливо видны все продукты, которые составляют блюдо",
  onboarding_edit_tip:
    "✏️ Если я неточно определил блюдо, вы всегда можете отредактировать сообщение, и я проанализую его заново",
  onboarding_app_title:
    "📱 У меня есть также специальное приложение, в котором вы сможете:",
  onboarding_app_feature1: "1) 📊 смотреть статистику по КБЖУ за день",
  onboarding_app_feature2: "2) 🗑️ удалять блюда из истории",
  onboarding_app_feature3: "3) ⚙️ изменять настройки профиля",
  onboarding_limits:
    "📝 Для всех пользователей я могу анализировать блюда по текстовому описанию 5 раз в день.",
  onboarding_premium:
    "⭐️ Для премиум пользователей анализ блюд - без ограничений.",
  onboarding_premium_photo:
    "📸 Также открывается безлимитный доступ к анализу блюд по фотографии.",
  onboarding_subscribe:
    "💫 Оформите премиум подписку для получения полного доступа ко всем функциям, нажмите /subscriptions",
  onboarding_promo:
    "🎟️ Если у вас есть промо-код, используйте команду /set_promo для его активации",
  onboarding_profile:
    "Также предлагаю настроить профиль с помощью команды /set_profile",

  // Onboarding captions
  onboarding_caption_text_example:
    "Пример анализа блюда по текстовому описанию",
  onboarding_caption_photo_example: "Пример анализа блюда по фотографии",
  onboarding_caption_combined_example:
    "Пример анализа блюда по фотографии и текстовому описанию",
  onboarding_caption_app_open: "Как открыть приложение",
  onboarding_caption_stats: "Экран статистики",
  onboarding_caption_delete:
    "Для удаления блюда из истории достаточно просто свайпнуть влево",
  onboarding_caption_profile: "Настройки профиля",
} as const;
