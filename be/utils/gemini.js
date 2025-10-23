const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

export async function generateResponse(messages, imageBase64, csvData) {
  const contents = messages.map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: m.parts
  }));

  // Add current user message
  const userParts = [];
  if (messages[messages.length - 1]?.text) {
    userParts.push({ text: messages[messages.length - 1].text });
  }
  if (imageBase64) {
    userParts.push({
      inline_data: {
        mime_type: imageBase64.startsWith('data:image/png') ? 'image/png' : 'image/jpeg',
        data: imageBase64.split(',')[1]
      }
    });
  }

  if (userParts.length > 0) {
    contents.push({ role: 'user', parts: userParts });
  }

  // System prompt with CSV context
  let systemPrompt = "You are a helpful AI that can analyze images and CSV data. ";
  if (csvData) {
    systemPrompt += `CSV has ${csvData.rowCount} rows and columns: ${csvData.headers.join(', ')}. `;
    systemPrompt += `For plots, return Chart.js config in \`\`\`chartjs\n{...}\n\`\`\`. `;
    systemPrompt += `Summarize, calculate stats, find missing values.`;
  }

  const payload = {
    contents,
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.7
    }
  };

  const response = await fetch(GEMINI_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  let text = data.candidates[0].content.parts[0].text;

  // Extract chart
  const chartMatch = text.match(/```chartjs\s*([\s\S]*?)\s*```/);
  const result = { text: text.replace(/```chartjs[\s\S]*?```/g, '').trim() };

  if (chartMatch) {
    try {
      result.chart = JSON.parse(chartMatch[1]);
    } catch {}
  }

  return result;
}