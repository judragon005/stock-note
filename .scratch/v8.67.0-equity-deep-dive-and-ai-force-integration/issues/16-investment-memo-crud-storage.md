# 16 — 投資筆記本地 CRUD 存儲層

**What to build:** 
建立 `src/utils/investmentMemoStorage.ts`。在 `localStorage: stock_investment_memos` 維護投資筆記之持久化：
1. `saveInvestmentMemo(memo: InvestmentMemoRecord): void`
2. `getInvestmentMemo(symbol: string): InvestmentMemoRecord | null`
3. `deleteInvestmentMemo(symbol: string): void`
4. `getAllInvestmentMemos(): InvestmentMemoRecord[]`
包含 JSON 序列化例外攔截與資料清理。

**Blocked by:** 05 — 7 步投研資料契約與型別定義, 15 — 步驟 7 投資筆記結構與 7 步全量 Prompt 聚合引擎

**Status:** ready-for-agent

- [ ] 支援新增、更新、查詢與刪除
- [ ] 具備更新時間戳記 `updatedAt`
- [ ] 單元測試 100% 覆蓋
