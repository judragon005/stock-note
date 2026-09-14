# 04 — 完整健診報告穿透彈窗元件 (Health Report Forensic Modal Component)

**What to build:**
實作 `src/components/health/HealthReportModal.tsx`，點擊任一健診卡片之「查看完整健診細節」時彈出穿透式詳細檢驗報告：
1. 彈窗 Header：標題「[健診名稱] 完整報告」與右上角關閉按鈕。
2. 頂部摘要：顯示該模組檢驗邏輯原理與當前標的之綜合通過狀況描述。
3. 指標清單：每一項指標以清晰列表呈現，左側顯示綠色勾勾「✔ 通過」或紅色叉叉「✖ 沒過」（豁免指標顯示灰色標記），右側顯示指標規則與門檻說明。
4. 彈窗 Footer：置底「關閉」按鈕。

**Blocked by:** Ticket 01, Ticket 02

**Status:** done
Owner: Agent
Type: subtask
Parent-Issue: #55

- [x] 實作 `HealthReportModal.tsx` 結構與樣式
- [x] 支援綠勾 (Passed) 與紅叉 (Failed) 高對比視覺標記
- [x] 支援產業豁免項目的灰色豁免提示 (Exempted)
- [x] 支援 ESC 鍵與點擊遮罩關閉，焦點捕獲與無障礙相容
- [x] 對齊截圖風格與深淺主題相容
