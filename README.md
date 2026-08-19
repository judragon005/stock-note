# 股票紀錄 (Stock Tracker)

## 專案簡介
本專案為股票投資交易與資產配置紀錄系統，旨在提供清晰、穩健的數據追蹤與決策輔助。

## 專案結構
```text
.
├── .github/
│   ├── workflows/
│   │   └── ci.yml             # GitHub Actions 自動化測試與建置流程
│   └── pull_request_template.md # PR 規範範本
├── .gitignore                 # 版控忽略清單
└── README.md                  # 專案說明文件
```

## 開發與工作流程
1. **主幹保護**：`main` 分支受保護，所有功能開發均由 `feature/xxx` 分支發起 PR 進行審查合併。
2. **自動化驗證 (CI)**：每次提交與 PR 均會自動觸發 GitHub Actions 執行自動化測試與規範檢查。
3. **繁體中文規範**：所有 Commit 說明與技術文件均遵循繁體中文規範。
