# 05-unified-api-key-manager-ui-consolidation

## Description
重構 API 金鑰管理架構，建立全新的 `src/components/UnifiedApiKeyManager.tsx`，徹底整併照片二中割裂的舊版單一金鑰卡片與新版金鑰池管理員。採用「依供應商統一卡片式 (Provider-Centric Unified Cards)」設計，徹底消滅重複輸入，並全面導入現代暗黑毛玻璃 (Dark Glassmorphism) 視覺風格。

## Target Files
- `src/components/UnifiedApiKeyManager.tsx`
- `src/components/UnifiedApiKeyManager.test.tsx`

## Acceptance Criteria
- [x] 容器頂部提供全域配置列：自訂反向代理伺服器 (Proxy URL) 與 Web Crypto 256-bit 本地加密安全指示。
- [x] 依供應商提供統一 Tab 標籤頁：`[🇹🇼 FinMind]` `[🇺🇸 Finnhub]` `[🇺🇸 FMP]` `[🏛️ FRED]` `[🪙 CoinGecko]` `[📑 SEC EDGAR]`。
- [x] 每個供應商卡片內部合一：
  - 快速主要預設金鑰輸入 (Primary Active Key，自動雙向連動金鑰池首位)。
  - 金鑰池狀態清單 (Token 遮罩、別名、單日配額、狀態徽章、單鍵測活 Probe 與 30s 冷卻倒數、刪除)。
  - ➕ 新增輪替備援金鑰表單。
- [x] 全量套用 Dark Glassmorphism 樣式（深藍暗黑背景、精緻微邊框、發光 Focus），徹底移除照片二中的原生白色 HTML `<input>` 與預設排版。
- [x] 撰寫單元測試 `UnifiedApiKeyManager.test.tsx` 驗證各供應商金鑰新增、切換與測活互動正常。

## Status
- [x] done
