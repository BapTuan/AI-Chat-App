const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

async function chatWithGemini(messages, imageBuffer = null, csvData = null) {
  let content = [];

  // Add chat history
  messages.forEach(msg => {
    if (msg.role === 'user') {
      content.push({ role: 'user', parts: [{ text: msg.content }] });
    } else if (msg.role === 'assistant') {
      content.push({ role: 'model', parts: [{ text: msg.content }] });
    }
  });

  // Add image if exists
  if (imageBuffer) {
    content[content.length - 1].parts.push({
      inline_data: {
        mime_type: imageBuffer.mimetype,
        data: imageBuffer.buffer.toString('base64')
      }
    });
  }

  // Add CSV context
  if (csvData) {
    content.unshift({
      role: 'user',
      parts: [{ text: `Here is the CSV data (first 10 rows as sample):\n\n${csvData.sample}\n\nFull data has ${csvData.totalRows} rows and columns: ${csvData.headers.join(', ')}.\nAnswer questions about this data.` }]
    });
  }

  const result = await model.generateContent(content);
  return result.response.text();
}

module.exports = { chatWithGemini };