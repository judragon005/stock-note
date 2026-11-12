# 03 — [Spec 0223 / Ticket 03] 鏡頭二（市場結構寬度與去槓桿）新手白話 TermTooltip、反恐慌定心丸與落底/鈍化防禦指標全貫通

## Parent

- #494 ([Spec 0223] Zavy 慢富週期與配置新手白話導覽、零造輪子 TermTooltip 整合與既有引擎 12 項漏接欄位全貫通)

## What to build

於鏡頭二「台股全市場均線站上比例 (20/60/200MA)、📉 融資去槓桿比率、🔍 中期修正落底核對表」三大區塊掛載既有 `TermTooltip` 四段式白話解說與即時診斷；落實反恐慌行為金融 UX：當製造業上行期遇上 `20MA 寬度 < 20%` 時，操作指引框強化祖母綠機會色視覺定錨，提示「💎 波浪回檔黃金買點，勿對漣漪起反應」，並補齊顯示十年線鈍化防禦錨點（`fallbackIndicator`）；於融資去槓桿區塊並列顯示「大盤波段回撤 % vs 融資減幅 %」雙數據膠囊；於中期修正落底核對表補齊各檢核項目之合格門檻（`thresholdDescription`）與底部綜合落底行動結論（`bottomingChecklist.guidanceText`）。

## Acceptance criteria

- [x] 鏡頭二三大指標區塊標題掛載 `TermTooltip`，懸浮或點擊可開啟四段式 Zavy 白話比喻與即時診斷。
- [x] 寬度區塊補齊顯示十年線鈍化防禦錨點（`interpretation.fallbackIndicator`），並於上行期超賣時以祖母綠機會色定錨反恐慌操作指引。
- [x] 融資去槓桿區塊並列顯示「大盤回撤 %」與「融資減幅 %」雙數據膠囊，讓新手直觀理解去槓桿比率計算分子與分母。
- [x] 中期修正落底核對表顯示各項目的合格門檻（`thresholdDescription`）與底部綜合落底結論指引（`bottomingChecklist.guidanceText`）。
- [x] 通過鏡頭二組件渲染與白話解讀單元測試。

## Blocked by

- #495 ([Spec 0223 / Ticket 01] Zavy 慢富白話決策字典、週期/利率枚舉中文化與頂部 30 秒慢富導覽垂直切片)

