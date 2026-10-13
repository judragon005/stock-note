# 技術債 0047: Pre-push Guard 整合文檔完整性與死鏈自動化守門 (verify-docs)

- **狀態**：`OPEN`
- **優先級**：`P3`
- **發現來源**：Code Review (Spec 0178 / Issue #220 / PR #221)
- **標籤**：`CI-CD` · `Documentation` · `GitHooks` · `AntiAbuse`
- **建立日期**：2026-10-13

---

## 📌 背景與問題陳述

在 V8.90.0 (Spec 0178) 中，我們建立了全專案文檔完整性稽核與死鏈檢查工具 `scripts/verify-docs.cjs`，並在 `package.json` 中註冊了 `npm run lint:docs` 指令。
然而，在現行的 `scripts/pre-push-guard.cjs` 本地防禦攔截腳本中，僅包含：
1. 大檔案 (>50MB) 與機敏副檔名防護
2. 明文 API Token 掃描
3. 本地 TypeScript 型別 (`npx tsc --noEmit`) 與單元測試 (`npm test`)

目前 `lint:docs` 尚未掛入 `pre-push-guard.cjs`。若未來開發者或 AI Agent 提交新文檔但遺漏手動執行 `npm run lint:docs`，可能會再次引入失效的超連結或打破 Spec 與 ADR 的 1:1 編號成對性。

---

## 🎯 建議重構與解決方案

於 `scripts/pre-push-guard.cjs` 第 72 行測試驗證段落中，加入文檔守門檢驗：

```javascript
// 3. 執行 TypeScript、文檔死鏈與 Vitest 測試驗證
console.log('🔍 [3/4] 執行文檔完整性與死鏈守門驗證 (npm run lint:docs)...');
execSync('node scripts/verify-docs.cjs', { stdio: 'inherit' });
console.log('  ✅ 文檔完整性與成對性 100% 通過！');

console.log('🔍 [4/4] 執行本地型別與單元測試校驗 (確保 CI 不被濫用)...');
execSync('npx tsc --noEmit', { stdio: 'inherit' });
execSync('npm test', { stdio: 'inherit' });
```

---

## 📅 預計觸發時機

待下次進行 Git Hooks 擴充、CI/CD 腳本維護或統一本地檢查管線時一併實施。
