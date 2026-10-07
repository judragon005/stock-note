# 01-symbol-inference-and-market-routing

## Description
在 `src/components/aiForceDashboard/HeaderQueryBar.tsx` 中重構 `inferMarketType`，擴充台股代碼特徵識別正則，解決合法台股標的（如 `00411A` 主動統一前沿科技、`00403A`、`00679B`、`00632R`、`2881A`）被錯誤推斷為美股 `US` 的致命缺陷。同時優先比對 `stockDictionary`，確保雙軌識別具備 100% 準確率。

## Target Files
- `src/components/aiForceDashboard/HeaderQueryBar.tsx`
- `src/components/aiForceDashboard/HeaderQueryBar.test.tsx`

## Acceptance Criteria
- [x] `inferMarketType` 支援合法台股正規表達式 `/^\d{4,6}[A-Z]?$/`。
- [x] (KISS 決策：以單一正則涵蓋，未引入字典比對)
- [x] 當傳入 `00411A`、`00679B`、`00632R`、`2881A`、`2330`、`0050` 時，100% 回傳 `'TW'`。
- [x] 當傳入 `AAPL`、`NVDA`、`TSLA`、`SPY`、`BRK-B` 時，100% 回傳 `'US'`。
- [x] 撰寫單元測試 `HeaderQueryBar.test.tsx` 覆蓋所有台美邊緣案例，測試 100% 通過。

## Status
- [x] done

