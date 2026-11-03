# 09 — 財報鑑識負向排除與流動性容量初篩 (Forensic Exclusion & Liquidity Guard TDD)

**What to build:**
實作機構買方的負向清單 (Negative Screening) 與流動性容量保護：
1. 復用專案內現有之 `src/engine/forensicRadarEngine.ts`：
   - 若標的在本地財報庫中被判定存在嚴重異常 (`severity === 'DANGEROUS'`)：
   - 無論技術型態多完美，強制覆寫決策為 `AVOID: ⛔ 鑑識雷達示警 (財報造假風險，絕對禁買)`。
2. 流動性容量初篩：
   - 檢驗台股近 5 日日均成交量（若 $< 500$ 張）或美股近 5 日日均成交金額（若 $< 1000$ 萬美元）：
   - 給予提示標籤 `🟡 流動性不足 (容量受限)`，不予發出主動買進推薦。
3. 撰寫單元測試覆蓋地雷股負向排除與流動性不足標的降級。

**Blocked by:** Ticket 08

**Status:** open

- [x] 在單股掃描流中整合 `forensicRadarEngine` 嚴重異常查驗
- [x] 檢出 DANGEROUS 嚴重風險標的強制判定為 AVOID 禁買
- [x] 加入 5 日均量/均額初篩，過濾無流動性小型殭屍股
- [x] 編寫單元測試驗證地雷股與冷門股之負向攔截

