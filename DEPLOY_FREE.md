# 🚀 免費部署指南

## 選項 1：Render（推薦，最簡單）

### 步驟：

1. **註冊 Render**
   - 前往 https://render.com
   - 用 GitHub 登入

2. **建立 Web Service**
   - 點「New」→ 選擇「Web Service」
   - 連接 GitHub 專案（或上傳 api/ 資料夾）

3. **設定**
   - Name: `news-card-api`
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `node index.js`

4. **設定環境變數**
   - 點「Environment」
   - 新增：
     - Key: `GEMINI_API_KEY`
     - Value: 你的 API Key

5. **Deploy**
   - 點「Create Web Service」
   - 等候部署完成

6. **取得 URL**
   - 例如：`https://news-card-api.onrender.com`

---

## 選項 2：Railway

1. **註冊 Railway**
   - https://railway.app

2. **建立專案**
   - New Project → Deploy from GitHub repo

3. **設定環境變數**
   - `GEMINI_API_KEY` = 你的 API Key

4. **取得 URL**

---

## 選項 3：Fly.io

1. **安裝 CLI**
   ```bash
   brew install flyctl
   ```

2. **部署**
   ```bash
   fly launch
   fly secrets set GEMINI_API_KEY=your_key
   ```

---

## 📡 API 使用方式

部署完成後：

```
POST https://your-api-url.onrender.com/api/generate

{
  "newsUrl": "https://news.example.com/...",
  "style": "打綠班",
  "richness": "一般",
  "title": "新聞標題",
  "content": "新聞內容摘要（可選）"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "imageUrl": "data:image/png;base64,...",
    "title": "新聞標題"
  }
}
```

---

## 💰 費用

| 平台 | 免費額度 |
|------|----------|
| Render | 750 小時/月 |
| Railway | $5/月 |
| Fly.io | 3 shared VMs |

足夠使用！
