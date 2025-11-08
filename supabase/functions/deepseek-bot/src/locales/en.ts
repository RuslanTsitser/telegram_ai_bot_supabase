export const en = {
  // General messages
  welcome: "👋 Welcome! I'll help you analyze your nutrition.",
  error: "❌ An error occurred",
  cancel: "Cancel",

  // Commands
  start: "Start",
  help: "Help",
  profile: "Profile",
  limits: "Limits",
  subscriptions: "Subscriptions",
  language: "Language",
  set_promo: "Promo code",

  // User profile
  profile_saved: "👤 Profile successfully saved",
  profile_height: "📏 Height",
  profile_weight: "⚖️ Weight",
  profile_target_weight: "🎯 Target weight",
  profile_gender: "👥 Gender",
  profile_birth_year: "📅 Birth year",
  profile_activity_level: "💪 Activity level",
  profile_male: "Male",
  profile_female: "Female",

  // Profile setup
  enter_height: "📏 Enter your height in centimeters or type /cancel to cancel",
  enter_weight: "⚖️ Now enter your weight in kilograms",
  enter_target_weight: "🎯 Now enter your target weight in kilograms",
  enter_gender: "👥 Now specify your gender (M or F)",
  enter_age: "Now specify your birth year (e.g., 1996)",
  enter_activity_level: `📏 Now specify your activity level
0 - Low activity, sedentary lifestyle
1 - Light activity, walks, 1-3 workouts per week
2 - Moderate activity, 3-5 workouts per week
3 - High activity, daily workouts
4 - Very high activity, intense daily workouts`,

  // Validation
  invalid_height:
    "📏 Please enter your height in centimeters or type /cancel to cancel",
  invalid_weight:
    "⚖️ Please enter your weight in kilograms or type /cancel to cancel",
  invalid_target_weight:
    "🎯 Please enter your target weight in kilograms or type /cancel to cancel",
  invalid_gender:
    "👥 Please specify your gender (M or F) or type /cancel to cancel",
  invalid_age:
    "📅 Please specify your birth year (e.g., 1996) or type /cancel to cancel",
  invalid_activity_level:
    "💪 Please specify your activity level (0-4) or type /cancel to cancel",
  enter_promo_code: "🎟️ Enter your promo code or type /cancel to cancel",
  invalid_promo_code:
    "🎟️ Please enter a valid promo code or type /cancel to cancel",
  promo_code_updated: "✅ Promo code successfully updated: {code}",
  promo_code_update_error: "❌ Error updating promo code",

  // Calculations
  bmi: "Body Mass Index",
  target_calories: "Target calories",
  target_protein: "Target protein",
  target_fats: "Target fats",
  target_carbs: "Target carbohydrates",

  // Limits
  limits_title: "📊 Your current limits:",
  premium_active: "✅ Premium status active",
  premium_unlimited: "🎉 Unlimited access to all features:",
  premium_text_analysis: "• Text analysis: unlimited",
  premium_image_analysis: "• Image analysis: unlimited",
  free_account: "🆓 Free account",
  free_features: "📝 Available features:",
  free_text_analysis: "• Text analysis:",
  free_text_analysis_limit: "out of 5 per day",
  free_text_analysis_exhausted: "limit exhausted",
  free_image_analysis: "• Image analysis: premium only",
  subscribe_prompt:
    "💎 Subscribe with /subscriptions command to get full access",

  // Subscriptions
  subscriptions_title: "💳 Available plans:",
  subscription_activated:
    '🎉 Subscription "{planName}" successfully activated!',
  subscription_expires: "Available until: {date}",
  subscription_full_access: "Now you have full access to all features!",
  payment_error: "❌ Error processing payment",

  // Image analysis
  image_analysis_premium_only:
    "🚫 Image analysis is only available for premium users!",
  image_analysis_subscribe:
    "💎 Subscribe with /subscriptions command to get full access to all features.",
  image_analysis_limit_reached: "🚫 Daily image analysis limit reached!",
  image_analysis_remaining: "📸 Image analyses left today: {count}",
  access_check_error: "❌ Error checking access",
  image_get_error: "Sorry, couldn't get the image.",
  image_default_prompt:
    "Analyze this food image and provide a detailed nutritional analysis.",
  server_response_error: "Sorry, couldn't get a response from the server.",
  response_processing_error:
    "Sorry, an error occurred while processing the response.",

  // Text analysis
  text_analysis_limit_reached: "🚫 Daily analysis limit reached!",
  text_analysis_remaining: "📊 Analyses remaining today: {count}",
  text_analysis_subscribe:
    "💎 Subscribe with /subscriptions command to get unlimited access.",
  text_analysis_remaining_after: "📊 Analyses remaining today: {count}",
  text_analysis_subscribe_after:
    "💎 Subscribe with /subscriptions command for unlimited access!",

  // Languages
  language_changed: "🌐 Language changed to English",
  select_language: "🌐 Select language:",

  // Navigation
  change_profile: "You can change your profile using the /set_profile command",
  profile_settings: "Or in profile settings (Stats button), Profile tab",
  start_analysis:
    "To start analysis, please send a photo of your meal or describe it in text :)",

  // Units
  cm: "cm",
  kg: "kg",
  g: "g",
  kcal: "kcal",

  // Food analysis formatting
  food_description_emoji: "🍽 ",
  nutrition_title: "📊 Nutritional value:",
  estimated_weight: "• Estimated weight: ",
  calories: "• Calories: ",
  protein: "• Protein: ",
  fats: "• Fats: ",
  saturated_fats: "  - Saturated: ",
  carbs: "• Carbohydrates: ",
  sugar: "  - Sugar: ",
  fiber: "• Fiber: ",
  nutrition_score: "⭐ Nutrition score: ",
  nutrition_score_max: "/10",
  recommendations: "💡 Recommendations:",

  // Onboarding
  onboarding_welcome: "👋 Hello! I'm a nutrition analysis bot.",
  onboarding_description:
    "🤖 I'll help you calculate the nutritional value of your meals from text descriptions or photos.",
  onboarding_photo: "📸 For photo analysis, just send a photo of your meal.",
  onboarding_text:
    "✍️ For text analysis, just send a text description of your meal.",
  onboarding_examples_title: "📝 Examples of meal text descriptions:",
  onboarding_example1:
    "- Pasta from durum wheat boiled in water 100g, boiled chicken breast 100g",
  onboarding_example2: "- KFC burger with french fries and drink 500ml",
  onboarding_example3: "- Snack of banana and yogurt",
  onboarding_screenshots: "Below are screenshots of photo analysis examples",
  onboarding_important: "⚠️ Important:",
  onboarding_text_tip:
    "📝 - To make it easier for me to calculate nutritional value, please describe the meal as detailed as possible",
  onboarding_photo_tip:
    "📸 - All products that make up the meal should be clearly visible in the photo",
  onboarding_edit_tip:
    "✏️ If I inaccurately identified the meal, you can always edit the message and I'll analyze it again",
  onboarding_app_title: "📱 I also have a special app where you can:",
  onboarding_app_feature1: "1) 📊 view daily nutritional statistics",
  onboarding_app_feature2: "2) 🗑️ delete meals from history",
  onboarding_app_feature3: "3) ⚙️ change profile settings",
  onboarding_limits:
    "📝 For all users, I can analyze meals from text descriptions 5 times per day.",
  onboarding_premium: "⭐️ For premium users, meal analysis is unlimited.",
  onboarding_premium_photo:
    "📸 Unlimited access to photo meal analysis is also available.",
  onboarding_subscribe:
    "💫 Subscribe to premium for full access to all features, press /subscriptions",
  onboarding_promo:
    "🎟️ If you have a promo code, use the /set_promo command to activate it",
  onboarding_profile:
    "I also suggest setting up your profile using the /set_profile command",
  onboarding_support: "For technical support, use the /support command",
  support_mode_activated:
    "✅ Support mode activated. All your messages will now be forwarded to the support channel.\n\nUse /stop_support to deactivate.",
  support_mode_deactivated:
    "❌ Support mode deactivated. Your messages are now processed as usual.",

  // Onboarding captions
  onboarding_caption_text_example:
    "Example of meal analysis from text description",
  onboarding_caption_photo_example: "Example of meal analysis from photo",
  onboarding_caption_combined_example:
    "Example of meal analysis from photo and text description",
  onboarding_caption_app_open: "How to open the app",
  onboarding_caption_stats: "Statistics screen",
  onboarding_caption_delete: "To delete a meal from history, just swipe left",
  onboarding_caption_profile: "Profile settings",

  // Onboarding simple (short)
  onboarding_simple_line1:
    "Ready to check your meal? Send a photo and/or a description — I'll instantly show calories and macros.",
  onboarding_simple_help: "Need help? Type /help.",
  onboarding_simple_promo:
    "If you have a promo code — send it to the bot, and premium access will be activated",
  // Subscription handlers
  subscription_check_user_error: "❌ Error checking user",
  subscription_trial_already_used: "❌ Trial period already used",
  subscription_trial_activation_error: "❌ Error activating trial period",
  subscription_trial_activated: "✅ Trial period activated!",
  subscription_trial_activated_message:
    '🎉 Trial period "{planName}" activated!\n\nAvailable until: {date}\n\nNow you have full access to all features!',
  subscription_invoice_created: "✅ Payment invoice created",
  subscription_invoice_error: "❌ Error creating invoice",
  subscription_trial_activation_error_reply: "❌ Error activating trial period",
  subscription_trial_activated_reply: "✅ Trial period activated!",
  subscription_trial_auto_activated:
    "🎉 You've reached the free request limit. Trial period automatically activated!",
  subscription_days: ["day", "days", "days"],

  // Water
  water_sips: "A few sips",
  water_glass: "Glass",
  water_recorded: "✅ Record added",
  water_error: "❌ Error recording water",
} as const;
