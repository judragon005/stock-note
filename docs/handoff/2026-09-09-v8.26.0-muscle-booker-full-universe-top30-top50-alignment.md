# v8.26.0 交接手冊：肌肉書僮目標池滿編規格化與名實相符擴充架構 (HANDOFF)

## 1. 本次迭代完成摘要 (Executive Summary)

- **核心目標**：
  徹底解決肌肉書僮動能雷達中，按鈕標示「權值核心 Top 50」底層僅有 20 檔、「台股焦點 Top 30」底層僅有 16 檔的名實不符缺陷。
- **成果數據**：
  - `TW50_BLUE_CHIP_SYMBOLS` 完整擴充至臺灣 50 指數 (0050) 官方全量 **50 檔成分股**。
  - `TW_TOP_30_FOCUS_SYMBOLS` 完整擴充至 **30 檔熱門短線動能與飆股**。
  - `US_MEGA_50_CORE_SYMBOLS` 完整擴充至標普 50 權值巨頭 **50 檔全名單**。
  - `US_TOP_30_FOCUS_SYMBOLS` 完整擴充至美股焦點動能 **30 檔熱門名單**。
  - 全專案 57 個測試套件、650 個單元測試 100% 綠燈通過。
  - `npm run build` TypeScript 型別檢查 0 錯誤，打包構建成功。

---

## 2. 關鍵架構與代碼變更清單 (File Changes)

1. **`src/engine/muscleBookerEngine.ts`**：
   - 將 `TW_TOP_30_FOCUS_SYMBOLS` 補齊至滿編 30 檔。
   - 將 `US_TOP_30_FOCUS_SYMBOLS` 補齊至滿編 30 檔。
   - 將 `TW50_BLUE_CHIP_SYMBOLS` 補齊至滿編 50 檔（納入聯電、長榮、緯創、華碩、大立光、世芯-KY、奇鋐、聯詠、欣興、研華、國巨、緯穎、彰銀等）。
   - 將 `US_MEGA_50_CORE_SYMBOLS` 補齊至滿編 50 檔（納入 BAC, NFLX, CRM, AMD, QCOM, ORCL, INTC, CSCO, TXN, ACN, ADBE 等）。
2. **`src/components/MuscleBookerWorkspace.test.ts`**：
   - 新增滿編目標池常數與 `getScopedUniverseSymbols` 數量驗證單元測試。

---

## 3. 測試與驗證指標 (Verification & TDD)

- 單元測試指令：`npm test`（57 passed, 650 passed, 0 failed）
- 打包構建指令：`npm run build`（tsc 0 錯誤，Vite build 成功）

---

## 4. 關聯文檔

- 規格書：[`docs/specs/0107-muscle-booker-full-universe-top30-top50-alignment-spec.md`](docs/specs/0107-muscle-booker-full-universe-top30-top50-alignment-spec.md)
- 架構決策：[`docs/adr/0107-muscle-booker-full-universe-top30-top50-alignment.md`](docs/adr/0107-muscle-booker-full-universe-top30-top50-alignment.md)
- 本地票券：[`.scratch/v8.26.0-muscle-booker-full-universe-top30-top50-alignment/issues/`](.scratch/v8.26.0-muscle-booker-full-universe-top30-top50-alignment/issues/)
