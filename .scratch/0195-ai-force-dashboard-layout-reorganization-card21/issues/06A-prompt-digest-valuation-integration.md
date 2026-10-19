# 06A — 全域外聯提示詞中樞整合 (WarRoom Prompt Digest 估值與美股宏觀情緒注入)

**Parent:** #290

**What to build:**
修改 `createWarRoomPromptDigest.ts`，將 Card 21 之估值位階（便宜/合理/偏高、PE/PB/PS/折溢價）以及 Card 13 之美股 CNN/VIX 宏觀情緒同步注入 Prompt Digest 文本，確保一鍵匯出之戰情提示詞包含最新估值狀態。

**Blocked by:** 03, 04B, 04C

**Status:** completed

## Acceptance Criteria
- [x] 戰情室外聯提示詞包含 `<valuation_status>` 節點，輸出當前估值位階與本益比/股價淨值比/折溢價率。
- [x] 美股模式下外聯提示詞包含 CNN 恐懼貪婪指數與 VIX 情緒。
- [x] 提示詞生成單元測試 100% 通過。
