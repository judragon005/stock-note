# Ticket 12: 實作 WarRoomPromptCard 緊湊深色毛玻璃卡片組件骨架

## 1. 任務目標
建立專為主力戰情室打造的底層卡片 `src/components/aiForceDashboard/WarRoomPromptCard.tsx`。遵循專案深色毛玻璃設計規範（`--bg-card`, `--border-color`, `--text-primary`），提供緊湊且大氣的戰情提示詞外聯卡片骨架。

## 2. 修改範圍
* 新增檔案：`src/components/aiForceDashboard/WarRoomPromptCard.tsx`
  - 頂部標題列：BrainCircuit 圖標、標題「⚡ AI 戰情提示詞與外聯中樞 (Grounded Prompt Hub)」、標的名稱與市場標籤。
  - 右側控制項：個人持股脫敏切換開關、Token 計數預估膠囊。
  - 主操作區：醒目的一鍵複製按鈕。

## 3. 實作重點
* 嚴格使用專案全域 CSS 變數，杜絕 Tailwind 與非標準 inline styles。
* 響應式佈局：在小螢幕上自適應折行。

## 4. 驗收標準 (AC)
- [ ] 組件成功編譯，介面呈現高科技深色 Glassmorphism 風格。
- [ ] 支援標的名稱、即時價格與脫敏開關的即時顯示。
