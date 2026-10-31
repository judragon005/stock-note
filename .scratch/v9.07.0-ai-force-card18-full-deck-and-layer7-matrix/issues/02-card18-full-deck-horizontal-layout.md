# 02 — Card 18 主力追蹤總評判滿版橫展與響應式雙欄 Playbook 優化

**What to build:**
優化 `src/components/aiForceDashboard/cards/MainForceVerdictCard.tsx` 在 100% 滿版獨立列下的排版佈局與視覺伸展：
1. **5 態光譜條 (Spectrum Bar)**：全寬舒展展開，提升膠囊間距與字級可讀性。
2. **中央實戰操盤區 (Market Context & Playbook)**：在桌機寬幅視窗（>= 768px）下由上下堆疊升級為左右雙欄並排：
   - 左欄：語意微觀解析 (Market Context) 面板。
   - 右欄：實戰操盤指引 (Action Playbook) 面板，包含操作指令、波段週期、防守停損/目標價/損益比三欄關鍵錨點、以及失效門檻警示。
3. **底部總結列**：4 顆數據膠囊與 AI 結論段落自然鋪展，消除縱向過度壓縮與空間浪費。

**Blocked by:** 01 — AiForceDashboardView 階層結構重組與 Layer 7/8 容器分拆

**Status:** ready-for-agent

- [ ] `MainForceVerdictCard.tsx` 中央區域在寬螢幕下採用 `display: grid; gridTemplateColumns: repeat(auto-fit, minmax(360px, 1fr))` 雙欄並列。
- [ ] 5 態光譜條支援滿版舒展與光學對齊。
- [ ] 撰寫/更新 `MainForceVerdictCard` 單元測試，驗證雙欄響應式節點與 Playbook 完整性。

