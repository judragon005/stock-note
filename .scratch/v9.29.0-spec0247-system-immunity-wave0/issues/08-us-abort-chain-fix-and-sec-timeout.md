# 08 — 修復美股基本面／配息取消鏈鍵名錯位並補齊美股與 SEC 逾時控制

**Parent:** #609 (Spec 0247)

**What to build:** 統一美股基本面與配息攝取管線之可注入抓取鍵名使上層 AbortController 真正穿透至底層請求，並對美股與 SEC 代理補齊逾時防護。

**Blocked by:** 06

**Status:** done

- [x] 觸發外部 AbortSignal 時，美股基本面與配息底層請求立即收到中止訊號
- [x] 美股基本面、美股配息與 SEC 代理無逾時裸抓取歸零
