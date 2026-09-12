# 04 — Deep Audit Layer Styling & Clipboard Refactor

**What to build:**
重構 `src/components/financial/FinancialForensicDeepAuditLayer.tsx`。
將 Tailwind classes 替換為標準原生 Inline Styles 與深色主題變數。

1. 「市場沒說什麼」逆向背離偵測卡片清單（高危警報/關注警戒）原生卡片排版。
2. 會計師查核意見（無保留/保留/否定）與四大事務所標章原生徽章。
3. 一鍵複製 Markdown 戰報按鈕樣式與複製成功綠色提示。
4. 保持 `getAnomalySeverityBadgeInfo`、`getAuditOpinionBadgeInfo` 簽章與輸出以相容 Vitest。

**Blocked by:** 03-trends-layer-svg-and-dupont-styling-refactor.md

**Status:** done

- [x] 移除 Tailwind classes，改用原生 Inline Styles
- [x] 逆向鑑識卡片文字高對比且無跑版
- [x] 既有單元測試 `FinancialForensicDeepAuditLayer.test.ts` 100% 綠燈
