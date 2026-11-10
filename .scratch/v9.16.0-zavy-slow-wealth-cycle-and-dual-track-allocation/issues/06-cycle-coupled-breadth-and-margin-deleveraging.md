# Ticket 06: 週期情境耦合之寬度/布林診斷、融資去槓桿與空頭失效閘門

**State:** CLOSED  
**Parent:** #472 (Spec 0221)  

## What to build
1. 於 `src/engine/zavySlowWealthEngine.ts` 實作：
   - `evaluateCycleCoupledBreadth`：將市場寬度（20/60/200MA）與指數布林通道位階（%B）與第一層週期方向耦合。上行期 20MA `<20%` 標記為波浪回檔買點；大型空頭標記 200MA 寬度鈍化失效，聯動 `T10YIE` 平衡通膨率插針。
   - `evaluateMarginDeleveraging`：評估台股近 60 日融資減幅 vs 大盤跌幅，以及維持率清洗度。
   - `evaluateBottomingChecklist`：中期修正時檢核半數以上落底條件。

## Acceptance criteria
- [x] 單元測試驗證週期上行期寬度超賣不發出機械式減碼。
- [x] 大型空頭（`SECULAR_RECESSION`）情境下正確啟動鈍化失效閘門。
- [x] 融資去槓桿完成度與落底核對表正確評定。
