# ADR-0016: 整合式設定工作台與外部 API Key 管理架構

- **狀態**：ACCEPTED
- **日期**：2026-08-24
- **關聯 PRD**：[SPEC-0016: 整合式設定中心、Header 按鈕精簡與外部 API Key 配置規格書](../specs/0016-settings-workspace-and-api-key-configuration.md)

---

## 1. 背景與脈絡 (Context)

在系統引入活頁本工作台 (Workspace Tabs) 之後，頂部 Header 仍保留著舊有的「摩擦成本」與「券商設定」捷徑按鈕，造成 UI 元件職責重疊與按鈕雜亂。同時，隨著日後對多元外部金融資料源（如 FinMind、FMP、Alpha Vantage）的需求浮現，系統需要一個全域統一的「⚙️ 設定」工作台。

---

## 2. 決策內容 (Decision)

1. **Header 瘦身**：
   - 移除頂部 Header 的 `[ 💸 摩擦成本 ]` 與 `[ ⚙️ 券商設定 ]` 按鈕，統一由活頁本標籤引導。
2. **工作台收斂至【⚙️ 設定】**：
   - 活頁標籤鍵值演進為 `settings`（向下相容 `friction`），標籤文字顯示為 `⚙️ 設定`。
3. **設定中心三大模組**：
   - **券商帳戶與費率管理**
   - **交易摩擦成本深度分析**
   - **外部資料 API 金鑰管理** (FinMind、FMP、Alpha Vantage、自訂 Proxy)，採用獨立 LocalStorage 隔離儲存 (`STOCK_TRACKER_API_KEYS_V1`)。

---

## 3. 效益與影響 (Consequences)

- **正面效益**：
  - 頂部導覽列大幅精簡，符合現代極簡設計哲學。
  - 所有系統級配置、券商帳戶與摩擦分析統一名稱收納在「設定」中，使用者心智模型更直覺。
  - 為未來的多源金融資料整合鋪平道路，金鑰安全隔離不外洩。
