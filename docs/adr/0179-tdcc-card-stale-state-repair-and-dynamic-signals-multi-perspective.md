# ADR 0179: TDCC 集保卡片狀態殘留修復與 AI 動態信號四重視角全維度重構

## 狀態
已採納 (Accepted) - 2026-10-13

## 關聯規格
- [Spec 0179: TDCC 集保卡片狀態殘留修復與 AI 動態信號四重視角全維度重構規格書](file:///d:/APP/股票紀錄/docs/specs/0179-tdcc-card-stale-state-repair-and-dynamic-signals-multi-perspective-refactor-spec.md)

## 背景與痛點
1. **Card 19 (TDCC 集保千張大戶趨勢) 換股時數據停滯卡死**：
   - 使用者在搜尋列輸入新個別股票時，Card 19 畫面依然停留在上一檔個股（如 `2344` 華邦電）。
   - 根因為 React Virtual DOM 在 `<TdccDistributionCard />` 缺乏 `key={symbol}` 鍵值綁定，且切換標的時未及時洗淨上一檔之快取狀態；若新標的本地湖倉缺乏 TDCC 數據，既有日 K 降級管線未能補齊 TDCC 記錄。
2. **Card 12 (AI 動態信號判斷) 過於陽春簡陋且燈號硬編碼**：
   - 卡片底部之「紅燈」被寫死為純文字與靜態色碼，未能真實連動量化多因子結論。
   - 缺乏金融專業多重視角：未整合交易所監理處置、券商融資維持率斷頭警戒、法人多因子權重及 VWAP 成本標準差，散戶亦無法理解「破線偏空卻籌碼集中」的多空矛盾。

## 決策核心架構

### 1. 鍵值綁定狀態洗淨與生命週期防穿透 (Key-Bound State Sanitization)
- 在 `AiForceDashboardView.tsx` 中為 `TdccDistributionCard` 明確配置 `key={symbol}`，強制 React 在切換股票代碼時銷毀舊實例並重建新實例，徹底消除狀態殘留。
- 在 `loadDataForSymbol` 觸發起點即刻初始化待命空狀態，阻斷非同步延遲造成的視覺凍結。
- 對於美股與新上市個股，實施標準 **Honest Empty State**，嚴禁繪製空白折線或捏造假數據。

### 2. 四重視角全維度信號模型 (Four-Perspective Dynamic Signal Model)
- **交易所層 (Exchange)**：動態整合 `NORMAL`, `ATTENTION`, `DISPOSITION` 監理狀態、集合競價撮合限制（5分/20分盤）與當沖過熱警戒（>60%）。
- **券商風控層 (Broker)**：結合融資增減、融資維持率警戒線（<130% 斷頭追繳預警）與借券賣出異動。
- **法人量化層 (Institutional)**：建立百分制多因子綜合量化評分公式 ($0.35 \times \text{籌碼} + 0.30 \times \text{趨勢} + 0.20 \times \text{動能} - 0.15 \times \text{風險}$)，定錨 20 日 VWAP 法人持倉成本之標準差偏離（$\sigma$ 乖離）。
- **個人行動層 (Retail)**：實作「多空矛盾智能仲裁機制」，為「洗盤破底翻」、「誘多高檔出貨」、「共振主升」與「共振主跌」四大經典型態輸出白話決策解析與關鍵防守支撐價位。

### 3. 動態呼吸呼吸燈號映射 (Dynamic Breathing Verdict Light)
- 淘汰硬編碼紅燈，依據綜合量化總分動態映射：
  - $\ge 60$ 分：綠燈 (偏多/積極)
  - $40 \sim 59$ 分：黃燈 (觀望/中性)
  - $< 40$ 分：紅燈 (高風險/避險)

## 影響與驗收標準
- Card 19 切換標的保證 100% 即時重置，美股展示「美股無集保機制」合法空狀態。
- Card 12 徹底擺脫硬編碼紅燈，全面支援四重視角結構化資訊流與多空矛盾智能仲裁。
- 全套單元測試 100% 通過，符合 KISS 原則與零依賴原則。
