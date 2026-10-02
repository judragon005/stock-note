/**
 * 純前端原生 Canvas 向量決策快照產生器與匯出管線 (Spec 0156 / Ticket 18, 19)
 */

import { AiForceDashboardReport } from '../types/aiForceDashboard';
import { InvestmentMemoRecord } from '../types/equityDeepDive';
import { logger } from '../utils/logger';

export interface CanvasSnapshotConfig {
  width: number;
  height: number;
  title: string;
  priceText: string;
  changeText: string;
  isUp: boolean;
  dateText: string;
}

export interface SnapshotCardData {
  symbol: string;
  name: string;
  statusTag: 'NORMAL' | 'ATTENTION' | 'DISPOSITION';
  statusBadgeText: string;
  verdictText: string;
  memoSection: {
    buyReasonText: string;
    targetPriceText: string;
    stopLossPriceText: string;
    trackingMetricsText: string;
  };
}

/**
 * Ticket 18: 產出畫布版面配置參數
 */
export function generateCanvasSnapshotConfig(
  report: AiForceDashboardReport,
  _memo?: InvestmentMemoRecord
): CanvasSnapshotConfig {
  const symbol = report.symbol || '';
  const name = report.name || '';
  const currentPrice = report.marketBar?.currentPrice ?? 0;
  const change = report.marketBar?.change ?? 0;
  const changePercent = report.marketBar?.changePercent ?? 0;
  const currency = report.marketBar?.currency ?? (report.market === 'US' ? 'USD' : 'TWD');
  const isUp = change >= 0;

  return {
    width: 1920,
    height: 1080,
    title: `${name} (${symbol}) · AI 主力戰情 × 7 步投資決策快照`,
    priceText: `${currentPrice} ${currency}`,
    changeText: `${isUp ? '+' : ''}${change} (${isUp ? '+' : ''}${changePercent}%)`,
    isUp,
    dateText: report.marketBar?.latestTradingDate || new Date().toISOString().split('T')[0],
  };
}

/**
 * Ticket 19: 結構化裝配向量卡片繪製所需之資料
 */
export function renderSnapshotCardData(
  report: AiForceDashboardReport,
  memo?: InvestmentMemoRecord
): SnapshotCardData {
  const statusTag = report.marketBar?.marketStatusTag || 'NORMAL';
  let statusBadgeText = '正常交易';
  if (statusTag === 'DISPOSITION') {
    statusBadgeText = '🚨 處置股票（分盤撮合）';
  } else if (statusTag === 'ATTENTION') {
    statusBadgeText = '⚠️ 注意股票';
  }

  const verdictText =
    report.mainForceVerdict?.fullVerdictText ||
    report.mainForceVerdict?.primaryVerb ||
    '主力籌碼中性整理';

  return {
    symbol: report.symbol,
    name: report.name,
    statusTag,
    statusBadgeText,
    verdictText,
    memoSection: {
      buyReasonText: memo?.buyReason || '待建立 7 步投研分析買進理由',
      targetPriceText: memo?.targetPrice ? `${memo.targetPrice}` : '未設定',
      stopLossPriceText: memo?.stopLossPrice ? `${memo.stopLossPrice}` : '未設定',
      trackingMetricsText: memo?.trackingMetrics?.join('、') || '持續追蹤籌碼與月營收',
    },
  };
}

export const CANVAS_FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang TC", "Microsoft JhengHei", "Noto Sans TC", sans-serif';

/**
 * 純前端以 HTML5 Canvas 向量繪製高畫質圖片並觸發下載
 */
export async function triggerDashboardCanvasPngDownload(
  report: AiForceDashboardReport,
  memo?: InvestmentMemoRecord
): Promise<boolean> {
  if (typeof document === 'undefined') return false;

  try {
    if (document.fonts && document.fonts.ready) {
      try {
        await document.fonts.ready;
      } catch {
        // 優雅降級回預設字型
      }
    }

    const config = generateCanvasSnapshotConfig(report, memo);
    const cardData = renderSnapshotCardData(report, memo);

    const canvas = document.createElement('canvas');
    canvas.width = config.width;
    canvas.height = config.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;

    // 1. 深色面板背景繪製
    const gradient = ctx.createLinearGradient(0, 0, config.width, config.height);
    gradient.addColorStop(0, '#0f172a');
    gradient.addColorStop(1, '#1e293b');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, config.width, config.height);

    // 網格裝飾線
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let x = 60; x < config.width; x += 120) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, config.height);
      ctx.stroke();
    }
    for (let y = 60; y < config.height; y += 120) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(config.width, y);
      ctx.stroke();
    }

    // 2. 頂部標題列
    ctx.fillStyle = '#38bdf8';
    ctx.font = `bold 44px ${CANVAS_FONT_FAMILY}`;
    ctx.fillText(config.title, 80, 110);

    ctx.fillStyle = '#94a3b8';
    ctx.font = `24px ${CANVAS_FONT_FAMILY}`;
    ctx.fillText(`交易日期：${config.dateText} | 繁中雙市場量化戰情室`, 80, 160);

    // 3. 行情卡片 (左側)
    ctx.fillStyle = 'rgba(30, 41, 59, 0.85)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(80, 210, 840, 780, 20);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.font = `bold 32px ${CANVAS_FONT_FAMILY}`;
    ctx.fillText('📊 即時盤後行情與主力研判', 120, 280);

    // 現價與漲跌
    ctx.fillStyle = config.isUp ? '#ef4444' : '#22c55e';
    ctx.font = `bold 64px ${CANVAS_FONT_FAMILY}`;
    ctx.fillText(config.priceText, 120, 380);

    ctx.font = `bold 36px ${CANVAS_FONT_FAMILY}`;
    ctx.fillText(config.changeText, 120, 440);

    // 處置警示 Badge
    if (cardData.statusTag !== 'NORMAL') {
      ctx.fillStyle = cardData.statusTag === 'DISPOSITION' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)';
      ctx.strokeStyle = cardData.statusTag === 'DISPOSITION' ? '#ef4444' : '#f59e0b';
      ctx.beginPath();
      ctx.roundRect(120, 480, 420, 60, 12);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = cardData.statusTag === 'DISPOSITION' ? '#f87171' : '#fbbf24';
      ctx.font = `bold 24px ${CANVAS_FONT_FAMILY}`;
      ctx.fillText(cardData.statusBadgeText, 140, 520);
    }

    // 主力判讀
    ctx.fillStyle = '#cbd5e1';
    ctx.font = `26px ${CANVAS_FONT_FAMILY}`;
    ctx.fillText('💡 主力行為量化研判：', 120, 600);
    ctx.fillStyle = '#38bdf8';
    ctx.font = `24px ${CANVAS_FONT_FAMILY}`;
    ctx.fillText(cardData.verdictText, 120, 650);

    // 4. 7 步投資決策卡 (右側)
    ctx.fillStyle = 'rgba(30, 41, 59, 0.85)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.roundRect(980, 210, 860, 780, 20);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.font = `bold 32px ${CANVAS_FONT_FAMILY}`;
    ctx.fillText('📝 7 步投研交易筆記（紀律風控卡）', 1020, 280);

    // 買進理由
    ctx.fillStyle = '#94a3b8';
    ctx.font = `24px ${CANVAS_FONT_FAMILY}`;
    ctx.fillText('【買進核心理由】', 1020, 360);
    ctx.fillStyle = '#f1f5f9';
    ctx.font = `26px ${CANVAS_FONT_FAMILY}`;
    ctx.fillText(cardData.memoSection.buyReasonText, 1020, 410);

    // 目標價與停損價
    ctx.fillStyle = '#94a3b8';
    ctx.font = `24px ${CANVAS_FONT_FAMILY}`;
    ctx.fillText('【目標價位區間】', 1020, 500);
    ctx.fillStyle = '#ef4444';
    ctx.font = `bold 36px ${CANVAS_FONT_FAMILY}`;
    ctx.fillText(cardData.memoSection.targetPriceText, 1020, 550);

    ctx.fillStyle = '#94a3b8';
    ctx.font = `24px ${CANVAS_FONT_FAMILY}`;
    ctx.fillText('【停損風控底線】', 1420, 500);
    ctx.fillStyle = '#22c55e';
    ctx.font = `bold 36px ${CANVAS_FONT_FAMILY}`;
    ctx.fillText(cardData.memoSection.stopLossPriceText, 1420, 550);

    // 追蹤指標
    ctx.fillStyle = '#94a3b8';
    ctx.font = `24px ${CANVAS_FONT_FAMILY}`;
    ctx.fillText('【關鍵追蹤指標】', 1020, 650);
    ctx.fillStyle = '#38bdf8';
    ctx.font = `24px ${CANVAS_FONT_FAMILY}`;
    ctx.fillText(cardData.memoSection.trackingMetricsText, 1020, 700);

    // 底部浮水印
    ctx.fillStyle = '#64748b';
    ctx.font = `20px ${CANVAS_FONT_FAMILY}`;
    ctx.fillText('© 股票交易紀錄與分析儀 | 繁中雙市場版 · 純前端離線私密生成', 1020, 930);

    // 5. 輸出 Blob 並觸發下載
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `decision-snapshot-${report.symbol}-${config.dateText}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 'image/png');

    return true;
  } catch (err) {
    logger.warn('[dashboardCanvasExporter] 快照下載失敗:', err);
    return false;
  }
}
