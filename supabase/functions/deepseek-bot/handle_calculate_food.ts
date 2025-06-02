import { calculateFoodPrompt } from "./prompts/calculate_food.ts";

export async function handleCalculateFood(message: string): Promise<string> {
  const systemPrompt = calculateFoodPrompt;

  const response = await fetch("https://api.piapi.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${Deno.env.get("PIAPI_KEY")}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: message,
        },
      ],
      temperature: 0.7,
    }),
  });

  const data = await response.json();
  return data.choices?.[0]?.message?.content ||
    "Не удалось получить ответ. Попробуй снова.";
}
