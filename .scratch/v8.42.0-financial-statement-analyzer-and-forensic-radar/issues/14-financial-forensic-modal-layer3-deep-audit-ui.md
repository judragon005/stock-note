# 14 — Layer 3 UI: Forensic Anomaly List & Auditor KAM Panel

**What to build:**
實作第 3 層深度鑑識與審計查核面版 `src/components/financial/FinancialForensicDeepAuditLayer.tsx`。
直觀呈現：
1. 「市場沒說什麼」排查卡片清單（條列 6 大規則判定結果，有背離時顯示紅/黃警戒標籤與白話解讀）
2. 會計師查核意見卡片（事務所名稱、四大所標章、查核意見等級與 KAM 關鍵查核事項摘要）
3. 一鍵導出完整 Markdown 研報按鈕

**Blocked by:** 08-forensic-fraud-and-contrarian-radar.md, 11-financial-markdown-report-generator.md

**Status:** done

- [x] 實作「市場沒說什麼」異常卡片列表渲染（支援無異常時之綠色健康狀態）
- [x] 實作會計師查核防線卡片與四大會計師事務所驗證徽章
- [x] 串接研報匯出與剪貼簿複製回饋 Toast
- [x] 單元測試驗證多項異常同時發生時之排版穩定性與無障礙文字
