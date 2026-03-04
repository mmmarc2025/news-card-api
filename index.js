const express = require('express');
const cors = require('cors');

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

// 生成圖片 - 使用 Gemini 圖片生成模型
async function generateImage(prompt) {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  
  // 使用 Gemini 2.0 Flash 圖片生成模型
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-exp"
  });
  
  const result = await model.generateContent(prompt);
  
  // 檢查回應
  console.log("Generation result:", JSON.stringify(result).slice(0, 200));
  
  // 處理圖片回傳
  if (result.response?.candidates?.[0]?.content?.parts) {
    for (const part of result.response.candidates[0].content.parts) {
      if (part.inlineData) {
        const mimeType = part.inlineData.mimeType || 'image/png';
        return `data:${mimeType};base64,${part.inlineData.data}`;
      }
    }
  }
  
  // 如果沒有圖片，回傳錯誤
  console.log("Full response:", JSON.stringify(result).slice(0, 500));
  throw new Error("無法生成圖片，請檢查 API Key 是否正確");
}

// API 端點
app.post('/api/generate', async (req, res) => {
  try {
    const { newsUrl, style, richness, title, content } = req.body;
    
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: "API Key 未設定" });
    }
    
    const config = STYLE_CONFIGS[style] || STYLE_CONFIGS["打綠班"];
    const pointsMap = {
      "精簡": "3-4個重點",
      "一般": "5-6個重點",
      "詳細": "7-8個重點"
    };
    
    const prompt = `資訊圖卡，${config.vibe}風格。${config.bg}。用向量插畫呈現新聞相關人物。標題「${title || '新聞標題'}」。內容需要${pointsMap[richness] || pointsMap["一般"]}。${content ? '內容摘要：' + content : ''}16:9橫版。底部放媒體LOGO和日期。現代設計，資訊分明。`;
    
    const imageBase64 = await generateImage(prompt);
    
    res.json({
      success: true,
      data: {
        imageUrl: imageBase64,
        title: title || "新聞標題"
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
