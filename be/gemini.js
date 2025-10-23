const { GoogleGenerativeAI } = require("@google/generative-ai");

console.log("GEMINI KEY:", process.env.GEMINI_API_KEY ? "LOADED" : "MISSING");

async function chatWithGemini(messages, imageBuffer = null, csvData = null) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  let contents = [];

  // Thêm CSV nếu có
  if (csvData) {
    contents.push({
      role: 'user',
      parts: [{
        text: `CSV data (first 10 rows):\n\`\`\`\n${csvData.sample}\n\`\`\`\n` +
              `Total: ${csvData.totalRows} rows, columns: ${csvData.headers.join(', ')}\n` +
              `Answer questions about this data.`
      }]
    });
  }

  // Thêm lịch sử (luân phiên role)
  let lastRole = null;
  for (const msg of messages) {
    const role = msg.role === 'user' ? 'user' : 'model';
    if (role === lastRole) continue; // Bỏ nếu trùng
    contents.push({ role, parts: [{ text: msg.content }] });
    lastRole = role;
  }

  // Thêm ảnh vào user cuối
if (imageBuffer) {
  contents.push({
    role: 'user',
    parts: [
      { text: "This is the uploaded image. Describe it in detail." },
      {
        inlineData: {
          mimeType: imageBuffer.mimetype,
          data: imageBuffer.buffer.toString('base64')
        }
      }
    ]
  });
}

  // Nếu contents rỗng → thêm tin nhắn đầu
  if (contents.length === 0) {
    contents.push({ role: 'user', parts: [{ text: 'Hello' }] });
  }

  console.log("Sending to Gemini:", JSON.stringify(contents, null, 2));

  try {
    // ĐÚNG: { contents }
    const result = await model.generateContent({ contents });
    const response = result.response;
    if (!response || typeof response.text !== 'function') {
      throw new Error("Invalid response");
    }
    return response.text();
  } catch (err) {
    console.error("Gemini API Error:", err.message);
    throw new Error(`Gemini API Error: ${err.message}`);
  }
}

module.exports = { chatWithGemini };