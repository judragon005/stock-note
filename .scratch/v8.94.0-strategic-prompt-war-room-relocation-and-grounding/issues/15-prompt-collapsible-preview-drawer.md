# Ticket 15: 實作抽屜式可折疊高對比結構化 Prompt 預覽器

## 1. 任務目標
在卡片底部提供可選的「結構化 Prompt 預覽抽屜」：
- 平常預設折疊，不佔用戰情室縱深空間。
- 使用者點擊「檢視即將注入之結構化 XML 語意提示詞」時展開。
- 採用高對比終端風格代碼區塊（JetBrains Mono 字型、`--bg-secondary`、半透明邊框）。
- 支援一鍵全選或抽屜內部獨立滾動條。

## 2. 修改範圍
* `src/components/aiForceDashboard/WarRoomPromptCard.tsx`:
  - 狀態管理：`showPreview: boolean`。
  - 折疊展開動畫與箭頭圖示切換（`ChevronDown` / `ChevronUp`）。

## 3. 驗收標準 (AC)
- [ ] 預覽器預設為收合狀態。
- [ ] 點擊切換展開/收合順暢，文字排版清晰可讀。
