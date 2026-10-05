# 05-settings-api-key-pool-manager-ui

## Description
在系統設定工作區（`SettingsWorkspace.tsx`）中新增「API 金鑰池管理」面板，提供直觀的視覺化表單，供使用者按服務商（FinMind, Finnhub, FRED, Polygon 等）新增、刪除金鑰，設定自訂別名與自訂每日配額。

## Target Files
- `src/components/ApiKeyPoolManager.tsx`
- `src/components/SettingsWorkspace.tsx`

## Acceptance Criteria
- [x] 建立 `ApiKeyPoolManager.tsx` 組件，支援按供應商分頁/分組展示金鑰清單。
- [x] 提供「新增金鑰」彈窗/表單：包含選擇供應商、輸入 Key、輸入自訂別名（可選）、設定每日上限（預設根據官方 Free Tier 給定建議值）。
- [x] 清單中每個 Key 顯示遮罩內容（`maskApiKey`），並提供刪除確認按鈕。
- [x] 整合進 `SettingsWorkspace.tsx`，保持玻璃擬態（Glassmorphism）與全域深淺色主題一致。
- [x] 編寫組件單元測試，驗證表單輸入驗證（空字串防呆）、新增與刪除行為。

## Status
- [x] done
