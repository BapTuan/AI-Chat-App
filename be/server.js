require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const { chatWithGemini } = require('./gemini');
const { parseCSVFromFile, parseCSVFromURL, analyzeCSV } = require('./csvProcessor');

const app = express();
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../fe')));

let chatHistory = [];
let currentImage = null;
let currentCSV = null;

app.post('/api/chat', upload.single('image'), async (req, res) => {
  try {
    const userMessage = req.body.message;
    const imageFile = req.file;
    const csvFile = req.body.csvFile;
    const csvURL = req.body.csvURL;

    // Reset context if new image or CSV
    if (imageFile) {
      currentImage = { buffer: imageFile.buffer, mimetype: imageFile.mimetype };
      currentCSV = null;
    }
    if (csvFile || csvURL) {
      currentImage = null;
      let csvData;
      if (csvURL) {
        csvData = await parseCSVFromURL(csvURL);
      } else {
        csvData = await parseCSVFromFile(Buffer.from(csvFile, 'base64'));
      }
      currentCSV = analyzeCSV(csvData);
    }

    chatHistory.push({ role: 'user', content: userMessage, timestamp: new Date() });

    const assistantReply = await chatWithGemini(chatHistory, currentImage, currentCSV);
    chatHistory.push({ role: 'assistant', content: assistantReply, timestamp: new Date() });

    res.json({
      reply: assistantReply,
      history: chatHistory,
      image: currentImage ? `data:${currentImage.mimetype};base64,${currentImage.buffer.toString('base64')}` : null,
      csvSummary: currentCSV
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Something went wrong" });
  }
});

app.get('/api/history', (req, res) => {
  res.json({ history: chatHistory });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});