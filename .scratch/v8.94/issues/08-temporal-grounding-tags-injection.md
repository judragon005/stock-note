# Ticket 08: 提示詞模板注入時態分割宣告標籤：盤中即時 vs 昨日盤後結算

## 1. 任務目標
在提示詞組裝管線中，注入 `<market_time_dimension>` 時態標籤與宣告，將資料明確劃分為「盤中即時 (Intraday Live)」與「昨日盤後結算 (Settled EOD)」，強制外部 AI 理解資料發生的時間差，杜絕將昨日法人買超誤診為今日盤中護盤的致命時空錯亂。

## 2. 修改範圍
* `src/engine/strategicPromptEngine.ts`:
  - 產出 `<system_grounding_declaration>` 宣告區塊。
  - 產出 `<market_time_dimension>`，明確列出即時量價時間戳與盤後結算日期。
  - 加入強制指令：「所有推論必須百分之百錨定於下方事實特徵，嚴禁猜測未提供之時空資料」。

## 3. 驗收標準 (AC)
- [ ] 提示詞頂部包含清晰的時態與時間基準聲明。
- [ ] 包含禁止時空混淆的嚴格 Prompt 指令。
