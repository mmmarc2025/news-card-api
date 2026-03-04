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
    vibe: "攻擊性、諷刺性",
    logo: "中時新聞網"
  },
  "不演了新聞台": {
    bg: "暗紅色與黑色背景",
    colors: "白色與紅色字體",
    vibe: "諷刺、誇飾",
    logo: "中天新聞網"
  },
  "誰來早餐": {
    bg: "晨光橙色與暖黃色背景",
    colors: "深棕色與白色字體",
    vibe: "活力、輕鬆、晨間氛圍",
    logo: "TVBS"
  },
  "吃飽來打臉": {
    bg: "紅色與黑色強對比背景",
    colors: "白色與紅色字體",
    vibe: "攻擊性、打臉風格",
    logo: "中天新聞網"
  },
  "邱老師": {
    bg: "迷彩灰與軍綠色背景",
    colors: "橘紅色點綴與白色字體",
    vibe: "軍事專業、硬派",
    logo: "軍武網"
  }
};

// 使用 Jina AI / Scrap巾巾 抓取被擋的新聞
async function fetchNewsContent(url) {
  // 嘗試多個備援服務
  const services = [
    `https://r.jina.ai/${url}`,
    `https://r.jina.ai/http://${url.replace('https://', '')}`,
    `https://r.jina.ai/http://${url}`,
  ];
  
  for (const jinaUrl of services) {
    try {
      const response = await fetch(jinaUrl);
      if (response.ok) {
        const text = await response.text();
        if (text && !text.includes('SecurityCompromiseError') && !text.includes('blocked')) {
          const lines = text.split('\n').filter(l => l.trim());
          let title = lines[0] || "新聞標題";
          if (title.length > 100) title = title.slice(0, 100);
          const content = lines.slice(1, 6).join(' ').slice(0, 500);
          return { title, content: content || "無法取得內容" };
        }
      }
    } catch (e) {
      console.log("Service failed:", jinaUrl.slice(0, 50));
    }
  }
  
  // 如果都失敗，回傳錯誤訊息
  return { title: "無法取得新聞（來源被擋）", content: "請手動提供新聞標題和內容" };
}

// 生成圖片 - 使用 Nano Banana Pro 模型
async function generateImage(prompt) {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  
  // 使用 gemini-3.1-flash-image-preview 模型（高品質生成）
  // 加上詳細的 prompt 確保中文字清楚
  const enhancedPrompt = prompt + " 請確保中文字清晰可讀，使用高解析度向量插畫風格，4K解析度，專業新聞設計，文字不要模糊。";
  
  const model = genAI.getGenerativeModel({
    model: "gemini-3.1-flash-image-preview"
  });
  
  const result = await model.generateContent(enhancedPrompt);
  
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
    const mediaLogo = config.logo || "中時新聞網";
    const pointsMap = {
      "精簡": "3-4個重點",
      "一般": "5-6個重點",
      "詳細": "7-8個重點"
    };
    
    // 強化 prompt：確保 4K 解析度和清楚的中文字，正確的媒體 Logo 和日期
    const mediaLogo = STYLE_CONFIGS[style]?.logo || "中時新聞網";
    const basePrompt = `資訊圖卡，${config.vibe}風格。${config.bg}。用向量插畫呈現新聞相關人物，人物要精細刻畫。標題「${title}」。內容需要${pointsMap[richness] || pointsMap["一般"]}。${content ? '內容摘要：' + content : ''}16:9橫版，4K超高清解析度。底部放「${mediaLogo}」LOGO和日期2026-03-04。現代專業設計，中文字必須清晰可讀，不要模糊。`;
    
    console.log("Generating with prompt:", basePrompt.slice(0, 100));
    
    const imageBase64 = await generateImage(basePrompt);
    
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
