# Ticket 05: 實作 aiForceToPromptDigestAdapter 資料轉接器

## 1. 任務目標
在 `src/engine/aiForcePromptAdapter.ts` 建立純函式適配器 `createWarRoomPromptDigest(report: AiForceDashboardReport, holdings?: HoldingPosition[]): StrategicFactDigest`，負責將主力戰情室的 18 張卡片指標與盤中報價，無損且高效地轉譯為提示詞引擎所需的高濃度特徵模型。

## 2. 修改範圍
* 新增檔案：`src/engine/aiForcePromptAdapter.ts`
  - 提取 `report.marketBar` 之當前價、漲跌幅、狀態標籤。
  - 提取 `report.chipsSummary`、`report.bullBearStrength`、`report.tdccDistribution` 等關鍵數值。
  - 計算持股脫敏標籤（`IN_PORTFOLIO` / `PROFIT` / `LOSS`）。

## 3. 實作重點
* 嚴格遵循防禦性編程：處理 `report` 中可能為空陣列或 undefined 的邊界情況，絕不噴出 TypeError。
* 資料時間戳清晰標記（`settledDate` 與 `intradayTime`）。

## 4. 驗收標準 (AC)
- [ ] 能正確將完整的 `AiForceDashboardReport` 映射至 `StrategicFactDigest`。
- [ ] 空報表或初始狀態下具備安全的預設值。
