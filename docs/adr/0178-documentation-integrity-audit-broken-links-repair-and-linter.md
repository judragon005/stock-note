# ADR 0178: 專案全量文檔完整性稽核、死鏈修復與自動化守門機制架構

## 狀態
已採納 (Accepted) - 2026-10-13

## 關聯規格
- [Spec 0178: 專案全量文檔完整性稽核、死鏈全數修復、變更日誌補齊與自動化守門機制規格書](file:///d:/APP/股票紀錄/docs/specs/0178-documentation-integrity-audit-broken-links-repair-and-linter-spec.md)
- Issue #220

## 背景與痛點
專案自 V1.0 至 V8.89.0 經歷 170+ 次迭代，因缺乏自動化文件驗證機制，導致：
1. 歷史跳號斷層：0153 序號因 Issue #135 待開發而中斷。
2. 架構決策漏產：Spec 0175 缺乏對應 ADR 0175。
3. 目錄割裂：誤建 `docs/handover/` 存放孤立文件。
4. 全域超連結壞死：交接手冊與多篇文檔存在檔名錯位與相對路徑不合規（如缺 `../../`）。
5. CHANGELOG 停更：自 V5.9.0 停更近百個版本。

## 決策核心架構

### 1. 補齊歷史斷層與目錄去重
- 對齊 Issue #135 建立 `Spec 0153` 與 `ADR 0153` 規劃占位，接合序號。
- 補建 `ADR 0175` 與 `.scratch/v8.87/` 鏡像。
- 將 `docs/handover/` (0069~0071) 遷回 `docs/handoff/` 並清除冗餘目錄。
- 根目錄備份 JSON 收斂至 `docs/json/`，並補齊根目錄 `LICENSE` (MIT)。

### 2. 規範化命名與死鏈全面清零
- Spec 0171 重新命名為規範之 `-spec.md`。
- 修復交接總手冊、`CONTEXT.md`、Spec 0151/0152 與 `docs/debts/` 內所有損壞之相對路徑。

### 3. CHANGELOG.md 里程碑復甦
- 於 `CHANGELOG.md` 補齊 V6.0.0 至 V8.89.0 重大演進紀錄。

### 4. 建立零依賴自動化守門腳本 (`scripts/verify-docs.cjs`)
- 開發純 Node.js 文檔驗證器，檢驗死鏈、Spec/ADR 1:1 成對性與命名規範。
- 註冊 `package.json` 的 `npm run lint:docs`，讓文檔檢查納入開發驗證流程。
