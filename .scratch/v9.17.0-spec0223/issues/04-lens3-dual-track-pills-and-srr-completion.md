# 04 — [Spec 0223 / Ticket 04] 鏡頭三（「見自己」A/B 雙軌決策）新手白話 TermTooltip、5 檔風險耐受度互動 Pills、質押還款與 SRR 防彈衣實證全貫通

## Parent

- #494 ([Spec 0223] Zavy 慢富週期與配置新手白話導覽、零造輪子 TermTooltip 整合與既有引擎 12 項漏接欄位全貫通)

## What to build

於鏡頭三 A/B 軌切換處補上一句話「見自己」軌道定位指南，並為雙軌核心指標掛載既有 `TermTooltip` 白話解說；在 A 軌接通 `onUpdateTolerance` 渲染 `[10% 保守 | 15% 穩健 | 20% 平衡 | 25% 積極 | 30% 進取]` 五檔直覺切換 Pills，點擊即時連動安全持股上限，於最終建議持股上限旁並排顯示「當前實際持股佔比 (`currentEquityWeightPercent`) vs 建議上限」超配/低配診斷，且當帳上有未結清質押借款時自動渲染 `debtRepaymentSummary`（「🛡️ 負債即負向債券：優先償還質押本金降槓桿」提醒條）；在 B 軌頂部顯示 `isRebalanceRecommended`（±5% 再平衡走廊觸發狀態與原因）徽章、公司債/REITs 真假防彈衣純度提示、`dividendRedirectDetails` 股息導流明細、`targetCapital30xTwd` 30 倍退休台幣目標金額，以及蒙地卡羅模擬之「🛡️ 報酬順序風險 (`SRR`) 防彈衣保護力：100% 純股前 10 年破產率 vs 60/20/10/10 穿防彈衣破產率對比」。

## Acceptance criteria

- [x] A/B 軌分頁下方呈現一句話「見自己」選軌定位說明，且「個人風險預算、四階減碼瀑布流、股息活水轉向、慢富 30x Coast-FIRE 與 SRR」標題皆掛載 `TermTooltip`。
- [x] A 軌接通 `onUpdateTolerance`，渲染 `[10, 15, 20, 25, 30]` 五檔風險耐受度切換 Pills，點擊可即時觸發回呼並更新安全持股上限。
- [x] A 軌並排顯示「當前實際持股佔比 (`currentEquityWeightPercent`)」與超配/低配狀態，並在有質押借款時顯示 `debtRepaymentSummary` 優先還款提醒條。
- [x] B 軌顯示 `isRebalanceRecommended` 再平衡狀態徽章、公司債/REITs 真假防彈衣提示、`dividendRedirectDetails` 導流明細、`targetCapital30xTwd` 30 倍退休目標金額，以及「100% 純股前 10 年破產率 vs 穿防彈衣破產率 (`srrRiskReductionPercent`)」對比。
- [x] 通過鏡頭三 A/B 軌互動與渲染單元測試。

## Blocked by

- #495 ([Spec 0223 / Ticket 01] Zavy 慢富白話決策字典、週期/利率枚舉中文化與頂部 30 秒慢富導覽垂直切片)

