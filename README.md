# Telegram Bots with Supabase Functions

This project contains two Telegram bots implemented as Supabase Edge Functions:

1. **Deepseek Bot** - A bot that helps with food nutrition analysis and gift suggestions
2. **Telegram Bot** - A basic Telegram bot template

## Features

### Deepseek Bot

- Food nutrition analysis in both private and group chats
- Gift suggestions in private chats
- Message relationship tracking in Supabase
- Support for message editing and updates
- Interactive commands with context-aware responses

### Telegram Bot

- Basic command handling
- Ping functionality
- Webhook support

## Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/cli)
- [Deno](https://deno.land/)
- Telegram Bot Token (from [@BotFather](https://t.me/BotFather))
- Supabase project with appropriate database tables

## Environment Variables

For both bots to work, you need to set up the following environment variables:

```bash
# Deepseek Bot
DEEPSEEK_BOT_TOKEN=your_bot_token
DEEPSEEK_BOT_FUNCTION_SECRET=your_secret
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# Telegram Bot
TELEGRAM_ECHO_BOT_TOKEN=your_bot_token
TELEGRAM_ECHO_BOT_FUNCTION_SECRET=your_secret
```

## Local Development

1. Start the Supabase local development environment:

    ```bash
    supabase start
    ```

2. Set up environment variables using the provided scripts:

    ```bash
    # For Deepseek Bot
    cd supabase/functions/deepseek-bot
    ./set_env.sh
    ```

3. Deploy the functions:

    ```bash
    # Deploy Deepseek Bot
    cd supabase/functions/deepseek-bot
    ./deploy.sh

    # Deploy Telegram Bot
    cd supabase/functions/telegram-bot
    supabase functions deploy telegram-bot
    ```

## Bot Commands

### Deepseek Bot commands

- `/start` - Start the bot and get instructions
- "Оцени рацион" - Get food nutrition analysis (works in both private and group chats)
- "Подскажи подарок" - Get gift suggestions (works only in private chats)

### Telegram Bot commands

- `/start` - Welcome message
- `/ping` - Check bot response time

## Project Structure

```schema
supabase/
├── functions/
│   ├── deepseek-bot/
│   │   ├── index.ts              # Main bot logic
│   │   ├── handle_calculate_food.ts  # Food analysis handler
│   │   ├── handle_gift_suggestion.ts # Gift suggestion handler
│   │   ├── set_env.sh            # Environment setup script
│   │   ├── deploy.sh             # Deployment script
│   │   ├── run.sh                # Local run script
│   │   ├── deno.json             # Deno configuration
│   │   └── .env                  # Environment variables
│   └── telegram-bot/
│       └── index.ts
```

## Database Schema

The project uses Supabase to store message relationships:

```sql
message_relationships (
  user_message_id bigint,
  bot_message_id bigint,
  chat_id bigint
)
```

## Security

Both bots implement security measures:

- Webhook secret verification
- Environment variable protection
- Error handling
- Message relationship tracking for secure updates

## Contributing

Feel free to submit issues and enhancement requests.

## License

This project is licensed under the MIT License.
