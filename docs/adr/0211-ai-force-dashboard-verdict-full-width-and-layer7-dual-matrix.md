# ADR 0211: 主力戰情室 Layer 7 作戰決策雙欄對稱重組與 Card 18 終極作戰指南 100% 滿版橫幅架構 (AiForce Verdict Deck Full Width and Layer 7 Dual Matrix)

- **狀態 (Status)**: 已接受 (Accepted)
- **日期 (Date)**: 2026-10-31
- **關聯規格 (Spec)**: [docs/specs/0211-ai-force-dashboard-verdict-full-width-and-layer7-dual-matrix-spec.md](file:///d:/APP/股票紀錄/docs/specs/0211-ai-force-dashboard-verdict-full-width-and-layer7-dual-matrix-spec.md)
- **關聯 Issue**: Issue #362

---

## 背景與問題陳述 (Context & Problem Statement)

在先前主力戰情室的 Bento-Grid 排版架構中，Layer 7（作戰指令層）採用 3 欄並列設計：
- 欄 1: Card 15 (籌碼摘要) + Card 09 (隔日沖風險)
- 欄 2: Card 11 (健康度評估) + Card 16 (買賣力分布) + Card 17 (多空強度)
- 欄 3: Card 18 (主力追蹤總評判 / MLP-AI 作戰命令與操盤指南)

在實戰交易看盤體驗中，該結構存在三大缺陷：
1. **最高層級總評判空間被大幅壓縮**：Card 18 包含 5 態光譜、微觀語意、Playbook 點位防守（停損價、目標價、風報比、失效門檻）及 250 日 AI 量能結論，身為全戰情室總結性決策中樞，卻被困在三分之一欄寬中，垂直高度過長且文字擠壓。
2. **Card 11 五維體質環狀圖受限**：Card 11 擠在三分之一欄位中，圓環圖與下方百分比數值間距吃緊。
3. **資訊流判讀順序斷裂**：微觀籌碼與多空強度分散在左右兩小欄，未能依「**微觀籌碼動向 ➔ 結構體質定錨 ➔ 終極操盤兵棋推演**」的交易心理順序平滑收斂。

---

## 決策核心 (Decision Drivers)

- **第一性原理與交易心理學**：由微觀（法人真金白銀進出）引導至結構（健康體質與多空量能），最後由 100% 滿版獨立列提供總裁級作戰指令與明確執行點位。
- **KISS 原則與視覺平衡**：避免硬性拆分三欄導致高度參差不齊；採用雙欄對稱矩陣（Layer 7）搭配獨立全寬大視野（Layer 8），佈局大氣舒展且完全響應式相容。
- **零破壞性更新 (Zero Regressions)**：保留各卡片既有業務邏輯與數值合約，僅對視覺容器層與滿版響應式內部佈局進行極致優化。

---

## 架構變更 (Architecture Changes)

### 1. 拆分 Layer 7 為「雙欄對稱矩陣」與「Layer 8 滿版指令旗艦列」 (`AiForceDashboardView.tsx`)
- **`data-layer="7-chips-health-matrix"`**：
  - 左欄：Card 15 + Card 09（微觀籌碼動向與短線防護）。
  - 右欄：Card 11 + 下方橫展 Card 16 與 Card 17（結構健康度與多空對抗），Card 11 圓環圖表 100% 零疊字。
- **`data-layer="8-main-force-verdict-deck"`**：
  - Card 18 享有如頂部 Card 01（KLine 全盤態勢圖）般的 100% 滿版獨立寬幅。

### 2. Card 18 滿版內部佈局自適應橫展 (`MainForceVerdictCard.tsx`)
- 5 態主力作戰光譜導覽條全寬舒展。
- 中央區域升級為自適應網格 `data-testid="verdict-central-grid"`：
  - 寬螢幕下將「語意微觀解析 (Market Context)」與「實戰操盤指引 (Action Playbook)」橫向左右雙欄展開。
  - 防守停損價、目標價、風報比與紅色失效門檻框更醒目大器，大幅提升實戰反應速度。

---

## 驗證與結果 (Verification & Outcomes)

- 單元測試 `AiForceDashboardView.test.tsx` 擴充至 8 層階層架構測試，驗證 `data-layer="7-chips-health-matrix"` 與 `data-layer="8-main-force-verdict-deck"` 順序正確。
- `MainForceVerdictCard.test.ts` 驗證自適應雙欄中央網格容器與向後相容性，全部單元測試 100% 綠燈通過。
- `npm run build` TypeScript 0 錯誤順利產出生產包。
