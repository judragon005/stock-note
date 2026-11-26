# Debt 0068: 75 處未安裝幽靈 Tailwind CSS 根除、ModalShell 原語強化與明文 E2EE prompt 汰換 (Wave 3)

- **優先級 (Priority)**: `P2`
- **狀態 (Status)**: `RESOLVED`（已於 Spec 0250 / ADR 0250 / Issue `#615` Wave 3 完成 75 處幽靈 Tailwind 清零、`ModalShell` Kernel 強化、`PassphraseModal` 取代明文 E2EE prompt 與不變量 13–14 守門）
- **發現來源**: Spec 0247 五路正交法醫審計 (Issue `#609`)
- **標籤**: `UI` · `Accessibility` · `Security` · `ModalShell` · `Wave3`
- **預計觸發時機**: Wave 3（規劃為 `Spec 0250`，作為 [Debt 0063](0063-legacy-modals-portal-shell-migration.md) 全站 23 顆有效彈窗遷移之前置與同期任務）

---

## 背景與現況

1. **75 處未安裝之幽靈 Tailwind CSS 造成實質 UI 破損**：
   - 專案未安裝 Tailwind CSS，但 `BrokerAccountsModal.tsx`（43 處，含 `fixed inset-0 z-50` 致券商管理彈窗無法視口居中固定）、`ApiKeyPoolManager.tsx`（24 處）與 `XirrDetailModal.tsx`（8 處）仍使用無效 utility class。
2. **`ModalShell.tsx` 三大先決缺陷**：
   - 內層固定 `.modal-content`（`overflow-y: auto; padding: 24px`）會破壞全站 10+ 顆 `flex-col` 固定 Header/Footer 分析彈窗；
   - `body.style.overflow` 缺乏模組層引用計數鎖，多彈窗非 LIFO 關閉會導致背景提前解鎖，且 `closeLocked` 切換觸發 effect 抖動；
   - 缺乏 Focus Trap、焦點復原與大型表單未儲存資料防誤關攔截（`TradeModal`、`EnhancedImportModal`、`EquityDeepDiveModal`、`MacroQuickCalibrationModal` 等）。
3. **明文 `window.prompt()` 輸入 E2EE 主密碼與 45+ 處原生阻塞對話框**：
   - `SettingsWorkspace.tsx:L945,948,983` 直接以明文無遮罩 `window.prompt()` 讀取 E2EE 加密主密碼。

## 建議演進方向

1. 先升級 `ModalShell` 補齊 `layout="scroll" | "flex-fixed"`、引用計數捲動鎖、Focus Trap、`onBeforeClose` 髒資料攔截與分層 `z-index` Token。
2. 根除 75 處幽靈 Tailwind CSS、刪除零引用 `ImportModal.tsx`、以 `ModalShell` 遮罩密碼輸入彈窗取代 E2EE `window.prompt()`，再完成 Debt 0063 全站 23 顆有效彈窗收斂與不變量 13 守門。
