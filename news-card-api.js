// ============================================
// 新聞圖卡生成 API
// ============================================

// 此代碼用於 Lovable 中作為 API 端點
// 請在 Lovable 專案中建立 /api/generate-card

import { Client } from "@google/genai";

// 環境變數
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "your-api-key-here";

export async function generateNewsCard(
  newsUrl: string,
  programStyle: string,
  richnessLevel: string
): Promise<{ imageUrl: string; summary: string }> {
  
  // 1. 先抓取新聞內容
  const response = await fetch(newsUrl);
  const html = await response.text();
  
  // 簡單解析標題和內容（實際可用更好的 parser）
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1] : "新聞";
  
  // 2. 根據節目風格設定配色
  const styleConfig = {
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
      vibe: "活力、輕鬆"
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
  
  const config = styleConfig[programStyle] || styleConfig["打綠班"];
  
  // 3. 設定資訊點數
  const pointsMap = {
    "精簡": 3,
    "一般": 5,
    "詳細": 7
  };
  const numPoints = pointsMap[richnessLevel] || 5;
  
  // 4. 產生圖卡的 prompt
  const prompt = `資訊圖卡，${config.vibe}風格。${config.bg}。用向量插畫呈現新聞相關人物。標題「${title}」。內容需要${numPoints}個重點。16:9橫版。底部放媒體LOGO和日期。現代設計，資訊分明。`;
  
  // 5. 調用 Gemini API 生成圖片
  const client = new Client({ apiKey: GEMINI_API_KEY });
  
  const result = await client.models.generateContent({
    model: "gemini-2.0-flash-exp-image-generation",
    contents: prompt,
    config: {
      responseModalities: ["image", "text"]
    }
  });
  
  // 6. 回傳結果
  return {
    imageUrl: result.imageBase64, // 或上傳到雲端儲存
    summary: `已生成 ${programStyle} 風格圖卡`
  };
}

// Lovable API 端點範例
/*
export async function onRequestPost(context) {
  const { url, style, richness } = await context.request.json();
  const result = await generateNewsCard(url, style, richness);
  return new Response(JSON.stringify(result));
}
*/
