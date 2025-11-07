export interface BotConfig {
  id: string;
  token: string;
  secret: string;
  youKassaProviderToken: string;
  youKassaProviderTestToken: string;
  supportChannelId?: number; // ID канала поддержки (опционально)
  supportDiscussionGroupId?: number; // ID группы обсуждений для канала (опционально)
}

export const BOT_CONFIGS: Record<string, BotConfig> = {
  "deepseek": {
    id: "deepseek",
    token: Deno.env.get("DEEPSEEK_BOT_TOKEN") || "",
    secret: Deno.env.get("DEEPSEEK_BOT_FUNCTION_SECRET") || "",
    youKassaProviderToken: Deno.env.get("DEEPSEEK_YOOKASSA_PROVIDER_TOKEN") ||
      "",
    youKassaProviderTestToken:
      Deno.env.get("DEEPSEEK_YOOKASSA_PROVIDER_TOKEN_TEST") || "",
    supportChannelId: Deno.env.get("SUPPORT_CHANNEL_ID")
      ? parseInt(Deno.env.get("SUPPORT_CHANNEL_ID")!)
      : undefined,
    supportDiscussionGroupId: Deno.env.get("SUPPORT_DISCUSSION_GROUP_ID")
      ? parseInt(Deno.env.get("SUPPORT_DISCUSSION_GROUP_ID")!)
      : undefined,
  },
  "production": {
    id: "production",
    token: Deno.env.get("PRODUCTION_BOT_TOKEN") || "",
    secret: Deno.env.get("PRODUCTION_BOT_FUNCTION_SECRET") || "",
    youKassaProviderToken: Deno.env.get("PRODUCTION_YOOKASSA_PROVIDER_TOKEN") ||
      "",
    youKassaProviderTestToken:
      Deno.env.get("PRODUCTION_YOOKASSA_PROVIDER_TOKEN_TEST") || "",
    supportChannelId: Deno.env.get("SUPPORT_CHANNEL_ID")
      ? parseInt(Deno.env.get("SUPPORT_CHANNEL_ID")!)
      : undefined,
    supportDiscussionGroupId: Deno.env.get("SUPPORT_DISCUSSION_GROUP_ID")
      ? parseInt(Deno.env.get("SUPPORT_DISCUSSION_GROUP_ID")!)
      : undefined,
  },
};

export function getBotConfig(botId: string): BotConfig | null {
  return BOT_CONFIGS[botId] || null;
}

export function getAllBotConfigs(): BotConfig[] {
  return Object.values(BOT_CONFIGS);
}

export function getBotConfigByToken(token: string): BotConfig | null {
  return Object.values(BOT_CONFIGS).find((config) => config.token === token) ||
    null;
}
