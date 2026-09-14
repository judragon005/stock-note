# 01 — Financial Amount Broker Formatter & Precision Normalization

**What to build:**
建立以「元 (TWD / USD)」為基準之券商級金額自適應換算器 (`formatFinancialAmount`)，徹底根治 `FinancialTrendsLayer` 將元當作百萬除以 100 導致的 `499,910 億` 天文數字與小於門檻變 `0 百萬` 之重大缺陷。

**Blocked by:** None — can start immediately

**Status:** done
Owner: Agent
Type: subtask
Parent-Issue: #50

- [x] 金額 $\ge 1$ 億換算為 `XX.X 億`（如 54.9 億、-8.8 億）
- [x] 金額 $100$ 萬 $\sim 1$ 億換算為 `XX.X 百萬`
- [x] 柱狀圖上方金額標籤與 Tooltip 格式化對齊
- [x] 單元測試覆蓋正負數與臨界值
