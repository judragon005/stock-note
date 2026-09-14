# 02 — 穿透報告彈窗原生深色毛玻璃與指標膠囊重構 (Health Report Modal Styling)

**What to build:**
重構 `src/components/health/HealthReportModal.tsx`：
1. 遮罩層設置 `position: fixed; inset: 0; zIndex: 9999; backdropFilter: blur(12px); background: rgba(8, 12, 20, 0.75)`。
2. 彈窗容器採用原生 Glassmorphism 頂級樣式，邊框高光與陰影深度。
3. 細項指標列表以原生深色容器排列，左側狀態標籤重構為高對比膠囊：
   - 通過：綠色膠囊 (`rgba(16, 185, 129, 0.15)` 背景，`#10b981` 字體，綠勾圖示)
   - 沒過：紅色膠囊 (`rgba(239, 68, 68, 0.15)` 背景，`#ef4444` 字體，紅叉圖示)
   - 豁免：灰色膠囊 (`rgba(100, 116, 139, 0.15)` 背景，`#94a3b8` 字體)
4. 關閉按鈕與右下角原生按鈕樣式美化。

**Blocked by:** Ticket 01

**Status:** todo
Owner: Agent
Type: subtask
Parent-Issue: #57

- [ ] Modal 遮罩與容器原生化（固定正中央浮動、ESC 關閉、body overflow 鎖定）
- [ ] 21 項細項指標綠勾/紅叉高對比膠囊樣式原生化
- [ ] 頂部綜合引言段落毛玻璃卡片原生化
