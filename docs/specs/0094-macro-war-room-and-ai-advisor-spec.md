# 需求規格說明書 (PRD) - 0094: 宏觀戰情室、全球流動性監控與 AI 智慧每日操作決策儀表板

## 1. 概述 (Overview)

### 1.1 背景與實戰痛點 (Context & Problem Statement)
目前系統已具備極高精度的微觀交易會計功能（雙軌記帳、現金帳本、質押維持率、在途交割、資產再平衡與黑天鵝壓力測試矩陣），但投資人在真實市場中仍面臨重大盲區：
1. **「只見樹木，不見森林」的宏觀視角缺失**：
   - 使用者登入系統後能清楚看見個人帳面損益，但無法一覽當前總體經濟景氣循環位階、全球流動性水龍頭放水/緊縮、跨資產風險偏好與市場極端恐慌度。
2. **缺乏宏觀大盤與個人防禦力的交叉診斷**：
   - 當市場暴跌時，投資人往往因不知自身現金防守深度與維持率安全裕度而產生恐慌殺跌；而在市場狂熱時，又常因忽視利率倒掛與高估值風險而盲目追高。
3. **缺乏客觀且防幻覺的 AI 每日作戰方針**：
   - 投資人需要每日一句話的客觀指引：「今日市場處於何種位階？我的組合該防禦、該低接、還是該維持紀律？」。
   - 若純粹仰賴外部 LLM，存在網路延遲、API 成本與金融建議幻覺風險；必須採用「100% 離線確定性專家規則系統 + 頂層可選 LLM 深度分析」之雙軌架構。

### 1.2 系統目標 (Goals & Non-Goals)
- **Goals**：
  1. 定義「宏觀戰情室核心指標數據模型」，涵蓋美債利率與倒掛、全球流動性（M2 / 美元指數）、大宗商品（黃金 / 原油）、市場情緒（VIX / 恐慌與貪婪指數）與關鍵財經事件倒數。
  2. 建立「個人投資組合宏觀防護盾 (Portfolio Macro Shield)」交叉診斷模型，即時計算現金購買力比率、質押維持率健康度、組合 Beta 與資產配置最大偏離度。
  3. 實作「雙軌制 AI 智慧作戰方針引擎 (AI Strategy Advisor Engine)」：
     - **軌道一（離線確定性專家矩陣）**：基於 VIX 水位、美債殖利率趨勢、個人現金水位與質押維持率交叉評分，100% 離線即時輸出四字定調（如 `【防禦蓄勢・分批低接】`、`【獲利調節・提高現金】`、`【安全巡航・維持紀律】`、`【極端避險・全面防禦】`）與客觀風控指引。
     - **軌道二（可選 LLM 結構化提示詞載荷）**：生成包含宏觀、持倉體質與財經行事曆之標準 JSON Payload，支援未來接入 Gemini / Claude API。
  4. 內建重要財經催化劑日曆計算（FOMC、美國 CPI、非農、台灣央行理監事會議等）。
- **Non-Goals**：
  - 本模組不提供非法報牌或個股買賣保證，所有建言均基於總體經濟學與資產配置防禦原則。

---

## 2. 核心架構與數學模型 (Architecture & Heuristics)

### 2.1 宏觀指標標準化與情緒等級
- **VIX 恐慌位階分級**：
  - `EUPHORIA` (貪婪鈍化)：$\text{VIX} < 15$
  - `NORMAL` (常態平穩)：$15 \le \text{VIX} \le 22$
  - `ELEVATED` (警戒升溫)：$22 < \text{VIX} \le 30$
  - `PANIC` (極度恐慌)：$\text{VIX} > 30$
- **美債殖利率倒掛 (Yield Curve Inversion)**：
  - $\text{Spread} = 10Y - 2Y$
  - 若 $\text{Spread} < 0$：標記為「殖利率曲線倒掛（衰退領先預警）」。
- **恐慌與貪婪等級 (Fear & Greed Level)**：
  - 0~25：極度恐慌 (Extreme Fear)
  - 26~45：恐慌 (Fear)
  - 46~55：中立 (Neutral)
  - 56~75：貪婪 (Greed)
  - 76~100：極度貪婪 (Extreme Greed)

### 2.2 個人組合宏觀防護盾 (Portfolio Macro Shield)
- **現金購買力防禦水位**：$\text{CashRatio} = \frac{\text{CashBalance}}{\text{NAV}} \times 100\%$
  - 判定：$<10\%$ 緊繃；$10\% \sim 30\%$ 充裕；$>30\%$ 超強防禦。
- **質押借貸槓桿維持率**：$\text{MarginRatio} = \frac{\text{CollateralValue}}{\text{TotalLoan}} \times 100\%$
  - 判定：$<140\%$ 高度警戒；$140\% \sim 166\%$ 警戒；$\ge 166\%$ 安全。
- **資產配置最大偏離度**：$\text{MaxDrift} = \max_{i} |\text{ActualWeight}_i - \text{TargetWeight}_i|$

### 2.3 離線確定性專家系統決策矩陣 (Deterministic Expert Matrix)
決策引擎綜合考量 4 大維度：
1. **市場情緒環境 (Market Sentiment)**：恐慌 vs 亢奮
2. **現金防禦彈藥 (Cash Ammo)**：充裕 vs 匱乏
3. **借貸槓桿風險 (Leverage Risk)**：安全 vs 警戒
4. **資產配置失衡度 (Drift Risk)**：平衡 vs 嚴重偏離

**規則決策表（部分代表性矩陣）**：
- **情境 A（極度恐慌 + 現金充裕 + 槓桿安全）**：
  - 四字定調：`【防禦蓄勢・分批低接】`
  - 方針指引：市場處於非理性恐慌，個人防禦護城河穩固，可利用閒置現金針對低配的核心 ETF 執行金字塔式逢低分批布局，嚴禁一次性孤注一擲。
- **情境 B（極度恐慌 + 現金不足 / 槓桿警戒）**：
  - 四字定調：`【極端避險・嚴守防線】`
  - 方針指引：市場風暴肆虐且帳戶槓桿或現金告急，首要任務為保全本金，停止任何加碼，優先降槓桿或補繳現金確保質押合約遠離追繳線。
- **情境 C（市場狂熱亢奮 + 偏離度過大）**：
  - 四字定調：`【獲利調節・拉高現金】`
  - 方針指引：市場情緒過熱鈍化，超配標的獲利豐厚，建議啟動再平衡部分停利，回收現金儲備未來彈藥。
- **情境 D（常態平穩行情）**：
  - 四字定調：`【安全巡航・維持紀律】`
  - 方針指引：總經環境與市場波動處於常態中樞，個人投資組合運行健康，維持定期定額與資產配置紀律。

---

## 3. 資料結構 (Data Contracts)

```typescript
// 宏觀指標快照
export interface MacroIndicatorSnapshot {
  date: string;               // YYYY-MM-DD
  us10y: number;              // 10Y 美債利率 % (如 3.85)
  us2y: number;               // 2Y 美債利率 % (如 4.00)
  yieldSpread: number;        // 殖利率利差 (10Y - 2Y)
  isYieldInverted: boolean;   // 是否倒掛
  vix: number;                // 恐慌指數
  vixLevel: 'EUPHORIA' | 'NORMAL' | 'ELEVATED' | 'PANIC';
  fearAndGreedIndex: number;  // 恐慌貪婪指數 (0~100)
  goldPrice: number;          // 黃金期貨價格 (USD/oz)
  oilPrice: number;           // 原油期貨價格 (USD/bbl)
  dxy: number;                // 美元指數 (如 101.2)
  usdToTwd: number;           // 美元兌台幣匯率
  usM2GrowthYoY?: number;     // 美國 M2 年增率 %
  twM2GrowthYoY?: number;     // 台灣 M2 年增率 %
  updatedAt: number;
}

// 個人投資組合宏觀防護盾
export interface MacroPortfolioShield {
  totalNavTWD: number;
  cashBalanceTWD: number;
  cashRatioPercent: number;
  cashStatus: 'TIGHT' | 'ADEQUATE' | 'STRONG';
  hasLoans: boolean;
  marginMaintenanceRatio: number;
  marginStatus: 'SAFE' | 'WARNING' | 'MARGIN_CALL';
  maxAllocationDriftPercent: number;
  portfolioBeta?: number;
}

// 關鍵財經事件
export interface UpcomingCatalyst {
  id: string;
  name: string;
  date: string;               // YYYY-MM-DD
  daysLeft: number;
  category: 'CENTRAL_BANK' | 'INFLATION' | 'EMPLOYMENT' | 'EARNINGS';
  description: string;
}

// AI 智慧每日作戰方針
export interface AiMorningBriefDirective {
  headline: string;           // 四字定調 (例如 "【防禦蓄勢・分批低接】")
  tone: 'DEFENSIVE' | 'OPPORTUNISTIC' | 'NEUTRAL' | 'CAUTION';
  summary: string;            // 一句話精準總結
  actionPoints: string[];     // 今日具體執行要點 (3~4 點)
  macroDiagnosis: string;     // 宏觀環境診斷解讀
  shieldDiagnosis: string;    // 個人防護盾體質診斷
  llmPayloadJson: string;     // 供可選 LLM 呼叫之結構化 JSON 字串
}
```

---

## 4. 驗收標準 (Acceptance Criteria)

1. **離線規則專家系統 100% 可用**：在無網路與未設定 LLM API Key 情況下，根據宏觀快照與個人防護盾數值，精準輸出對應的四字定調與作戰方針，零報錯。
2. **極端情境風控覆蓋**：極度恐慌+低現金時精準命中防禦降槓桿指引；狂熱行情時提示獲利調節；常態時維持紀律。
3. **財經事件倒數精確**：能根據給定基準日正確計算剩餘天數並排除過去事件。
4. **LLM Payload 結構化合規**：輸出的 JSON Payload 語法正確且包含所有必要宏觀與持倉數值。
5. **100% 測試通過**：全專案單元測試無回歸，TypeScript 0 錯誤。
