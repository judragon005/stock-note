# 0126. 穿透式財報券商級常態同步、審計季度錨定與完整性門禁架構 (Financial Forensic Broker-Grade Sync, Audited Sentry & Integrity Gate)

- **狀態**：Accepted
- **日期**：2026-09-14
- **關聯規格**：[docs/specs/0126-financial-forensic-broker-grade-sync-and-integrity-gate-spec.md](../specs/0126-financial-forensic-broker-grade-sync-and-integrity-gate-spec.md)
- **關聯 Issue**：[#50](https://github.com/judragon005/stock-note/issues/50)

---

## 背景與脈絡 (Context)

在實盤檢驗【2327 國巨】穿透式財報戰情室時，使用者反饋了重大視覺與數據異常：
1. **荒誕天文數字（499,910 億）**：柱狀圖柱頂金額標籤出現數十萬億級別數值，經查係單位換算器誤將元當成百萬進行重複放大。
2. **大面積數值為空與 0.0% 假陽性**：四大卡片中毛利 38.1%、淨利 0.0%、負債比 `-`、CFO 0 億、杜邦 ROE 0.0%，柱狀圖全為 0 百萬。
   - **根因 A (舊快取殘留污染)**：本地 IndexedDB 快取了早期僅有損益表的殘缺季度，系統未檢驗快取完整性直接採用。
   - **根因 B (空殼未申報季污染)**：API 預載自結營收，造成空殼季度（無淨利、資產負債與現金流）排在首位，導致系統評估基準與四大卡片抓取到空殼季。
   - **根因 C (欄位科目別名遺漏)**：FinMind 現金流量表及資產負債表部分科目別名（如資產總額、負債總額等）未獲完整正規化對應。
3. **缺乏券商級延遲載入體驗**：在更新資料時，過渡期缺少版面固定之深色骨架屏，容易引發畫面跳動或讓使用者看見半殘狀態。

---

## 架構決策 (Decision)

1. **金額自適應換算器 (`formatFinancialAmount`)**：
   - 建立嚴格基於「元 (TWD)」為基底的自適應格式化機制：$\ge 1$ 億元換算為 `X.X 億`，100 萬～1 億元換算為 `X.X 百萬`，$< 100$ 萬元輸出在地化千分位數值，徹底消滅單位換算乘除偏差。
2. **快取健康自癒與全量科目別名覆蓋 (`financialReportService.ts` & `taiwanFinancialPipeline.ts`)**：
   - 實作 `isFinancialRecordsCacheValid` 完整性檢驗哨兵：若本地快取中所有紀錄之 CFO 均為 0 且總資產為 0（舊版殘缺快取特徵），自動判定快取無效並無縫觸發遠端全量重撈與覆蓋寫入。
   - 全面覆蓋台灣公開資訊觀測站與 FinMind 之資產負債與現金流量表科目別名（含資產總計、資產總額、負債總額、營業活動之淨現金流入等）。
3. **正式審計季度過濾哨兵 (`isQuarterRecordComplete`)**：
   - 過濾僅有營收、尚未申報稅後淨利與資產負債的空殼季度。
   - 0 秒戰報、四大體質卡片、杜邦分析嚴格錨定於「最新完整申報季」，並在頂部明確標註【審計基準季：YYYY-QX】。
4. **券商級深色毛玻璃骨架屏與平滑淡入門禁 (`FinancialSkeletonLayer.tsx` & `FinancialForensicModal.tsx`)**：
   - 在遠端同步與資料解析期間，維持版面高度固定的深色毛玻璃骨架屏（Hero 決策層、四大指標卡、三率趨勢圖與深度審查佔位），完全不呈現未完成數值。
   - 三大報表原子聚合與驗證 100% 完備後，以 0.2 秒平滑淡入（Fade-In）點亮呈現。

---

## 影響與驗證 (Consequences & Verification)

- **正面影響**：
  - 徹底消除數十萬億級別的天文數字與 0.0% / CFO 0 億的假陽性，符合大型券商研究部嚴謹水準。
  - 本地殘缺快取具備自動洗滌與自癒能力，無須使用者手動清除資料庫。
  - 深色毛玻璃骨架屏確保零版面位移 (Zero-CLS)，營造沉浸式金融級交互體驗。
- **架構完整性與回歸驗證**：
  - 遵守極簡 KISS 原則，零 TailwindCSS，全量原生 Inline Style。
  - 全量 88 個測試檔案、876 個單元測試 100% 綠燈通過。
  - `npm run build` 通過，TypeScript 嚴格型別 0 錯誤。
