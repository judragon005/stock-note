# Ticket 03: Layer 6 & Layer 7 戰情作戰區排版重組與 Card 11 圓環文字疊字修復

## 關聯規格
- Spec: `docs/specs/0174-ai-force-dashboard-visual-master-layout-and-tooltip-spec.md` (3.3 / AC 3.1 ~ 3.3)

## 問題背景
現行 Layer 6 塞入了 5 張卡片（10, 11, 12, 13, 14），導致每張卡片寬度僅約 230px。其中 Card 11（健康度綜合評估表）的 5 個進度圓環下方標籤（籌碼健康度、結構、動能、風險、支撐度）嚴重疊字覆蓋。同時，下一排 Layer 7 中間欄僅有 16 與 17 兩張小卡，而右欄 18 主力評判卡內容極長，導致整排垂直重心下垂失衡。

## 任務細節
1. 修改 `src/components/aiForceDashboard/AiForceDashboardView.tsx`：
   - 將 Card 11（`HealthSummaryCard`）從 Layer 6 移出。
   - Layer 6 保留 4 張卡片（10 AI 多空能量棒、12 AI 動態信號、13 市場情緒、14 AI 信心維度），網格調整為 `repeat(auto-fit, minmax(280px, 1fr))`（桌機 4 欄均分）。
   - Layer 7 中間欄重構為 3 卡垂直矩陣：
     1. `11 健康度綜合評估表 (HealthSummaryCard)`
     2. `16 買賣力分布圖 (ForceDistributionCard)`
     3. `17 多空強度分布 (BullBearStrengthCard)`
   - Layer 7 容器設定 `minHeight: 500px` 與 `alignItems: stretch`。
2. 最佳化 Card 11、16、17 之內距與版面：
   - 微調 Card 11、16、17 之 padding 為 `10px 12px`，在 500px 總高度下三卡均勻分佈。
   - 在 Card 11 中，因中間欄寬度提升至 340px~420px，5 個圓環間距自然拉開，圓環下方標籤文字獨立對齊，徹底消除疊字 Bug。
   - 左欄（15 籌碼摘要 + 09 隔日沖）兩卡平分高度（各約 240px），進度條間距加寬；右欄（18 主力總評判）完整展開無內部滾軸。
3. 更新/補充測試：
   - 驗證 Layer 6 包含 4 卡容器，Layer 7 中間欄包含 3 卡容器。

## 驗收標準
- [x] Layer 6 在桌機端呈現均勻 4 卡矩陣，無排版擁擠。
- [x] Layer 7 中間欄依序呈現「11 ➔ 16 ➔ 17」，Card 11 的 5 個圓環與文字無重疊疊字。
- [x] Layer 7 左右欄高平衡，18 主力評判卡操盤指令完整呈現。

