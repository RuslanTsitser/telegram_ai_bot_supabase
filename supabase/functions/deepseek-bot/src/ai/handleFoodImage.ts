import { FoodAnalysis } from "../interfaces/FoodAnalysis.ts";
import { getFoodImagePrompt } from "../prompts/foodImagePrompt.ts";
import { getImageUrlFromTelegram } from "../telegram/getImageUrlFromTelegram.ts";
import { createI18n } from "../utils/i18n.ts";

export async function handleFoodImage(
  fileId: string | null,
  userText: string | null,
  botToken: string,
  languageCode: string = "ru",
  userProfile?: {
    height_cm: number | null;
    weight_kg: number | null;
    gender: number | null;
    birth_year: number | null;
  } | null,
): Promise<FoodAnalysis> {
  try {
    console.log("handleFoodImage", fileId, userText, botToken);

    const i18n = createI18n(languageCode);
    let imageContent = null;

    if (fileId) {
      // Get file path from Telegram
      const imageUrl = await getImageUrlFromTelegram(fileId, botToken);

      if (imageUrl === null) {
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
          error: i18n.t("image_get_error"),
        };
      }

      imageContent = {
        type: "image_url",
        image_url: {
          url: imageUrl,
        },
      };
    }

    const systemPrompt = getFoodImagePrompt(languageCode, userProfile);

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
            text: userText || i18n.t("image_default_prompt"),
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
        error: i18n.t("server_response_error"),
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
        error: i18n.t("response_processing_error"),
      };
    }
  } catch (error) {
    console.error("Error processing food image:", error);
    const i18n = createI18n(languageCode);
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
      error: i18n.t("response_processing_error"),
    };
  }
}
