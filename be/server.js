require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const { chatWithGemini } = require('./gemini');
const { parseCSVFromFile, parseCSVFromURL, analyzeCSV } = require('./csvProcessor');

const app = express();
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../fe')));

let chatHistory = []; // Lịch sử multi-turn
let currentImage = null;
let currentCSV = null;

app.post('/api/chat', upload.single('image'), async (req, res) => {
  try {
    const userMessage = req.body.message || '';
    const imageFile = req.file;
    const csvFileBase64 = req.body.csvFile;
    const csvURL = req.body.csvURL;

    console.log('Request:', { userMessage, hasImage: !!imageFile, hasCSV: !!(csvFileBase64 || csvURL) });

    // Reset context nếu có file mới
    if (imageFile) {
      currentImage = { buffer: imageFile.buffer, mimetype: imageFile.mimetype };
      currentCSV = null;
    }
    if (csvFileBase64 || csvURL) {
      currentImage = null;
      let csvData;
      if (csvURL) {
        csvData = await parseCSVFromURL(csvURL);
      } else if (csvFileBase64) {
        const buffer = Buffer.from(csvFileBase64, 'base64');
        csvData = await parseCSVFromFile(buffer);
      }
      currentCSV = analyzeCSV(csvData);
      if (currentCSV.error) throw new Error(currentCSV.error);
    }

    // Thêm user message vào history
    chatHistory.push({ role: 'user', content: userMessage });

    // Gọi Gemini
    let assistantReply = "No response";
    try {
      assistantReply = await chatWithGemini(chatHistory, currentImage, currentCSV);
    } catch (err) {
      assistantReply = `Gemini Error: ${err.message}`;
    }

    // Thêm assistant reply vào history (chỉ nếu không lỗi)
    if (!assistantReply.startsWith('Gemini Error')) {
      chatHistory.push({ role: 'assistant', content: assistantReply });
    }

    res.json({
        reply: assistantReply,
        image: currentImage ? `data:${currentImage.mimetype};base64,${currentImage.buffer.toString('base64')}` : null,
        csvSummary: currentCSV
});
  } catch (err) {
    console.error("Server Error:", err);
    res.status(500).json({ reply: `Server Error: ${err.message}` });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});