# 14 — 交易心理覆盤工作區與客觀紀律改善卡片 (Behavioral Audit Workspace UI & Advice Generator)

**What to build:**
打造專屬的「🧠 交易心理與行為偏誤量化覆盤」儀表板工作區 (`src/components/BehavioralAuditWorkspace.tsx`)。視覺化呈現四大區塊：
1. 處置效應強度儀表盤（獲利天數 vs 虧損天數柱狀對比圖）；
2. FOMO 追高勝率對比矩陣卡片；
3. 週轉摩擦損耗侵蝕率卡片；
4. 根據使用者實際偏誤數據動態生成的「客觀交易紀律改善建議卡片」（例如：當虧損持有天數 $>3$ 倍於獲利時，直言提醒加強停損執行）。

**Blocked by:** 
- 12 — 交易摩擦稅費與年化資產拖累率精算器 (Turnover & Friction Cost Drag Calculator)
- 13 — 買進日 60MA 季線正乖離審計與追高勝率對比 (60MA Bias & FOMO Entry Audit)

**Status:** ready-for-agent

- [ ] 整合處置效應、FOMO 乖離審計與摩擦成本三大核心量化指標
- [ ] 現代玻璃擬態 (Glassmorphism) 卡片式佈局，支援繁體中文與主題色切換
- [ ] 動態生成至少 3 條客觀、不留情面且具建設性的交易心理改善建議
- [ ] 在主導覽列提供直觀工作區切換標籤，支援空狀態友善引導
