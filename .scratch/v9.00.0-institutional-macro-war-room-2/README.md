# Spec 0193 本地鏡像：法人旗艦級宏觀戰情室 2.0 (Institutional Macro War Room 2.0)

關聯 GitHub Issue: https://github.com/judragon005/stock-note/issues/283

## 核心規格與決策
- 需求規格說明書：[docs/specs/0193-institutional-macro-war-room-2-spec.md](../../docs/specs/0193-institutional-macro-war-room-2-spec.md)
- 分流標籤：`enhancement`, `ready-for-agent`
- 當前狀態：實作完成 (`completed`)，測試 100% 綠燈，打包通過

## 任務票券清單 (Tickets Index)

| 編號 | 檔案 | 狀態 | 阻擋依賴 (Blocked by) |
| :--- | :--- | :--- | :--- |
| **01** | [01-macro-thermometer-engine.md](issues/01-macro-thermometer-engine.md) | `completed` | None |
| **02** | [02-us-credit-canary-indicators.md](issues/02-us-credit-canary-indicators.md) | `completed` | None |
| **03** | [03-tw-chips-canary-indicators.md](issues/03-tw-chips-canary-indicators.md) | `completed` | None |
| **04** | [04-portfolio-var-and-fx-delta.md](issues/04-portfolio-var-and-fx-delta.md) | `completed` | None |
| **05** | [05-portfolio-stress-test-matrix.md](issues/05-portfolio-stress-test-matrix.md) | `completed` | None |
| **06** | [06-zero-mock-dual-momentum-engine.md](issues/06-zero-mock-dual-momentum-engine.md) | `completed` | None |
| **07** | [07-timeline-catalyst-radar.md](issues/07-timeline-catalyst-radar.md) | `completed` | None |
| **08** | [08-macro-pulse-cache-and-sanitizer.md](issues/08-macro-pulse-cache-and-sanitizer.md) | `completed` | 01, 02, 03 |
| **09** | [09-war-room-market-tabs-and-thermometer-ui.md](issues/09-war-room-market-tabs-and-thermometer-ui.md) | `completed` | 01, 02, 03, 08 |
| **10** | [10-war-room-shield-var-and-stress-ui.md](issues/10-war-room-shield-var-and-stress-ui.md) | `completed` | 04, 05 |
| **11** | [11-war-room-radar-and-brief-copy-ui.md](issues/11-war-room-radar-and-brief-copy-ui.md) | `completed` | 06, 07, 09, 10 |
