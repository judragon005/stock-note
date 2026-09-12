# 11 — Financial Forensic Markdown Report Generator

**What to build:**
實作 Markdown 財務研報匯出管線 `src/engine/financialReportPipeline.ts`。將標的 8 季核心數據、杜邦分解結果、四大體質燈號、會計師查核意見與「市場沒說什麼」鑑識清單，組裝為一份排版精美、可一鍵複製或匯出分享的專業級投資研報。

**Blocked by:** 10-financial-executive-summary-and-scoring-engine.md

**Status:** done

- [x] 實作 `generateFinancialForensicMarkdown(report: FinancialForensicReport): string`
- [x] 包含總評卡、四大維度比率矩陣、8 季歷史趨勢表格、市場沒說什麼清單與審計 KAM 備註
- [x] 支援一鍵複製到剪貼簿功能
- [x] 單元測試驗證生成的 Markdown 格式完整無缺漏、字元跳脫正確
