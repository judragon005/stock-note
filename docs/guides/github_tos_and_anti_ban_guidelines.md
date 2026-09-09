# GitHub 服務條款 (ToS) 與防封號合規指引 (Anti-Ban Guidelines)

本文件依據 **GitHub Terms of Service (ToS)**、**GitHub Acceptable Use Policies (AUP)** 及 **GitHub Actions / API 使用守則** 編撰，旨在確保專案維護與 AI Agent 協作過程完全合規，徹底杜絕帳號被 GitHub 官方風控標記、限速甚至停權 (Suspension)。

---

## 1. GitHub 官方政策核心紅線 (Core Policy Violations)

任何違反以下條款的行為均可能導致帳號立即被系統永久停權：

### 1.1 帳號擁有權與多帳號限制 (Account Policies)
- **一人一免費帳號原則**：GitHub 官方 ToS 規定，每位自然人僅能持有一個免費個人帳號（One person or legal entity may maintain no more than one free account）。若因違規遭封禁，切勿在同一未隔離環境下重複申請免洗帳號（Ban Evasion），否則會觸發自動關聯秒封。
- **身分乾淨獨立**：新帳號必須使用全新的 Email、獨立金鑰，不得在機器上殘留舊被封帳號的認證憑證。

### 1.2 濫用伺服器資源與不當使用 (Resource Abuse & Excessive Bandwidth)
- **禁止將 GitHub 當作免費 CDN / 雲端硬碟**：
  - 嚴禁將大容量備份檔（如超過 50MB~100MB 的 `.bundle`、`.tar.gz`、壓縮包、離線資料庫）推送到 GitHub 儲存庫。
  - 單一檔案建議上限為 50MB，單一 Repository 總容量建議低於 1GB（超過 5GB 會被 GitHub 發送警告甚至轉為唯讀）。
- **禁止濫用 GitHub Actions 計算資源**：
  - Actions 只允許用於專案相關的軟體建置、測試、打包與部署 (CI/CD)。
  - **嚴禁**利用 Actions 執行網路爬蟲、高頻資料抓取、自動化交易機器人、加密貨幣挖礦或任何非 CI/CD 計算。
  - **嚴禁**連續短時間發起過量 workflow 耗盡 free runner 分鐘數。

### 1.3 惡意自動化與高頻呼叫 (Spam & Abuse Detection)
- **API 與 CLI 頻率限制 (Rate Limits)**：
  - GitHub 設有嚴格的 Abuse Detection Mechanism（防濫用風控）。短時間內以腳本大量建立 Issue、PR、Comments，或以 while 迴圈輪詢 API，會直接觸發 Secondary Rate Limit（次級頻率限制），最重可導致帳號被 Shadowban 或封鎖。
- **禁止虛假或無意義提交**：避免為了「刷綠格子」或高頻測試而使用腳本每隔數分鐘 push 一次微小變更。

### 1.4 機敏資料與合法性 (Secrets & Compliance)
- **零機敏資訊外洩**：嚴禁將個人 API Key（如 FinMind、FMP）、密鑰、Token、私鑰（`.pem`、`.key`）、資料庫密碼或含真實個人身分/財務數據提交至公開或私有儲存庫。GitHub 的 Secret Scanning 系統會即時分析並記錄。

---

## 2. 專案開發防風控節流守則 (Throttling & Best Practices)

為防止日常開發與 AI Agent 自動化協作觸發 GitHub 異常行為檢測，專案內必須嚴格執行以下工程紀律：

### 2.1 Git Push 節流守則
1. **拒絕碎步推送 (No Micro-Pushing)**：
   - 嚴禁修改單一檔案或單行註解就立即 `git push`。
   - 開發過程應在本地進行多次小步 Commit，待一個完整任務單元驗證通過後，再以 **單次 Push** 推送，或於本地先 Squash 後推送。
2. **頻率上限警戒線**：
   - 單一開發者/Agent 每小時推送遠端的次數**不得超過 5 次**。
   - 連續兩次 Push 之間建議保持合理人類操作間隔（如 3~5 分鐘以上），避免呈現機器人高頻特徵。

### 2.2 GitHub Actions 綠色守則
1. **本地優先綠燈 (Local-First Verification)**：
   - 推送至遠端前，本地必須 100% 通過 `npm test` 與 `npm run build` (tsc 0 錯誤)。嚴禁把 GitHub Actions 當作除錯偵測工具。
2. **配置 Concurrency 控制**：
   - 在 `.github/workflows/ci.yml` 必須加入 `concurrency: cancel-in-progress: true`。當同一分支有新推送時，自動終止前一次未跑完的 CI，避免多個 runner 堆疊爭搶算力。
3. **過濾無關變更 (Paths Filtering)**：
   - 針對純文件修改（`*.md`、`docs/**`、`.scratch/**`），工作流應設定 `paths-ignore`，避免純文檔更新浪費 CI 運算時間。

### 2.3 GitHub CLI (`gh`) 呼叫防護
1. **嚴禁無延遲輪詢**：禁止使用 bash/powershell 迴圈不設 sleep 持續監控 Issue/PR 狀態。
2. **批量操作節流**：若需建立 Issue 或 PR，兩次 CLI 操作之間必須間隔至少 5 秒，單日批量建立上限不超過 10 筆。

---

## 3. 新帳號乾淨遷移檢查清單 (Clean Slate Migration Checklist)

若先前帳號曾發生異常或遭停權，為防止新申請的 GitHub 帳號被系統透過本機環境關聯判定為「同一違規實體 (Ban Evasion)」，在啟用新帳號前**必須完成以下 5 步徹底隔離**：

### 步驟 1：清理 Windows 認證管理員 (Credential Manager)
1. 按下 `Win + R`，輸入 `control /name Microsoft.CredentialManager` 並開啟「認證管理員」。
2. 切換至「**Windows 認證 (Windows Credentials)**」。
3. 在「一般認證 (Generic Credentials)」列表中，找到所有與 GitHub 相關的條目（例如 `git:https://github.com`）。
4. 點擊展開並選擇「**移除 (Remove)**」，確保舊帳號的 PAT 或 OAuth 憑證完全清除。

### 步驟 2：產生全新 SSH 金鑰（切勿複用舊金鑰）
1. 開啟 PowerShell，產生專屬新帳號的全新 Ed25519 金鑰（以新帳號註冊 Email 為標籤）：
   ```powershell
   ssh-keygen -t ed25519 -C "your_new_email@example.com" -f "$HOME/.ssh/id_ed25519_github_new"
   ```
2. 啟動 ssh-agent 並加入新金鑰：
   ```powershell
   Get-Service ssh-agent | Set-Service -StartupType Manual
   Start-Service ssh-agent
   ssh-add "$HOME/.ssh/id_ed25519_github_new"
   ```
3. 登入新 GitHub 帳號 ➔ Settings ➔ SSH and GPG keys ➔ New SSH Key，將 `$HOME/.ssh/id_ed25519_github_new.pub` 的內容貼上並命名。
4. 測試連線確認身分：
   ```powershell
   ssh -T git@github.com
   # 必須確認輸出顯示為：Hi <New_Username>! You've successfully authenticated...
   ```

### 步驟 3：更新 Git 全域與專案 Commit 身分
1. 設定全域（或專案專用）Committer 資訊，確保不再帶有舊帳號 Email：
   ```powershell
   git config --global user.name "YourNewGitHubUsername"
   git config --global user.email "your_new_email@example.com"
   ```
2. 亦可在本專案目錄內執行覆蓋，確認身分綁定：
   ```powershell
   git config user.name "YourNewGitHubUsername"
   git config user.email "your_new_email@example.com"
   ```

### 步驟 4：切換並更新 Git 遠端 Remote URL
1. 在新 GitHub 帳號建立全新空儲存庫（Repository）。
2. 在本地專案執行更新 remote 指令：
   ```powershell
   git remote set-url origin git@github.com:<New_Username>/<New_Repo_Name>.git
   git remote -v
   ```
3. 確保遠端 URL 指向新帳號的乾淨儲存庫。

### 步驟 5：重新授權 GitHub CLI (`gh`)
1. 清除舊有的 CLI 登入狀態：
   ```powershell
   gh auth logout -h github.com
   ```
2. 使用新帳號重新授權登入：
   ```powershell
   gh auth login -h github.com -p ssh -w
   ```
3. 驗證目前 CLI 授權身分：
   ```powershell
   gh auth status
   ```

---

## 4. 總結：日常自檢心法 (Summary & Mantras)

- **「一測、二整、三推」**：本地驗證通過 ➔ 整理 Commit ➔ 集中單次推送。
- **「大檔出庫、私鑰進鎖」**：超過 50MB 檔案與敏感金鑰嚴禁進入 Git 追蹤。
- **「乾淨獨立」**：新帳號環境保持完全隔離，杜絕舊憑證交叉污染。
