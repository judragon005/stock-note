# v8.24.0 交接手冊：肌肉書僮風益比硬門檻 (R:R >= 2.0)、帶寬方向確立與無效代碼防護架構 (HANDOFF)

## 1. 本次迭代完成摘要 (Executive Summary)

- **核心目標**：
  1. 優先呈現風益比大於 2.0 的優質買進標的，杜絕如 1599 宏佳騰向上利潤僅 $0.1 元、風益比僅 0.1R 的雞肋買點被誤判為 `BUY`。
  2. 建立帶寬極致壓縮（$\le 8\%$）與 20MA 下彎蓋頭反壓之方向確定性審查，方向未明或反壓沉重時強制標記為 `AVOID`。
  3. 建立自訂觀察池股票代碼存在性驗證閘門，阻擋幽靈股票（如 3175），並於初始化時自動清理歷史殘留無效代碼。
- **成果數據**：
  - 突破箱頂與破底翻買點全面加入 $R:R \ge 2.0$ 硬門檻，小於 2.0R 者自動降級為 `HOLD`（觀望待變）並提示向上空間狹窄。
  - 導航儀買進推薦池依風益比數值降序排列（高風益比 5.3R ➔ 3.2R ➔ 2.1R 置頂呈現），且 $\ge 2.0R$ 標記金色火焰高光 `🔥 風益比: 1:XR`。
  - 全專案 57 個測試套件、646 個單元測試 100% 綠燈通過。
  - `npm run build` TypeScript 型別檢查 0 錯誤，打包構建成功。

---

## 2. 關鍵架構與代碼變更清單 (File Changes)

1. **`src/engine/muscleBookerEngine.ts`**：
   - 在 `MuscleBookerActionDecision` 擴充 `riskRewardRatioValue?: number`。
   - 帶寬極致壓縮（$\le 8\%$）前置判定為 `AVOID`（方向未明，嚴禁猜測押注）。
   - 均線 20MA 下彎蓋頭反壓前置判定為 `AVOID`（均線蓋頭，反壓沉重）。
   - 突破箱頂與破底翻買點加入風益比硬門檻：$R:R < 2.0$ 自動降級為 `HOLD`（觀望待變），主理由標示向上空間狹窄與風益比數值；僅在 $R:R \ge 2.0$ 時給予 `BUY`。
2. **`src/components/MuscleBookerWorkspace.tsx`**：
   - 導航儀買進標的依 `riskRewardRatioValue` 降序排列，優先推薦高利潤空間標的。
   - 買進卡片中對風益比 $\ge 2.0R$ 顯示金色高光標籤 `🔥 風益比: 1:XR`。
   - `handleAddCustomSymbol` 增加股票代碼字典比對與遠端即時探測，查無行情時嚴格阻擋並彈出警告。
   - 元件掛載時自動清理 LocalStorage 歷史殘留無效代碼（`3175`）。
3. **`src/components/MuscleBookerWorkspace.test.ts`**：
   - 新增測試：風益比不足 2.0R 時自動降級為 HOLD 測試。
   - 新增測試：買進標的清單依風益比數值降序排序測試。
   - 調整既有突破測試數據為剛突破箱頂（風益比 $\ge 2.0$）之真實情境。

---

## 3. 測試與驗證指標 (Verification & TDD)

- 單元測試指令：`npm test`（57 passed, 646 passed, 0 failed）
- 打包構建指令：`npm run build`（tsc 0 錯誤，Vite build 成功）

---

## 4. 關聯文檔

- 規格書：[`docs/specs/0105-muscle-booker-risk-reward-bandwidth-direction-gate-spec.md`](docs/specs/0105-muscle-booker-risk-reward-bandwidth-direction-gate-spec.md)
- 架構決策：[`docs/adr/0105-muscle-booker-risk-reward-bandwidth-direction-gate.md`](docs/adr/0105-muscle-booker-risk-reward-bandwidth-direction-gate.md)
- 本地票券：[`.scratch/v8.24.0-muscle-booker-risk-reward-bandwidth-direction-gate/issues/`](.scratch/v8.24.0-muscle-booker-risk-reward-bandwidth-direction-gate/issues/)
