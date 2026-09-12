# 01 — Financial Types & Canonical Schema Definition

**What to build:**
建立財報分析與鑑識防雷系統的核心資料型別定義 `src/types/financialForensic.ts`。包含標準化 16 欄位 `QuarterlyFinancialRecord`、四大維度比率結構、六大「市場沒說什麼」鑑識結果、會計師查核意見枚舉、產業類別標籤與綜合評級介面。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [x] 在 `src/types/financialForensic.ts` 定義 `QuarterlyFinancialRecord` 核心 16 欄位介面
- [x] 定義 `ForensicAnomaly` 六大逆向背離與警報層級 (`DANGEROUS` | `WARNING` | `NEUTRAL` | `HEALTHY`)
- [x] 定義 `AuditOpinionType` 與 `IndustryAttribute` (`STANDARD` | `FINANCIALS` | `CYCLICAL`)
- [x] 撰寫單元測試驗證型別定義無任何 circular dependency 與 TypeScript 編譯報錯
