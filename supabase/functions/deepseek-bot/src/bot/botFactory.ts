import { Bot } from "https://deno.land/x/grammy@v1.8.3/mod.ts";
import { BotConfig } from "../config/botConfig.ts";

export class BotFactory {
  private static bots: Map<string, Bot> = new Map();

  static createBot(config: BotConfig): Bot {
    if (this.bots.has(config.id)) {
      return this.bots.get(config.id)!;
    }

    const bot = new Bot(config.token);
    this.bots.set(config.id, bot);
    return bot;
  }

  static getBot(botId: string): Bot | null {
    return this.bots.get(botId) || null;
  }

  static getAllBots(): Map<string, Bot> {
    return new Map(this.bots);
  }

  static clearBots(): void {
    this.bots.clear();
  }
}
