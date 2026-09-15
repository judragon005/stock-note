@echo off
chcp 65001 >nul
title 股票紀錄系統 - 全市場每日自動同步排程設定工具 (Spec 0132)

echo ======================================================================
echo    股票紀錄系統 (Stock Tracker) - 每日盤後定時自動同步設定
echo ======================================================================
echo.
echo 此工具將在 Windows 工作排程器 (Task Scheduler) 中註冊兩項定時任務：
echo  1. [StockTracker_TW_Sync] : 每日 16:00 自動同步台股全市場籌碼與日K (TWSE / TPEx)
echo  2. [StockTracker_US_Sync] : 每日 08:00 自動同步美股全市場指標與日K (NYSE / NASDAQ)
echo.
echo 執行方式為「背景靜默執行」，不會跳出任何黑視窗打擾您的日常作業。
echo 資料將自動儲存在本地快取中，開啟網頁時即刻秒讀！
echo.
echo 請選擇操作：
echo  [1] 安裝 / 更新排程任務
echo  [2] 移除排程任務
echo  [3] 立即手動測試台股同步 (16:00 腳本)
echo  [4] 立即手動測試美股同步 (08:00 腳本)
echo  [5] 離開
echo ======================================================================
set /p choice="請輸入選項 (1-5): "

set PROJECT_DIR=%~dp0..\..
cd /d "%PROJECT_DIR%"
set PROJECT_DIR=%CD%

if "%choice%"=="1" goto INSTALL
if "%choice%"=="2" goto UNINSTALL
if "%choice%"=="3" goto TEST_TW
if "%choice%"=="4" goto TEST_US
if "%choice%"=="5" goto END
goto END

:INSTALL
echo.
echo 正在註冊 Windows 工作排程任務...

:: 尋找 node 執行檔路徑
for /f "tokens=*" %%i in ('where node') do set NODE_PATH=%%i & goto FOUND_NODE
:FOUND_NODE
if "%NODE_PATH%"=="" (
    echo [錯誤] 找不到 node.exe，請確認已安裝 Node.js 並加入環境變數 PATH！
    pause
    goto END
)

set VBS_SCRIPT="%PROJECT_DIR%\scripts\market-sync\run-sync-silent.vbs"
set TW_SCRIPT="%PROJECT_DIR%\scripts\market-sync\sync-tw-market.cjs"
set US_SCRIPT="%PROJECT_DIR%\scripts\market-sync\sync-us-market.cjs"

:: 建立台股排程 (每日 16:00)
schtasks /create /tn "StockTracker_TW_Sync" /tr "wscript.exe %VBS_SCRIPT% \"%NODE_PATH%\" \"%TW_SCRIPT%\"" /sc daily /st 16:00 /f >nul
if %errorlevel% equ 0 (
    echo  ✔ 台股排程已成功註冊：每日 16:00 自動執行
) else (
    echo  ✖ 台股排程註冊失敗，請嘗試以「系統管理員身分執行」此批次檔！
)

:: 建立美股排程 (每日 08:00)
schtasks /create /tn "StockTracker_US_Sync" /tr "wscript.exe %VBS_SCRIPT% \"%NODE_PATH%\" \"%US_SCRIPT%\"" /sc daily /st 08:00 /f >nul
if %errorlevel% equ 0 (
    echo  ✔ 美股排程已成功註冊：每日 08:00 自動執行
) else (
    echo  ✖ 美股排程註冊失敗，請嘗試以「系統管理員身分執行」此批次檔！
)

echo.
echo 排程設定完成！可在「工作排程器 (taskschd.msc)」中查看任務狀態。
pause
goto END

:UNINSTALL
echo.
echo 正在移除排程任務...
schtasks /delete /tn "StockTracker_TW_Sync" /f >nul 2>&1
schtasks /delete /tn "StockTracker_US_Sync" /f >nul 2>&1
echo ✔ 所有定時排程已安全移除！
pause
goto END

:TEST_TW
echo.
echo 正在執行台股同步測試...
node "%PROJECT_DIR%\scripts\market-sync\sync-tw-market.cjs"
pause
goto END

:TEST_US
echo.
echo 正在執行美股同步測試...
node "%PROJECT_DIR%\scripts\market-sync\sync-us-market.cjs"
pause
goto END

:END
