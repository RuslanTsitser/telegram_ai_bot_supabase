export async function handleFoodImage(
  fileId: string,
  botToken: string,
): Promise<string> {
  try {
    console.log("handleFoodImage", fileId, botToken);
    // Get file path from Telegram
    const fileResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`,
    );
    const fileData = await fileResponse.json();

    if (!fileData.ok) {
      return "Извините, не удалось получить изображение.";
    }

    const filePath = fileData.result.file_path;
    const imageUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;

    // Get image content as base64
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = btoa(
      String.fromCharCode(...new Uint8Array(imageBuffer)),
    );

    const systemPrompt =
      `Ты — эксперт по анализу изображений еды и нутрициолог. Твоя задача:

1. Определить, что изображено на фото (название блюда/продуктов)
2. Оценить примерный вес порции
3. Рассчитать примерную питательную ценность:
   - Калории
   - Белки
   - Жиры (в том числе насыщенные)
   - Углеводы (в том числе сахар)
   - Клетчатка
4. Дать краткие рекомендации по питательности блюда

Формат ответа:
Блюдо: [название]
Порция: [примерный вес]

Питательная ценность:
Калории: [значение]
Белки: [значение] г
Жиры: [значение] г
- Насыщенные: [значение] г
Углеводы: [значение] г
- Сахар: [значение] г
Клетчатка: [значение] г

Рекомендации:
[краткий анализ и рекомендации]`;

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
            content: [
              {
                type: "text",
                text:
                  "Проанализируй это изображение еды и предоставь детальный анализ питательной ценности.",
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    return data.choices?.[0]?.message?.content ||
      "Извините, не удалось проанализировать изображение. Попробуйте еще раз.";
  } catch (error) {
    console.error("Error processing food image:", error);
    return "Извините, произошла ошибка при обработке изображения.";
  }
}
