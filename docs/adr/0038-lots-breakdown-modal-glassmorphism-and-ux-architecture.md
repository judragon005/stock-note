# ADR #0038: 持股多批次會計明細 Glassmorphism 介面重構與互動架構 (Lots Breakdown Modal Glassmorphism & UX Architecture)

- **狀態**：`ACCEPTED`
- **日期**：2026-08-28
- **決策者**：前端架構師、UI/UX 設計師、交易員代表
- **關聯 PRD**：[docs/specs/0038-lot-modal-glassmorphism-redesign-and-ux-enhancements.md](../specs/0038-lot-modal-glassmorphism-redesign-and-ux-enhancements.md)
- **關聯前置 ADR**：[docs/adr/0035-lot-based-accounting-and-tax-loss-harvesting.md](0035-lot-based-accounting-and-tax-loss-harvesting.md)

---

## 1. 背景與脈絡 (Context)

在 v5.3 引入多批次沖銷會計核心演算法後，投資人可透過 `LotsBreakdownModal` 檢視個別買進批次明細與節稅對照。然而原有實作誤用了未配置編譯環境的 Tailwind CSS 類別，導致在實際渲染時樣式全面退化為無排版的原生 HTML 文本堆疊，產生嚴重的文字黏連（如 `2024-04-24150`）與欠缺結構化卡片感等使用體驗缺陷。

---

## 2. 架構決策 (Decisions)

### 2.1 統一採用專案原生 Glassmorphism 與 CSS 變數體系
- 徹底移除無效之 Tailwind class，改用專案標準毛玻璃背景（`glass-card`、`backdropFilter: blur(8px)`）與主題自適應 CSS 變數（`var(--bg-card)`, `var(--gain-color)`, `var(--loss-color)`, `var(--font-mono)`）。
- 數值與價格全面套用 `JetBrains Mono` 等寬字型與靠右對齊，徹底根除排版擠壓與黏連。

### 2.2 資訊架構重構 (Information Architecture)
1. **頂部 4 格資產指標看板**：結構化展示「在庫總股數」、「總成本基準」、「參考現價」、「未實現損益（含報酬率膠囊）」。
2. **批次明細表格升級**：
   - 支援點擊表頭動態切換排序（買進日期、股數、單價、單股成本、損益、持有天數 🔼/🔽）。
   - 依自然日天數 $\ge 365$ 天動態渲染 `💎 長期`（綠色優惠標籤）與 `⚡ 短期`（藍色標籤）。
   - 自動生成年份過濾晶片（`全部` / `2026` / `2024` ...）。
3. **節稅沖銷對照 (Tax Comparison) 智慧儀表板**：
   - 橫向網格並列 4 種會計方法指標。
   - 自動判定並高亮 `👑 最佳節稅` 推薦模式，並計算相比 FIFO 之節稅/遞延利得差額。

---

## 3. 影響與驗收成果 (Consequences & Validation)

- **使用者體驗顯著躍升**：從原始文本堆疊升級為頂級機構級深色金融儀表板。
- **品質與測試覆蓋**：新增 `LotsBreakdownModal.test.ts`，全案 **19 個測試套件、229 個測試案例 100% 綠燈通過**，TypeScript 0 錯誤。
