# 02-tdcc-distribution-card-implementation

## Description
實裝波段投資人核心必備之 Card 19「TDCC 集保千張大戶趨勢卡」，繪製雙軸圖表展示千張大戶持股比率 %（折線）與總股東人數（柱狀），並提供波段起漲（大戶增+散戶減）與接刀警戒徽章。

## Target Files
- `src/components/aiForceDashboard/cards/TdccDistributionCard.tsx`
- `src/components/aiForceDashboard/cards/TdccDistributionCard.test.ts`
- `src/components/aiForceDashboard/AiForceDashboardView.tsx`

## Acceptance Criteria
- [x] 建立 `TdccDistributionCard.tsx`，雙軸呈現千張大戶持股比率折線與總股東人數長條。
- [x] 當連續 3 週大戶增加且股東人數減少時，自動標註「籌碼高度集中 (波段起漲)」；反之標註「散戶接刀警戒」。
- [x] 若無 TDCC 數據或處於美股環境，優雅呈現「集保數據累積中」或「美股無集保機制」之誠實空狀態。
- [x] 保留原有卡片 16（買賣力分布），於 Row 3 與法人卡片相鄰並列。
- [x] 單元測試 `TdccDistributionCard.test.ts` 驗證雙軸投影極值計算與渲染 100% 通過。

## Status
- [x] completed
