// ============================================
// 新聞圖卡生成器 - API 端點
// ============================================
// 這個檔案需要部署到可被 Lovable 存取的後端
// 可以部署到 Vercel, Railway, Render 等平台

import { GoogleGenerativeAI } from "@google/generative-ai";

// 環境變數 - 請在部署平台上設定
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "YOUR_API_KEY_HERE";

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

// 取得新聞內容（簡單版）
async function fetchNewsContent(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NewsCardBot/1.0)'
      }
    });
    const html = await response.text();
    
    // 解析標題
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : "新聞標題";
    
    // 解析 meta description
    const descMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/i);
    const description = descMatch ? descMatch[1].trim() : "";
    
    return { title, description, url };
  } catch (error) {
    console.error("Fetch error:", error);
    return { title: "無法取得新聞", description: "", url };
  }
}

// 產生圖片
async function generateImage(prompt: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-exp-image-generation",
    generationConfig: {
      responseModalities: ["image", "text"]
    }
  });
  
  const result = await model.generateContent(prompt);
  
  // 處理回傳的圖片
  for (const part of result.response.candidates[0].content.parts) {
    if (part.inlineData) {
      // 回傳 base64 圖片
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  
  throw new Error("無法生成圖片");
}

// 主 API 函數
export default async function handler(req: Request) {
  // 設定 CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  
  // 處理 OPTIONS 請求
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers });
  }
  
  // 僅接受 POST 請求
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: "僅接受 POST 請求" }), { 
      status: 405, 
      headers: { ...headers, 'Content-Type': 'application/json' } 
    });
  }
  
  try {
    const body = await req.json();
    const { newsUrl, style, richness } = body;
    
    if (!newsUrl) {
      return new Response(JSON.stringify({ error: "請提供新聞連結" }), { 
        status: 400, 
        headers: { ...headers, 'Content-Type': 'application/json' } 
      });
    }
    
    // 1. 取得新聞內容
    const news = await fetchNewsContent(newsUrl);
    
    // 2. 設定風格
    const config = STYLE_CONFIGS[style] || STYLE_CONFIGS["打綠班"];
    
    // 3. 設定資訊點數
    const pointsMap = {
      "精簡": "3-4個重點",
      "一般": "5-6個重點", 
      "詳細": "7-8個重點"
    };
    const richnessText = pointsMap[richness] || pointsMap["一般"];
    
    // 4. 產生 prompt
    const prompt = `資訊圖卡，${config.vibe}風格。${config.bg}。用向量插畫呈現新聞相關人物。標題「${news.title}」。內容需要${richnessText}。16:9橫版。底部放媒體LOGO和日期。現代設計，資訊分明。`;
    
    // 5. 生成圖片
    const imageBase64 = await generateImage(prompt);
    
    // 6. 回傳結果
    return new Response(JSON.stringify({
      success: true,
      data: {
        imageUrl: imageBase64,
        title: news.title,
        description: news.description,
        style: style,
        richness: richness
      }
    }), {
      headers: { ...headers, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ 
      error: error.message || "生成失敗，請稍後再試" 
    }), { 
      status: 500, 
      headers: { ...headers, 'Content-Type': 'application/json' } 
    });
  }
}
