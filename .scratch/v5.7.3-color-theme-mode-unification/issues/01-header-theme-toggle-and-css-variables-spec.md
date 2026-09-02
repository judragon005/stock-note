# 子任務 01: Header 模式切換按鈕文字對稱化與 CSS 變數規範對齊

- **父票券**: [issue-0044.md](issue-0044.md)
- **狀態**: `RESOLVED`
- **分流標籤**: `ready-for-agent`
- **目標檔案**:
  - `src/components/Header.tsx`

---

## 🎯 任務目標與實作細節

1. **修正 Header 按鈕標籤**：
   - 當 `colorTheme === 'taiwan'` 時顯示：`🔴 紅漲 🟢 綠跌`
   - 當 `colorTheme === 'international'` 時顯示：`🟢 綠漲 🔴 紅跌` (補齊「紅」字)
2. **驗證按鈕交互與 Tooltip 說明文字**：
   - 確認 `title="切換漲跌色彩模式 (台股紅漲綠跌 / 國際綠漲紅跌)"` 保持清晰。
