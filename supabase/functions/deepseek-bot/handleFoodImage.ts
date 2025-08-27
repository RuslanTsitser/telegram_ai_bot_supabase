import { foodImagePrompt } from "./prompts/foodImagePrompt.ts";

interface FoodAnalysis {
  description: string;
  mass: number;
  calories: number;
  protein: number;
  carbs: number;
  sugar: number;
  fats: number;
  saturated_fats: number;
  fiber: number;
  nutrition_score: number;
  recommendation: string;
  error?: string;
}

export function formatFoodAnalysisMessage(response: FoodAnalysis): string {
  if (response.error) {
    return response.error;
  }

  return `🍽 ${response.description}\n\n` +
    `📊 Питательная ценность:\n` +
    `• Примерный вес: ${response.mass} г\n` +
    `• Калории: ${response.calories} ккал\n` +
    `• Белки: ${response.protein} г\n` +
    `• Жиры: ${response.fats} г\n` +
    `  - Насыщенные: ${response.saturated_fats} г\n` +
    `• Углеводы: ${response.carbs} г\n` +
    `  - Сахар: ${response.sugar} г\n` +
    `• Клетчатка: ${response.fiber} г\n\n` +
    `⭐ Оценка питательности: ${response.nutrition_score}/10\n\n` +
    `💡 Рекомендации:\n${response.recommendation}`;
}

export async function handleFoodImage(
  fileId: string | null,
  userText: string | null,
  botToken: string,
): Promise<FoodAnalysis> {
  try {
    console.log("handleFoodImage", fileId, userText, botToken);

    let imageContent = null;

    if (fileId) {
      // Get file path from Telegram
      const fileResponse = await fetch(
        `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`,
      );
      const fileData = await fileResponse.json();

      if (!fileData.ok) {
        return {
          description: "",
          mass: 0,
          calories: 0,
          protein: 0,
          carbs: 0,
          sugar: 0,
          fats: 0,
          saturated_fats: 0,
          fiber: 0,
          nutrition_score: 0,
          recommendation: "",
          error: "Извините, не удалось получить изображение.",
        };
      }

      const filePath = fileData.result.file_path;
      const imageUrl =
        `https://api.telegram.org/file/bot${botToken}/${filePath}`;

      imageContent = {
        type: "image_url",
        image_url: {
          url: imageUrl,
        },
      };
    }

    const systemPrompt = foodImagePrompt;

    const messages = [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: userText ||
              "Проанализируй это изображение еды и предоставь детальный анализ питательной ценности.",
          },
          ...(imageContent ? [imageContent] : []),
        ],
      },
    ];

    const response = await fetch("https://api.piapi.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("PIAPI_KEY")}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    console.log("data", data);
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return {
        description: "",
        mass: 0,
        calories: 0,
        protein: 0,
        carbs: 0,
        sugar: 0,
        fats: 0,
        saturated_fats: 0,
        fiber: 0,
        nutrition_score: 0,
        recommendation: "",
        error: "Извините, не удалось получить ответ от сервера.",
      };
    }

    try {
      // Clean up the response by removing markdown code block markers
      const cleanedContent = content.replace(/```json\n?|\n?```/g, "").trim();
      // Try to parse the response as JSON to validate it
      const jsonResponse = JSON.parse(cleanedContent);
      return jsonResponse;
    } catch (e) {
      console.error("Error parsing JSON:", e);
      // If parsing fails, return an error
      return {
        description: "",
        mass: 0,
        calories: 0,
        protein: 0,
        carbs: 0,
        sugar: 0,
        fats: 0,
        saturated_fats: 0,
        fiber: 0,
        nutrition_score: 0,
        recommendation: "",
        error: "Извините, произошла ошибка при обработке ответа.",
      };
    }
  } catch (error) {
    console.error("Error processing food image:", error);
    return {
      description: "",
      mass: 0,
      calories: 0,
      protein: 0,
      carbs: 0,
      sugar: 0,
      fats: 0,
      saturated_fats: 0,
      fiber: 0,
      nutrition_score: 0,
      recommendation: "",
      error: "Извините, произошла ошибка при обработке ответа.",
    };
  }
}
