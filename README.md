# Telegram Bots with Supabase Functions

This project contains two Telegram bots implemented as Supabase Edge Functions:

1. **Deepseek Bot** - A bot that helps with food nutrition analysis and gift suggestions
2. **Telegram Bot** - A basic Telegram bot template

## Features

### Deepseek Bot

- Food nutrition analysis
- Gift suggestions
- Interactive commands

### Telegram Bot

- Basic command handling
- Ping functionality
- Webhook support

## Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/cli)
- [Deno](https://deno.land/)
- Telegram Bot Token (from [@BotFather](https://t.me/BotFather))

## Environment Variables

For both bots to work, you need to set up the following environment variables:

```bash
# Deepseek Bot
DEEPSEEK_BOT_TOKEN=your_bot_token
DEEPSEEK_BOT_FUNCTION_SECRET=your_secret

# Telegram Bot
TELEGRAM_ECHO_BOT_TOKEN=your_bot_token
TELEGRAM_ECHO_BOT_FUNCTION_SECRET=your_secret
```

## Local Development

1. Start the Supabase local development environment:

    ```bash
    supabase start
    ```

2. Deploy the functions:

    ```bash
    supabase functions deploy deepseek-bot
    supabase functions deploy telegram-bot
    ```

## Bot Commands

### Deepseek Bot commands

- `/start` - Start the bot and get instructions
- "Оцени рацион" - Get food nutrition analysis
- "Подскажи подарок" - Get gift suggestions

### Telegram Bot commands

- `/start` - Welcome message
- `/ping` - Check bot response time

## Project Structure

```schema
supabase/
├── functions/
│   ├── deepseek-bot/
│   │   ├── index.ts
│   │   ├── handle_calculate_food.ts
│   │   └── handle_gift_suggestion.ts
│   └── telegram-bot/
│       └── index.ts
```

## Security

Both bots implement security measures:

- Webhook secret verification
- Environment variable protection
- Error handling

## Contributing

Feel free to submit issues and enhancement requests.

## License

This project is licensed under the MIT License.
