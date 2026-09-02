# 03 — 3 步驟視覺化匯入精靈 UI 彈窗 (EnhancedImportModal)

**What to build:**
建置現代毛玻璃與暗黑主題之 3 步驟視覺化匯入精靈 (`src/components/EnhancedImportModal.tsx`)：
1. **Step 1: 上傳與偵測 (Upload & Detect)**：
   - 支援拖曳上傳與點擊選擇。
   - 自動展示自動偵測出之券商名稱與編碼切換 (UTF-8 / Big5)。
2. **Step 2: 欄位映射與帳戶綁定 (Mapping & Account Binding)**：
   - 視覺化雙欄映射選單（來源 CSV 欄位 ➔ 系統必要與可選欄位）。
   - 目標券商帳戶下拉選單指定（自動預設 TW 或 US 帳戶）。
   - 支援「儲存為自訂範本」與「切換既有券商範本」。
3. **Step 3: 逐行預覽校驗與去重確認 (Preview & Commit)**：
   - 渲染前 N 筆解析紀錄，以綠/黃/紅 Badge 清楚標示 `全新 (New)`、`重複 (Duplicate)`、`異常 (Error)`。
   - 統計面板：總筆數、有效新增、重複略過、格式異常。
   - 提供「智慧追加去重（推薦）」、「全量快照覆蓋」與「強制全數追加」操作按鈕。

**Blocked by:** Issue 01, Issue 02

**Status:** completed
**Triage:** `ready-for-agent`

- [x] 實作 `src/components/EnhancedImportModal.tsx`
- [x] 實作 Step 1, Step 2, Step 3 視覺化子元件
- [x] 整合 CSS 樣式與動畫
