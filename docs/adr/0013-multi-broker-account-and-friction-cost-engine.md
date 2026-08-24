# ADR-0013: 多券商帳戶架構與交易摩擦成本分析引擎

- **狀態**：ACCEPTED
- **日期**：2026-08-24
- **關聯 PRD**：[SPEC-0013: V3.0 多券商帳戶管理體系與交易摩擦成本深度分析中心](../specs/0013-multi-broker-account-and-friction-cost-engine.md)

---

## 1. 背景與脈絡 (Context)

傳統證券投資記帳工具通常僅將資產視為單一資金池，使用全域統一的手續費與稅率設定。然而現代投資人實務上普遍開立多家台股券商（享受不同折讓率與定期定額低消）及複委託/海外券商。

若缺乏多帳戶體系與交易摩擦成本分析：
1. 無法精確按不同券商獨立核對在倉庫存淨現值。
2. 無法透視交易頻率所產生的摩擦成本（手續費、證券交易稅、複委託抽成）對長期複利效益的侵蝕程度。

---

## 2. 決策內容 (Decision)

1. **實體分離與關聯架構 (Entity Separation)**：
   - 引入獨立之 `BrokerAccount` 實體，解耦「券商費率規則」與「交易紀錄」。
   - `TradeRecord` 增加可選之 `accountId?: string` 外鍵，預設向下相容。
2. **多維度聚合計算引擎 (Multi-Dimensional Aggregator)**：
   - 會計計算引擎 `calculateHoldingsAndSummary` 支援按 `selectedAccountId` 進行即時過濾與精準費率套用。
   - 新增 `calculateFrictionCostSummary` 專屬統計函式。
3. **無損平滑升級策略 (Seamless Upgrade)**：
   - LocalStorage 自動維護 `STOCK_TRACKER_BROKER_ACCOUNTS_V1`，初次載入自動初始化標準台美預設帳戶，不破壞舊有交易資料。

---

## 3. 影響評估 (Consequences)

### 正面效益
- 完美支援多券商帳戶管理，支援單一券商獨立對帳與全資產合併檢視。
- 提供業界領先之「交易摩擦成本透視」，助投資人優化交易頻率與券商選擇。

### 潛在權衡
- 資料模型擴充了一個實體與關聯，但透過嚴格的 TypeScript 介面與自動遷移策略，整體架構依舊維持極簡與高可維護性 (KISS)。
