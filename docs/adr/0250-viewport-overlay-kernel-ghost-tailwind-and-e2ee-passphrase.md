# ADR 0250: 系統免疫強化 Wave 3 — 視口對話層作業系統 (Viewport Overlay Kernel)、幽靈 Tailwind 根除與明文 E2EE 密碼汰換

- **狀態 (Status)**: Accepted
- **日期 (Date)**: 2026-11-26
- **關聯規格**: [Spec 0250](../specs/0250-viewport-overlay-kernel-ghost-tailwind-and-e2ee-passphrase-spec.md)
- **關聯 Issue**: `#615`
- **清償技術債**: [Debt 0068](../debts/0068-ghost-tailwind-modalshell-hardening-and-e2ee-prompt.md)、[Debt 0063](../debts/0063-legacy-modals-portal-shell-migration.md)

---

## 背景與問題 (Context)

1. 專案未安裝 Tailwind CSS，但 `BrokerAccountsModal`（43 處）、`ApiKeyPoolManager`（24 處）與 `XirrDetailModal`（8 處）殘留共 75 處無效 utility class，導致視口固定居中與暗色玻璃排版破損。
2. 既有 `ModalShell` 存在固定整體捲動破壞 `flex-col` 分析彈窗、缺乏非 LIFO 捲動鎖引用計數、`Escape` 多層廣播風暴、缺乏焦點陷阱與髒表單攔截等先決缺陷。
3. `SettingsWorkspace` 以明文阻塞式 `window.prompt()` 讀取 E2EE 零知識加密主密碼，存在螢幕肩窺與主執行緒阻塞風險。
4. 全站 23 顆有效既有彈窗（18 顆獨立元件＋5 處內嵌阻斷遮罩）採異質手寫定位，並殘留 1 顆零外部引用死碼 `ImportModal.tsx`。

---

## 架構決策 (Decision)

1. **零依賴視口對話層作業系統 (`Viewport Overlay Kernel`)**：
   - 於 `src/components/common/ModalShell.tsx` 導入模組級 `OverlayStack`（僅堆疊頂端彈窗響應 `Escape`）、`ScrollLockLedger`（`Set<symbol>` 引用計數鎖，僅最後一顆彈窗關閉才還原 `body.style.overflow`）、`useRef` 穩定化 `closeLocked`/`dirty`/`onBeforeClose`（`useEffect` 依賴鎖定為 `[isOpen]`）、原生 `Tab`/`Shift+Tab` 焦點陷阱＋焦點復原、以及非阻塞內聯髒表單確認橫幅。
   - 不引入第三方 `focus-trap-react` 或原生 `<dialog>.showModal()`（避免純 Node/jsdom 測試環境相容性斷裂與外部依賴膨脹）。
2. **分層 Z-Index 設計 Token 與領域隔離**：
   - 於 `src/index.css` 定義 `--z-tooltip: 950 < --z-modal-base: 1000 < --z-modal-nested: 1100 < --z-modal-critical: 1200`，明確隔離阻斷式彈窗（Modal Overlay）與非阻斷浮動提示（Floating Tooltip）。
3. **E2EE 遮罩密碼原語 (`PassphraseModal`) 與死碼清除**：
   - 以掛載於 `layer="critical"` 之 `PassphraseModal`（`type="password"` + `autoComplete="new-password"` + 卸載清零）全面取代設定工作區 3 處 `window.prompt()`，並物理移除零引用死碼 `ImportModal.tsx`。
4. **全站 23 顆彈窗收斂與 CI 靜態免疫棘輪（不變量 12–14）**：
   - 清除全部 75 處幽靈 Tailwind 並將全站 18 顆獨立彈窗＋5 處內嵌遮罩 100% 收斂至 `ModalShell`；於 `architecturalFitnessGuard.test.ts` 鎖死不變量 12（全站 `*Modal*.tsx` 必用 `ModalShell` 且無死碼）、不變量 13（0 幽靈 Tailwind）、不變量 14（0 `window.prompt`）。

---

## 影響與取捨 (Consequences)

- **正向效益**：全站彈窗獲得統一視口 Portal 隔離、非 LIFO 捲動鎖安全、WAI-ARIA 焦點管理與髒表單保護；E2EE 主密碼徹底脫離明文與原生阻塞視窗；CI 靜態守門使同類缺陷回歸率永久歸零。
- **權衡取捨**：全倉其餘未觸及檔案中之非敏感 `window.confirm()` / `window.alert()` 不在本期強制改寫為全域 Confirm Provider，維持最小變更半徑。
