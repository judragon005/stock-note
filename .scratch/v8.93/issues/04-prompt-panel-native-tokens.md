# Ticket 04: 提示詞面板移除無效 Tailwind Classes & 回歸原生變數 (Native Tokens)

## 1. 權責範圍 (Scope)
* **核心檔案**：`src/components/analysis/StrategicPromptPanel.tsx`
* **測試檔案**：`src/components/analysis/StrategicPromptPanel.test.tsx`

## 2. 需求描述 (Description)
1. 移除外層與內部所有的 Tailwind class（如 `p-5`, `rounded-2xl`, `border-slate-700/60`, `backdrop-blur-md` 等）。
2. 外層改用原生深色 Glassmorphism 卡片樣式（`background: var(--bg-card, rgba(15, 23, 42, 0.72))`, `border: 1px solid var(--border-color)`, `borderRadius: var(--radius-md, 12px)`, `boxShadow: var(--shadow-card)`）。
3. 杜絕因缺乏 Tailwind 編譯器而引發的 raw block 流樣式崩壞。

## 3. 驗收標準 (Acceptance Criteria)
* [ ] 元件外框 100% 採用專案原生 CSS 變數。
* [ ] 樣式與整體工作台無縫融合。
