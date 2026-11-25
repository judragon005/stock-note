# 01 — 抽離統一 SSRF 來源安全守衛核心 (Unified SSRF Origin Guard)

**Parent:** #609 (Spec 0247)

**What to build:** 建立單一外部網址安全驗證原語（僅允許 HTTPS、涵蓋所有系統支援供應商之精確主機白名單、阻斷私網 IPv4/IPv6/Loopback/Cloud Metadata、識別 3xx 重導向阻斷條件），供通用代理與金鑰測活端點共同消費。

**Blocked by:** None — can start immediately

**Status:** done

- [x] `http://`、`file://`、`ftp://` 與畸形網址 100% 遭到阻斷
- [x] `localhost`、`127.0.0.1`、`10.0.0.1`、`172.16.0.1`、`192.168.1.1`、`169.254.169.254`、`[::1]` 與非白名單網域 100% 遭到阻斷
- [x] 全部合法支援供應商 HTTPS 網址 100% 通過
- [x] 離線單元測試 100% 通過
