# ADR 0212: Card 18 主力追蹤總評判三欄式司令台佈局、金融大字號點位與法人部位風控升級 (Card 18 Trading Desk Layout and Risk Management)

- **狀態 (Status)**: 已接受 (Accepted)
- **日期 (Date)**: 2026-10-31
- **關聯規格 (Spec)**: [docs/specs/0212-card18-trading-desk-layout-and-risk-management-spec.md](file:///d:/APP/股票紀錄/docs/specs/0212-card18-trading-desk-layout-and-risk-management-spec.md)
- **關聯 Issue**: Issue #364

---

## 背景與問題陳述 (Context & Problem Statement)

在先前實施 ADR 0211 後，Card 18（主力追蹤總評判 / MLP-AI）獲得了 Layer 8 滿版橫幅（100% 寬度）。然而在實盤看盤中，專業投資人與法人回饋了關鍵痛點：
1. **字體過小與可讀性低**：核心關鍵點位（停損價、目標價、風報比）字體僅 10px，交易員與投資人在高解析度螢幕下一眼難以定錨。
2. **資訊冗餘**：最底層的「AI 結論」文字與中央區域的收盤價、VWAP、乖離率以及微觀解析存在 70% 內容重疊，浪費垂直可視空間。
3. **法人實戰風控缺口**：缺少專業操盤室必備的「建議部位上限 (Position Sizing)」與「預估勝率 (Win Rate)」指導。

---

## 決策核心 (Decision Drivers)

- **Bloomberg / TradingView 終端思維**：核心指令與點位必須支援「一秒直覺 (Glance Value)」，消除眼球反覆搜尋成本。
- **KISS 去冗餘原則**：消除最底層重複長文本，將寶貴的像素空間賦予大字體金融等寬卡片。
- **法人風控閉環**：給出具體的資金管理上限（如低接吸籌 30%~40%、鎖碼推升 50%~70%），杜絕散戶一次重倉梭哈。

---

## 架構變更 (Architecture Changes)

### 1. 三欄式「司令台」高解析佈局 (`MainForceVerdictCard.tsx`)
- **左欄 (態勢與進度軸)**：
  - 核心語意加大至 `28px` 高亮發光大字。
  - 緊湊整合「5 態主力作戰光譜條」與操作週期標籤（如 `3~5 日短線波段`）。
  - 下方呈現具備因果量價支撐的「微觀語意解析 (`12.5px`)」。
- **中欄 (點位三聯巨大看板)**：
  - 頂部醒目標示「預估勝率 (68% / 75%)」。
  - 「防守停損」、「目標滿足」、「預估風報比」全面重構為獨立高對比卡片，數值升級至 `18px Monospace` 粗體等寬大字。
  - 底部整合最新收盤價、20日 VWAP 主力成本與乖離率膠囊。
- **右欄 (戰術與法人風控)**：
  - 獨立戰術執行指令卡片（字體加大至 `13.5px`）。
  - 標示綠色高亮「法人部位上限膠囊 (Position Sizing)」防禦過度槓桿。
  - 底部設置醒目的紅色「模型風控失效門檻框」。

---

## 驗證結果 (Verification & Outcomes)

1. **單元測試**：`MainForceVerdictCard.test.ts` (15 tests 通過) 與 `AiForceDashboardView.test.tsx` (6 tests 通過)。
2. **型別與編譯**：`npm run build` TypeScript 0 錯誤，Vite 7.37s 綠燈打包完成。
