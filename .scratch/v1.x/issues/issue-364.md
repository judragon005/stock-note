# Issue #364: 優化: Card 18 主力追蹤總評判三欄式司令台佈局、字體大字化與法人部位風控補強

- **狀態 (State)**: OPEN
- **標籤 (Labels)**: `enhancement`, `ready-for-agent`
- **對應分支 (Branch)**: `feature/364-card18-typography-and-trading-desk-layout`
- **關聯 PR (Pull Request)**: PR #365 (`https://github.com/judragon005/stock-note/pull/365`)
- **關聯規格 (Spec)**: `docs/specs/0212-card18-trading-desk-layout-and-risk-management-spec.md`
- **關聯決策 (ADR)**: `docs/adr/0212-card18-trading-desk-layout-and-risk-management.md`

---

## 背景與問題描述

在實盤看盤體驗中，滿版橫幅的 Card 18（主力追蹤總評判）字體過小（多數為 9px~11px），防守停損、目標價與交易指令缺乏視覺重心；底層長文本存在冗餘，且欠缺法人實戰的部位規模（Position Sizing）與清晰的量化點位三聯卡。

## 解決方案與實施範圍
1. **三欄式司令台金融交易桌面**：
   - **左欄**：主力態勢、28px 核心語意大字與 5 態微型作戰光譜條，搭配清晰的因果量價解析。
   - **中欄**：18px Monospace 大字點位三聯看板（防守停損、目標滿足、預估風報比）、預估勝率與收盤/VWAP/乖離膠囊。
   - **右欄**：13.5px 戰術執行指令、綠色高亮法人部位上限 (Position Sizing) 與模型風控失效門檻框。
2. **消除底層冗餘**：移除與中央解析 70% 重複的底部長文本，釋放垂直高度。
3. **測試與品質守門**：
   - `MainForceVerdictCard.test.ts` 新增部位與勝率合約斷言，15 tests 全數通過。
   - `AiForceDashboardView.test.tsx` 6 tests 全數通過。
   - `npm run build` TypeScript 0 錯誤，Vite 打包通過。
   - Pre-push Guard 全量 1,979 tests 綠燈放行。

