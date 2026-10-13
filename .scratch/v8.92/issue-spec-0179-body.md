### 關聯規格與架構決策
- 規格書：[docs/specs/0179-tdcc-card-stale-state-repair-and-dynamic-signals-multi-perspective-refactor-spec.md](docs/specs/0179-tdcc-card-stale-state-repair-and-dynamic-signals-multi-perspective-refactor-spec.md)
- ADR：[docs/adr/0179-tdcc-card-stale-state-repair-and-dynamic-signals-multi-perspective.md](docs/adr/0179-tdcc-card-stale-state-repair-and-dynamic-signals-multi-perspective.md)
- 本地票券鏡像：`.scratch/v8.92/issues/` (Ticket 01 ~ Ticket 05)

### 需求背景與問題痛點
1. **Card 19 (TDCC 集保千張大戶趨勢) 換股時數據停滯卡死**：
   - 使用者在搜尋列輸入新個別股票時，Card 19 畫面依然停留在上一檔個股（如 `2344` 華邦電）。
   - 根因為 React 節點缺乏 `key={symbol}` 鍵值綁定，且切換標的時未及時洗淨上一檔之待命狀態；若新標的本地湖倉缺乏 TDCC 數據，既有日 K 降級管線未能補齊 TDCC 記錄。
2. **Card 12 (AI 動態信號判斷) 過於陽春簡陋且燈號硬編碼**：
   - 底部「紅燈」被寫死為純文字與靜態色碼，未能真實連動量化多因子結論。
   - 缺乏金融專業多重視角：未整合交易所監理處置、券商融資維持率斷頭警戒、法人多因子權重及 VWAP 成本標準差，散戶亦無法理解「破線偏空卻籌碼集中」的多空矛盾。

### 核心變更與任務規劃
- [ ] **Ticket 01**：Card 19 生命週期修復、鍵值綁定重置與美股 Honest Empty State (`AiForceDashboardView.tsx`, `TdccDistributionCard.tsx`)
- [ ] **Ticket 02**：擴充 DynamicSignalsData 領域型別與多因子量化評分純函式 ($0.35\text{籌碼} + 0.3\text{趨勢} + 0.2\text{動能} - 0.15\text{風險}$) (`aiForceDashboardEngine.ts`)
- [ ] **Ticket 03**：多空矛盾智能仲裁演算法與四重視角整合（識別洗盤破底翻等四大型態，整合處置與融資警戒） (`aiForceDashboardEngine.ts`)
- [ ] **Ticket 04**：Card 12 UI 重構、動態呼吸燈號與 Bento 結構 (`DynamicSignalsCard.tsx`)
- [ ] **Ticket 05**：全量迴歸測試、TypeScript 健全性與文檔完整性驗證

### 驗收標準 (AC)
- [ ] AC 1: Card 19 切換標的即時卸載與重置，杜絕舊數據殘留。
- [ ] AC 2: Card 19 美股與無數據標的呈現合規 Honest Empty State。
- [ ] AC 3: Card 12 徹底廢除硬編碼純紅燈，依綜合量化分動態連動綠/黃/紅三色呼吸光暈。
- [ ] AC 4: Card 12 整合交易所處置狀態與券商融資風控標籤。
- [ ] AC 5: Card 12 支援多空矛盾智能仲裁（如破線偏空+籌碼集中 ➔ 洗盤破底翻觀察區與白話指引）。
- [ ] AC 6: 單元測試 100% 通過，構建無 TypeScript 錯誤，文檔零死鏈。
