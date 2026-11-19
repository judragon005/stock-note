# 07 — 智策提示詞轉接器型別安全與集保 400/1000 張語意分離

**What to build:** 放寬智策事實摘要籌碼介面之集保與散戶變化欄位為 `number | null | undefined` 以徹底拔除 `as unknown as` 型別逃逸，並嚴格分離 400 張與 1,000 張大戶指標來源，避免單一數據冒充雙重信號。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] 放寬目標籌碼介面型別並移除 `as unknown as` 雙重型別斷言
- [ ] 僅將 400 張大戶 4 週變化率綁定至 `bigHolderRatioChange400`；無獨立 1,000 張來源時 `bigHolderRatioChange1000` 誠實輸出 `null`
- [ ] 新增／通過契約測試驗證缺失與有效情境之精確輸出
