# 03 — 個人防護盾 3.5 整併、ETF 穿透明細展開與隱私防漏修枝

**Parent:** #584 (Spec 0235)

**What to build:** 物理刪除 `WarRoomWorkspace` 中重複的 L8 舊版個人防護盾與 L6 重複 VaR/FX/維持率三欄卡；將 `-10% / -20% / -30%` 急速壓力測試切換條、`質押黑天鵝壓力測試 ➔` 觸發按鈕與 `lookThroughReport` ETF 穿透前五大成分股展開抽屜完整整併入 `PortfolioShieldAndAmmoCard`，並確保全數金額嚴格受 `privacyMode` 遮罩保護。

**Blocked by:** 02 — 風控計量精度修復與單一權益上限基準

**Status:** ready-for-agent

- [ ] 同頁僅保留單一 `PortfolioShieldAndAmmoCard`，不再重複渲染 L6 三欄卡與 L8 舊版防護盾
- [ ] 點擊穿透曝險區可展開檢視前五大直接/間接穿透標的明細
- [ ] 內嵌 `-10% / -20% / -30%` 壓力測試與質押壓力測試彈窗入口正常運作
- [ ] `privacyMode={true}` 時全區無任何未遮罩之現金、淨值、VaR 或 FX 明文金額
- [ ] `WarRoomWorkspace.test.tsx` 驗證通過
