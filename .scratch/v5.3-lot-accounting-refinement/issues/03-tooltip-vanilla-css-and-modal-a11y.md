# Subtask 03: P2-04 Tooltip 原生 Vanilla CSS/A11y 與 Modal Escape/遮罩點擊關閉

- **父任務**：[issue-0036.md](issue-0036.md)
- **狀態**：`READY_FOR_DEV`
- **分流標籤**：`ready-for-agent`
- **優先級**：`P2`

## 任務目標
1. 於 `src/components/common/Tooltip.tsx` 中：
   - 轉為原生 inline CSS / style 與自帶 keyframe 動畫，確保在純 Vanilla CSS 環境下淡入效果生效。
   - 產生唯一的 `id` 並於觸發層配置 `aria-describedby` 與 `tabIndex={0}`，支援螢幕閱讀器與鍵盤焦點。
2. 於 `src/components/LotsBreakdownModal.tsx` 中：
   - 掛載 `useEffect` 監聽鍵盤 `Escape` 事件關閉 Modal。
   - 外層遮罩容器綁定 `onClick={onClose}`，內層卡片容器阻止點擊冒泡 `e.stopPropagation()`。
3. 於 `src/App.tsx` 中：
   - 將 `AccountingMethod` 改為頂部靜態 import。
