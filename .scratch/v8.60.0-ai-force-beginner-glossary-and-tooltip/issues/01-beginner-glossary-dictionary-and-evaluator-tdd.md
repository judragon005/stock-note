# 01 — 領域名詞單一真相字典與新手買賣決策診斷器 (TDD)

**What to build:**
建立 `src/constants/aiForceGlossary.ts` 與單元測試 `src/constants/aiForceGlossary.test.ts`：
1. 定義 `GlossaryEntry` 型別：
   - `id`: string
   - `term`: string（名詞中文名稱）
   - `enTerm`?: string
   - `metaphor`: string（💡 白話比喻，日常生動概念）
   - `meaning`: string（📊 指標含義，統計物理本質）
   - `buySignal`: string（🟢 偏多買訊）
   - `sellSignal`: string（🔴 偏空賣訊）
   - `neutralWarning`?: string（🟡 觀望警戒）
   - `diagnose`?: (params: any) => string（⚡ 動態即時數值白話診斷結語）
2. 收錄所有 18 大 Bento-Grid 卡片與頂部行情列之所有關鍵詞彙（包含但不限於：主力成本、支撐/壓力區、MA均線、KD、MACD、RSI、隔日沖比例、過手率、多空能量比、健康評分、年化漂移、市場情緒等）。
3. 實作輔助函式 `getGlossaryEntry(id: string): GlossaryEntry | undefined`。
4. 實作動態診斷函式：例如主力成本診斷（比較現價與主力成本溢價幅度並判定多空支撐狀態）、隔日沖風險診斷等。

**Blocked by:** None — can start immediately

**Status:** completed

- [x] `GlossaryEntry` 介面與完整詞庫宣告
- [x] 涵蓋 Header 與 18 張卡片所有名詞條目
- [x] 每個條目均包含白話比喻、指標意義、買訊、賣訊與觀望警示
- [x] 動態診斷函式精準計算高低差與多空評價
- [x] `aiForceGlossary.test.ts` 單元測試 100% 綠燈
