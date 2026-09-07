# Ticket 01: TPEx 官方三大法人 24 欄日報格式解析器實作

- **狀態**：CLOSED (RESOLVED)
- **類型**：`type:bugfix`
- **領域**：`area:engine`
- **優先級**：`priority:high`
- **標流標籤**：`ready-for-agent`

## 需求描述
修復 `parseTpexInstitutionalReport` 資料提取路徑，相容 TPEx 最新 `tables[0].data` 格式，精準換算外資合計 (8..10)、投信 (11..13)、自營商合計 (20..22) 與三大法人合計 (23) 股數至張數，向下相容 12 欄格式。

## 驗收條件
1. 傳入包含真實群聯 (8299) 的 TPEx 日報資料，正確解析出外資 122 張、投信 -22 張、自營商 57 張、合計 157 張。
2. 傳入空資料或格式異常時安全回傳空物件，杜絕非預期例外。
