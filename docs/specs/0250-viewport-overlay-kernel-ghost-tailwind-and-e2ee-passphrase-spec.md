# Spec 0250: 系統免疫強化 Wave 3 — 視口對話層作業系統 (Viewport Overlay Kernel)、幽靈 Tailwind 根除、明文 E2EE 密碼汰換與全站彈窗收斂

## Problem Statement

五路正交法醫審計（Spec 0247）與全站彈窗審計（Spec 0245）揭露本系統在「視口覆蓋層管理、樣式系統完整性、敏感金鑰輸入資安與無障礙互動」四個維度存在顯著結構性缺陷（[Debt 0068](../debts/0068-ghost-tailwind-modalshell-hardening-and-e2ee-prompt.md)、[Debt 0063](../debts/0063-legacy-modals-portal-shell-migration.md)）：

1. **75 處未安裝之幽靈 Tailwind CSS 造成實質畫面破損**：
   - 本專案未安裝 Tailwind CSS，但券商帳戶管理彈窗（43 處，含失效之視口固定定位類別）、API 金鑰池管理介面（24 處）與 XIRR 績效拆解彈窗（8 處）仍大量依賴無效的 utility class，導致瀏覽器退化為一般文件流排版、彈窗無法居中固定覆蓋視口、按鈕與邊框遺失設計系統視覺一致度。
2. **統一彈窗原語（`ModalShell`）存在四大底層先決缺陷，阻斷全站收斂**：
   - **佈局模型衝突**：內層容器強制套用整體捲動與固定內距，直接破壞全站 10+ 顆採用固定頁首／頁尾與中段獨立捲動之深度分析彈窗（產生雙捲軸或標題捲出視口）。
   - **捲動鎖競態與生命週期抖動**：背景頁面捲動鎖定缺乏模組級引用計數機制，多層彈窗以非後進先出（非 LIFO）順序卸載時會提前解鎖背景捲動；且將鎖定旗標直接納入副作用依賴陣列，導致鎖定狀態切換時重複拆裝全域事件監聽器。
   - **多層彈窗按鍵廣播風暴**：缺乏堆疊頂層仲裁機制，當巢狀彈窗開啟時按下 `Escape` 鍵，底層與頂層彈窗會同時收到關閉事件並連環關閉。
   - **無障礙焦點遺失與髒表單誤關風險**：缺乏鍵盤焦點陷阱（Focus Trap）與關閉後焦點復原機制；大型表單（新增交易、CSV 匯入、深度投研、宏觀校準、券商編輯）亦缺乏未儲存變更防誤關保護，誤觸遮罩或 `Escape` 即直接遺失已填資料。
3. **E2EE 零知識加密備份以明文阻塞對話框輸入主密碼**：
   - 匯出與匯入 E2EE 加密備份時，系統直接呼叫瀏覽器原生 `window.prompt()` 讀取加密主密碼，不僅全程明文顯示於螢幕（肩窺風險），且硬阻塞主執行緒與無法整合鍵盤無障礙及密碼雙重核對體驗。
4. **全站 23 顆有效既有彈窗碎片化與零引用死碼殘留**：
   - 全站尚有 18 顆獨立彈窗元件與 5 處內嵌式阻斷覆蓋層維持異質寫法（自行拼湊遮罩、內聯固定定位、硬編碼層級），多數缺乏 `createPortal` 視口隔離（易遭父層濾鏡或變形屬性劫持）、缺乏 `role="dialog"` / `aria-modal="true"` 語意與鍵盤關閉能力；另殘留 1 顆零外部引用之舊版匯入彈窗死碼。

---

## Solution

執行「系統免疫強化 Wave 3」，嚴守 KISS（零新增外部依賴）、無障礙標準（WAI-ARIA APG Dialog Pattern）與既有公開介面零破壞原則，將單純的彈窗搬遷升維為統一的 **視口對話層作業系統（Viewport Overlay Kernel）與 CI 靜態免疫棘輪**，一次性清償 [Debt 0068](../debts/0068-ghost-tailwind-modalshell-hardening-and-e2ee-prompt.md) 與 [Debt 0063](../debts/0063-legacy-modals-portal-shell-migration.md)：

1. **升級 `ModalShell` 為視口對話層核心原語（Viewport Overlay Kernel）**：
   - 支援雙版面模式（標準整體捲動 `scroll` 與固定頁首／頁尾彈性佈局 `flex-fixed`）及三層視口高度權重（`base` / `nested` / `critical`），徹底相容所有分析型與表單型彈窗。
   - 導入模組級「堆疊頂層仲裁（Stack-Top Arbitration）」與「引用計數捲動鎖帳本（Scroll Lock Ledger）」，確保任意巢狀開關順序下，僅頂層彈窗響應 `Escape`、背景僅於最後一顆彈窗關閉時精準還原捲動。
   - 內建零依賴原生焦點陷阱（Tab / Shift+Tab 循環）、關閉後焦點精確復原，以及非阻塞式「髒表單二次確認護欄（Inline Dirty-Guard Banner）」，完全免除原生 `window.confirm()` 干擾。
2. **以遮罩密碼原語取代明文 E2EE `window.prompt()` 並清除死碼**：
   - 建立基於核心彈窗原語最高層級（`critical`）之密碼輸入對話框，提供遮罩輸入、可視切換、匯出雙次密碼一致性驗證與卸載即清零保護，全面替換 E2EE 備份匯出與匯入之 3 處明文 `window.prompt()`。
   - 物理移除零外部引用之舊版匯入彈窗死碼。
3. **根除 75 處幽靈 Tailwind CSS 並完成全站 23 顆有效彈窗 100% 收斂**：
   - 將券商帳戶管理、API 金鑰池管理與 XIRR 詳情之 75 處無效 utility class 全面轉換為專案既有語意樣式與設計系統 Token。
   - 將全站 18 顆獨立彈窗與 5 處內嵌阻斷式彈窗 100% 收斂至核心彈窗原語，並於領域模型明確劃分「阻斷式彈窗（Modal Overlay）」與「非阻斷浮動提示（Floating Tooltip）」之層級邊界。
4. **植入 CI 架構適應度靜態免疫棘輪（Architectural Fitness Ratchet）**：
   - 擴充靜態架構守門測試（不變量 12–14），永久封鎖未經核心原語掛載之彈窗、幽靈 Tailwind 類別與原生 `window.prompt()` 呼叫，確保同類缺陷回歸率歸零。

---

## User Stories

1. 作為管理台美股多券商帳戶與手續費折讓的投資者，我希望開啟「券商帳戶與摩擦成本費率管理」彈窗時，畫面能穩定居中固定於視口中央並呈現完整的深色玻璃質感排版，而非因無效樣式類別導致破版或捲動錯位。
2. 作為管理多組外部金融 API 金鑰的使用者，我希望 API 金鑰池管理介面呈現清晰一致的對齊、邊框與按鈕狀態，不再因殘留未安裝的幽靈樣式類別而出現裸露破版元件。
3. 作為檢視年化內部報酬率（XIRR）計算明細的投資者，我希望 XIRR 詳情彈窗具備完整的視口置中遮罩、鍵盤關閉與一致的數值排版，以便快速查核現金流折現細節。
4. 作為操作個股深度投研、財報法醫透視、主 K 全能檢測或健康報告等大型分析彈窗的交易員，我希望彈窗支援固定頁首／頁尾與中段獨立捲動（`flex-fixed`），絕不出現雙重捲軸或標題列被捲出畫面的問題。
5. 作為在分析彈窗內再開啟第二層子彈窗（例如確認視窗或細節檢視）的使用者，我希望按下 `Escape` 鍵時只關閉最上層彈窗，底層主彈窗維持開啟且所有狀態不遺失。
6. 作為同時觸發多層彈窗且可能因非同步流程以非後進先出順序關閉其中一層的使用者，我希望只要畫面上仍有任一彈窗開啟，背景主頁面就維持鎖定不捲動；唯有最後一顆彈窗完全關閉時，背景捲動才精準恢復。
7. 作為鍵盤重度操作者與無障礙輔助工具使用者，我希望彈窗開啟時焦點自動進入對話框內，連續按 `Tab` 與 `Shift+Tab` 只在該彈窗內循環不外洩至背景頁面；關閉彈窗後焦點自動精準回到原本觸發開啟的按鈕。
8. 作為正在填寫交易紀錄、編輯券商費率、設定 CSV 欄位映射或校準宏觀參數的使用者，當表單已有未儲存修改時，若我不慎點擊外部遮罩或按下 `Escape` 鍵，我希望彈窗在內部顯示非阻塞的二次確認提示（「繼續編輯」或「放棄變更並關閉」），保護我辛苦輸入的資料不被誤關蒸發。
9. 作為執行檔案匯入、除權息掃描或資料庫匯出等不可中斷作業的使用者，我希望當彈窗處於硬鎖定（`closeLocked`）狀態時，點擊遮罩與按下 `Escape` 均被穩定阻擋，且鎖定狀態切換時不會造成畫面閃爍或事件監聽異常。
10. 作為匯出 E2EE 零知識加密備份的隱私重視型使用者，我希望透過具密碼遮罩（`type="password"`）與雙次輸入比對的專屬彈窗設定主密碼，杜絕螢幕明文裸露與瀏覽器原生阻塞對話框。
11. 作為還原 `.e2ee.json` 加密備份的使用者，我希望在受遮罩保護的專屬密碼彈窗中輸入解密主密碼，輸入錯誤時能於原流程優雅提示重試，且彈窗卸載後密碼字串立即自元件狀態清零。
12. 作為在戰情室、現金帳本、設定中心或同步狀態徽章中點開內嵌詳情對話框的使用者，我希望所有阻斷式彈窗皆透過 `document.body` Portal 渲染，徹底免受父層毛玻璃濾鏡或 `transform` 層疊上下文裁切與遮擋。
13. 作為在彈窗內部將游標移至專有名詞提示（Floating Tooltip）的使用者，我希望一般頁面上的 Tooltip 位於彈窗遮罩下方不穿透，且語意層級清晰分離不互相干擾。
14. 作為維護程式碼庫的工程師，我希望移除零外部引用的舊版匯入彈窗死碼，避免後續開發者誤改或誤接廢棄元件。
15. 作為負責品質把關的架構師，我希望在 CI 靜態架構守門中建立自動化紅線，一旦有人新增未透過核心彈窗原語掛載的彈窗、誤寫未安裝的幽靈 Tailwind utility class 或呼叫 `window.prompt()`，自動化測試即立刻阻斷合併。
16. 作為專案所有既有功能的使用者，我希望完成 Wave 3 全站彈窗收斂後，所有既有交易記帳、匯入匯出、財報分析、質押壓測與戰情室互動流程維持 100% 正常運作且零回歸。

---

## Implementation Decisions

- **決策 1（Viewport Overlay Kernel — 核心彈窗原語升級契約）**：
  - 擴充統一彈窗原語之公開介面與底層運行時，維持零外部依賴並 100% 向後相容既有呼叫端：
    ```ts
    export type ModalLayoutMode = 'scroll' | 'flex-fixed';
    export type ModalLayer = 'base' | 'nested' | 'critical';

    export interface ModalShellProps {
      isOpen: boolean;
      onClose: () => void;
      closeLocked?: boolean;
      dirty?: boolean;
      onBeforeClose?: () => boolean;
      layout?: ModalLayoutMode;   // 預設 'scroll'；固定 Header/Footer 彈窗採 'flex-fixed'
      layer?: ModalLayer;         // 預設 'base' (1000)；巢狀 'nested' (1100)；關鍵資安 'critical' (1200)
      maxWidth?: string;
      padding?: string;
      ariaLabelledBy?: string;
      ariaLabel?: string;
      children?: React.ReactNode;
    }
    ```
  - **堆疊頂層仲裁（Stack-Top Arbitration）**：於原語模組維護輕量順序堆疊 `overlayStack: symbol[]`。每顆開啟中的彈窗註冊唯一 `symbol` 識別碼；僅當自身位於堆疊頂端（`overlayStack[overlayStack.length - 1] === id`）時才響應 `Escape` 鍵，徹底杜絕多層彈窗同步連環關閉。
  - **引用計數捲動鎖帳本（Scroll Lock Ledger）**：以模組級 `Set<symbol>` 追蹤活躍鎖；僅於集合大小自 `0 → 1` 時記錄並凍結 `document.body.style.overflow = 'hidden'`，於 `1 → 0` 時無損還原原始值，徹底免疫非 LIFO 卸載競態。
  - **生命週期防抖動**：以 `useRef` 穩定保存 `closeLocked`、`dirty`、`onBeforeClose` 與 `onClose` 回呼，將全域事件監聽與捲動鎖的 `useEffect` 依賴嚴格收斂至 `[isOpen]`，消除屬性切換時的反覆拆裝抖動。
  - **零依賴原生焦點陷阱與焦點復原**：開啟時記錄觸發元素（`document.activeElement`）並將焦點移入對話框首個可聚焦元件（無子聚焦點時聚焦對話框本身 `tabIndex={-1}`）；監聽 `Tab` / `Shift+Tab` 於對話框可聚焦邊界首尾循環；卸載時僅於原觸發元素仍掛載於文件樹（`isConnected`）時執行 `.focus()` 復原。
  - **非阻塞髒表單護欄（Inline Dirty-Guard Banner）**：當 `dirty === true`（或 `onBeforeClose()` 回傳 `false`）且使用者嘗試透過 `Escape` 或點擊遮罩關閉時，阻斷立即關閉並於彈窗頂部／底部渲染內聯二次確認警示條（提供「繼續編輯」與「放棄變更並關閉」按鈕），不呼叫任何原生 `window.confirm()`。

- **決策 2（分層 Z-Index 設計 Token 與領域邊界定錨）**：
  - 於全域樣式表確立單一分層 `z-index` 語意 Token 階梯：`--z-tooltip: 950` < `--z-modal-base: 1000` < `--z-modal-nested: 1100` < `--z-modal-critical: 1200`。
  - 明確區分領域概念：**阻斷式對話框（Modal Overlay）** 必須經由統一彈窗原語傳送至視口頂層並受堆疊仲裁；**非阻斷浮動提示（Floating Tooltip）** 屬資訊氣泡，不納入彈窗堆疊。
  - 樣式表針對 `flex-fixed` 版面模式提供對應容器規則（`display: flex; flex-direction: column; overflow: hidden`），交由內部區塊自行控制捲動區，徹底根治雙捲軸問題。

- **決策 3（E2EE 遮罩密碼輸入原語與死碼清除）**：
  - 建立專屬遮罩密碼對話原語（掛載於 `ModalShell` `layer="critical"`），支援兩種模式：`setup`（設定主密碼＋二次確認輸入＋一致性檢核，用於 E2EE 備份匯出）與 `unlock`（單次主密碼輸入，用於 `.e2ee.json` 備份解密匯入）。
  - 密碼欄位一律採 `type="password"`、`autoComplete="new-password"`（可選切換明暗文眼睛按鈕），並於送出、取消或卸載時立即清空本地字串狀態。
  - 設定工作區移除全部 3 處 `window.prompt()`，改以非同步 Promise 或受控狀態串接新密碼原語，保持既有加密格式與解密相容性 100% 不變。
  - 物理刪除零外部引用之舊版匯入彈窗檔案。

- **決策 4（75 處幽靈 Tailwind 根除與 23 顆有效彈窗分批收斂）**：
  - 將券商帳戶管理、API 金鑰池管理與 XIRR 詳情之全部 75 處未安裝 Tailwind utility class 替換為專案既有語意 CSS 與設計系統暗色玻璃 Token，確保排版、間距、配色與對比度完全對齊主介面。
  - 全站 18 顆獨立彈窗與 5 處內嵌阻斷式彈窗全面收斂至核心彈窗原語：
    - 固定頁首／頁尾之大型分析與管理彈窗統一宣告 `layout="flex-fixed"`。
    - 交易紀錄、券商編輯、CSV 匯入、宏觀校準與深度投研等可編輯表單接通 `dirty` 髒狀態防誤關護欄。
    - 觸及檔案中順手汰換不必要的原生 `alert()`（改用既有 Toast 通知），但不跨模組擴張至全倉未觸及檔案之其餘 `confirm/alert`。

- **決策 5（CI 架構適應度靜態守門棘輪升級）**：
  - 於架構適應度靜態守門測試新增三道不可逆不變量（不變量 12–14）：
    - **不變量 12**：全站所有非測試、非核心原語本身之 `*Modal*.tsx` 檔案，必須引用並透過 `ModalShell` 掛載，且不得直接手寫裸 `.modal-overlay` 或 `fixed inset-0`。
    - **不變量 13**：全前端非測試 `.tsx` 元件禁止殘留已盤點之未安裝幽靈 Tailwind 佈局與色票類別（如 `fixed inset-0`、`bg-slate-*`、`text-slate-*`、`border-slate-*`、`backdrop-blur-sm` 等無定義類別）。
    - **不變量 14**：全前端非測試原始碼嚴禁出現任何 `window.prompt(` 或裸 `prompt(` 呼叫。

---

## Testing Decisions

所有測試嚴格鎖定公開介面縫隙（Test Seams），僅驗證外部可觀測的 DOM 語意、鍵盤／滑鼠互動與靜態架構不變量，絕不耦合內部私有狀態或實作細節：

- **Seam 1（核心彈窗原語行為契約 — 既有核心縫隙擴充）**：
  - 擴充 `ModalShell` 既有元件測試，驗證：(a) `layout="scroll"` 與 `layout="flex-fixed"` 輸出對應版面結構；(b) 巢狀開啟彈窗 A 與 B，按 `Escape` 僅關閉 B 不關閉 A；(c) 非 LIFO 關閉順序（先關 A 再關 B）下 `document.body.style.overflow` 於 A 關閉後仍為 `hidden`，直到 B 關閉才精準還原；(d) `closeLocked` 動態切換不觸發捲動鎖遺漏；(e) `Tab` / `Shift+Tab` 焦點循環與關閉後焦點復原；(f) `dirty={true}` 攔截遮罩／`Escape` 並呈現內聯二次確認條，點「放棄關閉」才真正呼叫 `onClose`。
- **Seam 2（E2EE 遮罩密碼原語與加密還原閉環契約）**：
  - 針對新密碼原語建立行為測試，覆蓋 `setup` 模式密碼不一致阻擋、遮罩切換、提交回傳與卸載清零、`unlock` 模式密碼傳遞與取消回呼；並驗證設定工作區匯出／匯入 E2EE 備份流程不呼叫 `window.prompt` 且加解密往返與既有格式 100% 相容。
- **Seam 3（幽靈 CSS 根除與關鍵遷移彈窗冒煙契約）**：
  - 針對重構幅度最大之核心彈窗（券商管理、API 金鑰池、XIRR 詳情、交易表單、深度投研、財報法醫）於公開介面驗證：`role="dialog"` + `aria-modal="true"` 存在、渲染於 `document.body` Portal、`Escape` 關閉或髒表單攔截生效、核心送出動作零回歸。
- **Seam 4（CI 靜態架構適應度守門 — 既有守門縫隙升級）**：
  - 擴充既有靜態守門測試套件加入不變量 12、13、14，以檔案系統掃描確保全站 0 幽靈 Tailwind、0 `window.prompt`、100% `*Modal*.tsx` 經 `ModalShell` 掛載且舊版匯入死碼已物理移除。
- **既有測試參考（Prior Art）**：
  - 比照既有 `ModalShell.test.tsx` 與 `architecturalFitnessGuard.test.ts` 之測試風格與斷言模式，確保全量前端測試、後端測試、TypeScript Strict 編譯與文檔完整性稽核 100% 綠燈通過。

---

## Out of Scope

- **Wave 4（`Spec 0251`）**：[Debt 0046](../debts/0046-centralized-key-vault-and-nas-proxy-mesh.md) 與 [Debt 0069](../debts/0069-isolated-vault-auth-boundary-and-frontend-perf-storage.md)（獨立加密 `vault.db`、NAS 認證邊界、前端 `React.lazy` Code-Splitting 與儲存競態修復）。
- **全倉其餘非敏感 `window.confirm()` / `window.alert()` 一次清零**：除本次觸及之檔案順手改善外，全倉未觸及模組中剩餘之非密碼類原生確認／提示對話框不強制於本期改寫為全域 Confirm Provider（避免過度擴張變更半徑）。
- **安裝 Tailwind CSS 或引入第三方彈窗／Focus-Trap 套件**：本專案維持零外部 UI 框架依賴之 KISS 原則。
- **非阻斷浮動提示元件（`TermTooltip`）改寫為彈窗**：僅透過分層 `z-index` Token 確立層級隔離，不將 Tooltip 強行塞入 `ModalShell`。

---

## Further Notes

- **關聯 GitHub Issue**：`#615`；對應架構決策：將於實作交付閉環建立 `ADR 0250` 並同步更新 `CONTEXT.md` 領域術語（`Viewport Overlay Kernel`、`Stack-Top Arbitration`、`Scroll Lock Ledger`、`Modal Overlay vs. Floating Tooltip`）。
- **清償債務項目**：[Debt 0068](../debts/0068-ghost-tailwind-modalshell-hardening-and-e2ee-prompt.md) 與 [Debt 0063](../debts/0063-legacy-modals-portal-shell-migration.md)（完成合併後於技術債看板標記為 `RESOLVED`）。
