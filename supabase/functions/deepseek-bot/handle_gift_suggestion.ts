export async function handleGiftSuggestion(message: string): Promise<string> {
  const systemPrompt = `Ты — эксперт по подбору подарков. Пользователь присылает тебе описание человека, его предпочтений, событий, или просто воспоминания, связанные с ним.

  Твоя задача — на основе этих данных предложить до 20 **идей подарков**, которые могут подойти.
  
  🔹 Только идеи подарков — **без пояснений, без описания, без способов вручения**.  
  🔹 Ориентируйся на стиль, атмосферу, интересы, упомянутые детали.  
  🔹 Даже если информации немного — всё равно выдай креативные варианты.  
  🔹 Если указан бюджет — соответствуй ему.  
  🔹 Старайся избегать банальных и повторяющихся подарков.
  
  Формат ответа:
  Список из 10–20 кратких идей подарков.
  Каждая идея — отдельным пунктом.
  Без пояснений. Без нумерации. Только текст подарков.`
  
  
  const userPrompt = message.replace('Подскажи подарок', '').trim();

  const response = await fetch('https://api.piapi.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('PIAPI_KEY')}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.9
    })
  });

  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'Не удалось получить ответ. Попробуй снова.';
}
