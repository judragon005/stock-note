# 08 — 戰情室「✏️ 數據校準」Modal 與「🔒 脫敏複製」UI 實作 (Macro Calibration Modal & Privacy Masking UI)

**Parent:** Spec 0204 (Ticket 08)

**What to build:**
修改 `src/components/WarRoomWorkspace.tsx`。
1. 右上角「更新脈搏」旁新增「✏️ 數據校準」按鈕與極簡表單 Modal，提供美債 10Y/2Y、VIX、外資空單（填入最新 -8.7 萬口）與融資維持率之手動覆寫入口並持久化至 `localStorage`。
2. 晨報複製按鈕區增設「複製脫敏簡報」切換，將 `NT$ 13,219,127` 等金額遮蔽為 `NT$ [已隱私遮蔽]`。
3. 晨報開頭注入 Data Seal 戳記，並在文末附帶在線持股部位風控表（代碼/權重%/損益%/箱底）。

**Blocked by:** Ticket 02, Ticket 05

**Status:** ready-for-agent

## Acceptance Criteria
- [ ] 戰情室右上角操作區新增「✏️ 數據校準」按鈕，點擊彈出玻璃擬態表單 Modal。
- [ ] 表單包含 10Y/2Y 美債、VIX、恐慌貪婪指數、外資台指期未平倉、全市場融資維持率欄位。
- [ ] 點擊「儲存校準」後，立即以新數據呼叫 `saveMacroPulseRecord` 並重算水溫計與晨報。
- [ ] 晨報複製按鈕區增設「複製脫敏簡報」功能：
  - 複製文本頂部帶有 Data Seal 認證宣告。
  - 將絕對金額全數替換為 `[已隱私遮蔽]`，保留百分比。
  - 輸出在線持股部位風控表（讓外部 AI 無需討要截圖即可算張數）。
- [ ] 執行 `npm test` 確保所有既有與新功能測試 100% 綠燈通過。
