' Windows 靜默執行包裝器 (無黑視窗彈出)
' 用法: wscript.exe run-sync-silent.vbs "node.exe" "scripts\market-sync\sync-tw-market.cjs"
Set WshShell = CreateObject("WScript.Shell")
Set args = WScript.Arguments

If args.Count = 0 Then
    WScript.Quit 1
End If

cmd = """" & args(0) & """"
For i = 1 To args.Count - 1
    cmd = cmd & " """ & args(i) & """"
Next

' 0 代表隱藏視窗, True 代表等待執行完成
WshShell.Run cmd, 0, True
