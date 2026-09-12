# Spec 0124: 穿透式財報深度戰情室浮動彈窗樣式修復與點擊激活規格 (Financial Forensic Modal Styling & Activation Repair Spec)

## Problem Statement

在 Spec 0123 實作完成穿透式財報分析儀（Financial Forensic System）後，使用者於持股時間軸點擊「📑 財報穿透」按鈕時反映「沒有任何的功能，按按鍵並沒有任何反應」。

經深度代碼與運行時檢視，發現系統底層存在嚴重的樣式架構與渲染缺陷：

1. **Tailwind CSS 類別失效導致浮動彈窗排版崩塌（落入 DOM 最底層）**：
   - `FinancialForensicModal.tsx` 及其子圖層（`FinancialHeroLayer.tsx`、`FinancialTrendsLayer.tsx`、`FinancialForensicDeepAuditLayer.tsx`）誤採用了大量的 Tailwind CSS 類別（例如 `fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm overflow-y-auto`）。
   - 然而，**本專案為純原生 Vanilla CSS + CSS Variables 架構（未安裝且未配置 Tailwind CSS 編譯器）**。
   - 瀏覽器無法解析這些 Tailwind 類別，導致最外層容器預設為靜態區塊（`position: static`），且無 `fixed` 定位、無 `z-index`、無全螢幕遮罩。
   - 當使用者點擊按鈕時，React 狀態已正確變更為 `isOpen: true`，但彈窗實體被直接渲染在整個 HTML 頁面最底部（卷軸數千像素之下）。畫面上方毫無視覺變化，使用者直觀感受為「按鍵無反應」。

2. **三大財務圖層內部視覺與圖表佈局破版**：
   - 各層次內部的 `grid`, `flex`, `p-4`, `bg-slate-900/80` 等 Tailwind 樣式均未生效，即使手動滾動到頁尾，所有三率折線 SVG、CFO 階梯柱狀圖、杜邦三因子拆解、會計師查核標籤均呈現未排版的崩潰狀態。

3. **按鈕視覺提示與反饋不足**：
   - 點擊時缺乏載入反饋與控制台追蹤日誌，無法在第一時間確認資料抓取進度。

## Solution

依據 **KISS 原則** 與專案既有設計規範（對齊 `OmniTechnicalInspectorModal.tsx`）：

1. **全面重構 `FinancialForensicModal.tsx` 為原生 Inline Styles + CSS Variables**：
   - 遮罩層：`position: 'fixed'`, `inset: 0`, `backgroundColor: 'rgba(0, 0, 0, 0.8)'`, `backdropFilter: 'blur(8px)'`, `zIndex: 9999`, `display: 'flex'`, `alignItems: 'center'`, `justifyContent: 'center'`, `padding: '16px'`。
   - 主彈窗容器：`width: '100%'`, `maxWidth: '1080px'`, `maxHeight: '92vh'`, `backgroundColor: 'var(--bg-card, #0f172a)'`, `border: '1px solid rgba(59, 130, 246, 0.3)'`, `borderRadius: '16px'`, `display: 'flex'`, `flexDirection: 'column'`, `overflow: 'hidden'`, `color: 'var(--text-primary, #ffffff)'`。
   - Header 與頂部控制列（強制刷新、ESC 關閉、關閉按鈕）改為內聯樣式與流暢 Hover 效果。
   - Loading 與 Error 狀態容器改為置中彈性盒佈局。

2. **全面重構三大財務圖層元件（Hero、Trends、DeepAudit）為原生深色樣式**：
   - **`FinancialHeroLayer.tsx`**：
     - 0 秒核心操盤結論橫幅採用深藍/紫漸層背景與精美邊框。
     - 四大體質維度指示燈（獲利、安全、效率、現金流）採用標準 2x2/4x1 Responsive Grid/Flex 佈局，紅/綠/黃/灰燈色碼直接對齊專案 CSS 變數。
     - 產業屬性（金融股豁免、景氣循環股警語）徽章採用高對比背景與邊框。
     - **測試相容性保護**：保留 `getGradeColorClass`、`getTrafficLightBadgeInfo`、`getIndustryBadgeInfo` 的原回傳值與文字，確保既有 Vitest 測試持續 100% 綠燈。
   - **`FinancialTrendsLayer.tsx`**：
     - 近 8 季獲利三率折線圖：SVG 容器設定完整寬高與坐標軸輔助線，毛利率、營業利益率、淨利率分別以翡翠綠、天藍、紫羅蘭色呈現。
     - 稅後淨利 vs 營業現金流 (CFO) 階梯圖：採用等距長條柱與背離警示標籤。
     - 杜邦 ROE 三因子矩陣：卡片式拆解（淨利率、資產週轉率、權益乘數）並清楚標註主驅動力。
   - **`FinancialForensicDeepAuditLayer.tsx`**：
     - 「市場沒說什麼」逆向鑑識異常卡片清單（高危警報/關注警戒）清晰條列。
     - 會計師查核意見（無保留/保留/否定/無法表示）與四大會計師事務所標章徽章。
     - 一鍵複製 Markdown 鑑識戰報功能按鈕。

3. **持股表格按鈕增強與偵錯日誌**：
   - 在 `HoldingsTable.tsx` 的「財報穿透」按鈕加入 `console.log`，確保點擊時能第一時間在 DevTools 追蹤傳入之 symbol 與 market。

## Acceptance Criteria (驗收標準)

1. **即時浮動彈出 (Modal Activation)**：
   - 點擊持股時間軸右上角之「📊 財報穿透」按鈕時，視窗立即在螢幕正中央彈出深色毛玻璃彈窗，遮罩完整覆蓋全螢幕 (`zIndex: 9999`)。
   - 支援點擊遮罩外圍或按 `ESC` 鍵關閉彈窗。
2. **三層視覺架構完整渲染 (Visual Hierarchy)**：
   - **Layer 1 (Hero)**：正常顯示代碼、公司名稱、最新季度、產業標籤、綜合評分 (0~100) 與四大體質燈號。
   - **Layer 2 (Trends)**：三率曲線 SVG 清楚繪製 8 季走勢；CFO 柱狀階梯圖與背離標記對齊；杜邦分析三因子長條矩陣清晰可讀。
   - **Layer 3 (Deep Audit)**：逆向背離偵測卡片無溢出；會計師查核意見與四大所徽章清晰展示；點擊「複製鑑識報告」能成功將 Markdown 複製至剪貼簿並給予成功提示。
3. **極端狀態處理 (Loading & Error)**：
   - 在數據抓取中顯示轉圈 Loading 動畫與提示文字；若抓取失敗顯示錯誤訊息與「重試連線」按鈕。
4. **回歸測試與構建 (Regression & Build)**：
   - `npm test` 通過率 100%（867/867 測試通過）。
   - `npm run build` TypeScript 零錯誤。
