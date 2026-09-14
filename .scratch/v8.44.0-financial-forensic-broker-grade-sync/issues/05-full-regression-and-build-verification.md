# 05 — Full Regression & Build Verification

**What to build:**
進行端到端全量驗收：

1. 驗證 2327 國巨等台股標的不再出現 499,910 億天文數字，正確顯示 54.9 億等標準格式。
2. 驗證本地殘缺快取自動洗滌重撈，四大卡片與 0 秒戰報皆有真實完整數值，無 0.0% 或空白。
3. 驗證深色骨架屏平滑切換，無閃爍或半殘跳動。
4. 執行 `npm test`，確保所有單元測試 100% 綠燈。
5. 執行 `npm run build`，確保 TypeScript 0 錯誤、打包順利。

**Blocked by:** 04-broker-grade-skeleton-and-fade-in-gate.md

**Status:** done

- [x] 端到端驗證金額換算、快取自癒與骨架屏體驗
- [x] 全量單元測試 100% 綠燈
- [x] `npm run build` 通過無報錯
