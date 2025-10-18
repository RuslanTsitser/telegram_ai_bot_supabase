#!/bin/bash

source supabase/functions/deepseek-bot/.env

echo "DEEPSEEK_BOT_TOKEN: ${DEEPSEEK_BOT_TOKEN}"

# Setup webhook for deepseek-bot
curl -s -X POST "https://api.telegram.org/bot${DEEPSEEK_BOT_TOKEN}/setWebhook\
?url=${DOMAIN}/deepseek\
?secret=${DEEPSEEK_BOT_FUNCTION_SECRET}"

# Setup webhook for production-bot
curl -s -X POST "https://api.telegram.org/bot${PRODUCTION_BOT_TOKEN}/setWebhook\
?url=${DOMAIN}/production\
?secret=${PRODUCTION_BOT_FUNCTION_SECRET}"