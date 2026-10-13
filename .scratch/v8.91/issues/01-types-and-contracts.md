# 01 — 智策提示詞型別契約與資料模型 (Ticket 01)

**Parent Issue:** #135
**Parent Spec:** [Spec 0153: 智策精煉投資決策多維提示詞引擎與工作區數據注入生成器規格書](file:///d:/APP/股票紀錄/docs/specs/0153-smart-strategic-prompt-engine-and-workspace-generator-spec.md)
**Parent ADR:** [ADR 0153: 智策精煉投資決策多維提示詞引擎架構規劃](file:///d:/APP/股票紀錄/docs/adr/0153-smart-strategic-prompt-engine.md)

**What to build:**
建立 `src/types/strategicPrompt.ts` 核心型別定義：
1. `AssetClassType`: `'EQUITY' | 'ETF'`
2. `SixThinkingHatDimension`:
   - `'WHITE'` (客觀數據)
   - `'RED'` (直覺情緒)
   - `'BLACK'` (魔鬼代言人/紅隊批判)
   - `'YELLOW'` (核心價值催化劑)
   - `'GREEN'` (非對稱創新策略)
   - `'BLUE'` (元認知與執行紀律)
3. `PromptOutputMode`: `'FULL_MASTER' | 'SINGLE_HAT' | 'SEVEN_DIMENSIONS'`
4. `StrategicFactDigest`:
   - 行情與趨勢（現價、漲跌、均線排列、真實成交筆數）
   - 籌碼微觀（法人淨買賣、大戶散戶比、融資券）
   - 基本面與營收（月營收 YoY/MoM/創新高、毛利率、營業利益率、FCF）
   - ETF 特殊屬性（動態權重、TER、追蹤偏離、折溢價、前十大成分股）
   - 風險指標（董監質押率、處置股票狀態、WACC/美債殖利率利差）
5. `PromptCustomsAudit`: 時間戳、交易日定錨狀態 (`isSettled`)、真實性保證。
6. `PromptGenerationOptions`: 脫敏開關 (`desensitized`)、模型方言格式 (`XML_HYBRID`)、持倉佔比 (`portfolioWeightPct`)。
7. `StrategicPromptResult`: 生成的文字內容、預估 Token 數、資產分類、數據海關元數據。

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] `src/types/strategicPrompt.ts` 型別定義完備，匯出所有必要介面。
- [ ] 零依賴且相容 TypeScript strict mode。
