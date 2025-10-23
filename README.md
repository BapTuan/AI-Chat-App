# AI-Chat-App
## 🛠 Cài đặt & Chạy (3 bước)
```bash
# 1. Clone repo
git clone https://github.com/your-username/AI-Chat-App.git
cd AI-Chat-App

# 2. Cài dependencies
npm install

# 3. Điền API key vào file .env
GEMINI_API_KEY=AIzaSyB...your_key_here
PORT=5000

# 4. Chạy app
npm run dev

# Có thể Test API Key (trước khi chạy)
cp be/test-key.js
node be/test-key.js