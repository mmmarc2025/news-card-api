const express = require('express');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// 風格配置
const STYLE_CONFIGS = {
  "打綠班": {
    bg: "深色背景（黑色）",
    colors: "紅色與黃色字體",
    vibe: "攻擊性、諷刺性"
  },
  "不演了新聞台": {
    bg: "暗紅色與黑色背景",
    colors: "白色與紅色字體",
    vibe: "諷刺、誇飾"
  },
  "誰來早餐": {
    bg: "晨光橙色與暖黃色背景",
    colors: "深棕色與白色字體",
    vibe: "活力、輕鬆、晨間氛圍"
  },
  "吃飽來打臉": {
    bg: "紅色與黑色強對比背景",
    colors: "白色與紅色字體",
    vibe: "攻擊性、打臉風格"
  },
  "邱老師": {
    bg: "迷彩灰與軍綠色背景",
    colors: "橘紅色點綴與白色字體",
    vibe: "軍事專業、硬派"
  }
};

// 使用 Jina AI 抓取被擋的新聞
async function fetchNewsContent(url) {
  try {
    // 使用 jina.ai 服務抓取網頁
    const jinaUrl = `https://r.jina.ai/${url}`;
    const response = await fetch(jinaUrl);
    const text = await response.text();
    
    // 解析標題和內容
    const lines = text.split('\n').filter(l => l.trim());
    
    // 取標題（第一行）
    let title = lines[0] || "新聞標題";
    if (title.length > 100) title = title.slice(0, 100);
    
    // 取內容（取前幾行作為摘要）
    const content = lines.slice(1, 6).join(' ').slice(0, 500);
    
    return { title, content: content || "無法取得內容" };
  } catch (error) {
    console.error("Fetch error:", error);
    return { title: "無法取得新聞", content: "" };
  }
}

// 生成圖片
async function generateImage(prompt) {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  
  const model = genAI.getGenerativeModel({
    model: "gemini-3-pro-image-preview"
  });
  
  const result = await model.generateContent(prompt);
  
  if (result.response?.candidates?.[0]?.content?.parts) {
    for (const part of result.response.candidates[0].content.parts) {
      if (part.inlineData) {
        const mimeType = part.inlineData.mimeType || 'image/png';
        return `data:${mimeType};base64,${part.inlineData.data}`;
      }
    }
  }
  
  throw new Error("無法生成圖片");
}

// API 端點
app.post('/api/generate', async (req, res) => {
  try {
    const { newsUrl, style, richness, title: inputTitle, content: inputContent } = req.body;
    
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: "API Key 未設定" });
    }
    
    // 如果有 newsUrl，自動抓取內容
    let title = inputTitle;
    let content = inputContent;
    
    if (newsUrl && !inputTitle) {
      const news = await fetchNewsContent(newsUrl);
      title = news.title;
      content = news.content;
    }
    
    const config = STYLE_CONFIGS[style] || STYLE_CONFIGS["打綠班"];
    const pointsMap = {
      "精簡": "3-4個重點",
      "一般": "5-6個重點",
      "詳細": "7-8個重點"
    };
    
    const prompt = `資訊圖卡，${config.vibe}風格。${config.bg}。用向量插畫呈現新聞相關人物。標題「${title}」。內容需要${pointsMap[richness] || pointsMap["一般"]}。${content ? '內容摘要：' + content : ''}16:9橫版。底部放媒體LOGO和日期。現代設計，資訊分明。`;
    
    console.log("Generating with prompt:", prompt.slice(0, 100));
    
    const imageBase64 = await generateImage(prompt);
    
    res.json({
      success: true,
      data: {
        imageUrl: imageBase64,
        title: title
      }
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message || "生成失敗" });
  }
});

// 健康檢查
app.get('/health', (req, res) => {
  res.json({ status: "ok" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API 運行中：http://localhost:${PORT}`);
});
