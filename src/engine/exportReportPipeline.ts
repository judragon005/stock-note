import type { AiForceDashboardReport } from '../types/aiForceDashboard';

/**
 * 對 CSV 儲存格進行 DDE 注入防護消毒
 * 若儲存格開頭為 =, +, -, @，添加單引號前綴
 */
export function sanitizeCsvCell(val: unknown): string {
  if (val === undefined || val === null) return '';
  const str = String(val).trim();
  if (/^[=+\-@]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

/**
 * 將 AI 決策報表轉換為標準安全 CSV 字串 (包含 UTF-8 BOM)
 */
export function exportReportToCsv(report: AiForceDashboardReport): string {
  const bom = '\uFEFF';
  const lines: string[] = [];

  // 基本標的列
  lines.push('標的代號,標的名稱,市場,現價,漲跌幅,成交量,更新時間');
  lines.push(
    [
      sanitizeCsvCell(report.symbol),
      sanitizeCsvCell(report.name),
      sanitizeCsvCell(report.market),
      sanitizeCsvCell(report.marketBar?.currentPrice),
      sanitizeCsvCell(`${report.marketBar?.changePercent ?? 0}%`),
      sanitizeCsvCell(report.marketBar?.volumeShares),
      sanitizeCsvCell(report.updatedAt),
    ].join(',')
  );

  lines.push(''); // 空行分隔

  // AI 判定摘要
  lines.push('AI 決策維度,數值/結論');
  lines.push(`主力語意,${sanitizeCsvCell(report.mainForceVerdict?.primaryVerb)}`);
  lines.push(`AI 綜合研判,${sanitizeCsvCell(report.mainForceVerdict?.fullVerdictText)}`);
  lines.push(`20日主力成本 (VWAP),${sanitizeCsvCell(report.vwapCostStructure?.mainForceVwap)}`);
  lines.push(`多空比,${sanitizeCsvCell(report.bullBearEnergy?.bullBearRatio)}`);
  lines.push(`隔日沖風險等級,${sanitizeCsvCell(report.dayTradeRisk?.riskLevel)}`);
  lines.push(`市場情緒指數,${sanitizeCsvCell(report.marketSentiment?.overallSentimentIndex)}`);

  return bom + lines.join('\n');
}

/**
 * 生成獨立可離線查看之 HTML 總結決策報告
 */
export function generateSummaryHtml(report: AiForceDashboardReport): string {
  const title = `${report.symbol} ${report.name} - AI 主力行為量化決策總結報告`;
  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 24px; }
    .card { background: rgba(30, 41, 59, 0.85); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 20px; max-width: 900px; margin: 0 auto 16px auto; box-shadow: 0 8px 24px rgba(0,0,0,0.4); }
    h1 { margin-top: 0; font-size: 20px; color: #38bdf8; }
    .price-tag { font-size: 28px; font-weight: bold; color: #ef4444; }
    .verdict { font-size: 22px; font-weight: bold; color: #f59e0b; padding: 4px 12px; background: rgba(245, 158, 11, 0.15); border-radius: 6px; display: inline-block; margin: 10px 0; }
    .summary-text { font-size: 14px; line-height: 1.6; color: #cbd5e1; }
    @media print { body { background: #fff; color: #000; } .card { box-shadow: none; border: 1px solid #ccc; background: #fff; } }
  </style>
</head>
<body>
  <div class="card">
    <h1>${report.symbol} ${report.name} (AI 主力戰情室)</h1>
    <div>更新時間：${report.updatedAt}</div>
    <div class="price-tag">$${report.marketBar?.currentPrice ?? '--'}</div>
    <div class="verdict">主力語意：${report.mainForceVerdict?.primaryVerb ?? '分析中'}</div>
    <p class="summary-text">${report.mainForceVerdict?.fullVerdictText ?? ''}</p>
  </div>
</body>
</html>`;
}

/**
 * 觸發瀏覽器下載 CSV 檔案
 */
export function triggerCsvDownload(report: AiForceDashboardReport) {
  const csvContent = exportReportToCsv(report);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `AI_Force_Decision_${report.symbol}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 觸發瀏覽器下載 HTML 總結報告
 */
export function triggerHtmlDownload(report: AiForceDashboardReport) {
  const htmlContent = generateSummaryHtml(report);
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `AI_Decision_Report_${report.symbol}_${new Date().toISOString().slice(0, 10)}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 觸發原生列印或 PDF 匯出
 */
export function triggerPrintPdf() {
  if (typeof window !== 'undefined') {
    window.print();
  }
}

/**
 * 過濾出寬高 >= 60 的主要圖表 SVG (排除微小圖示)
 */
export function filterChartSvgElements<T extends { getBoundingClientRect?: () => { width: number; height: number }; getAttribute?: (name: string) => string | null }>(
  svgElements: T[]
): T[] {
  return svgElements.filter((svg) => {
    let width = 0;
    let height = 0;
    if (typeof svg.getBoundingClientRect === 'function') {
      const rect = svg.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
    }
    if (!width && typeof svg.getAttribute === 'function') {
      width = parseFloat(svg.getAttribute('width') || '0');
    }
    if (!height && typeof svg.getAttribute === 'function') {
      height = parseFloat(svg.getAttribute('height') || '0');
    }
    return width >= 60 && height >= 60;
  });
}

/**
 * 遍歷頁面所有主要 SVG 圖表節點，並批次轉換為 PNG 下載 (Ticket 04)
 */
export async function triggerAllChartsDownload(symbol: string): Promise<number> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return 0;
  }

  const allSvgs = Array.from(document.querySelectorAll('svg'));
  const chartSvgs = filterChartSvgElements(allSvgs);
  if (chartSvgs.length === 0) {
    return 0;
  }

  let downloadedCount = 0;
  const serializer = new XMLSerializer();

  for (let i = 0; i < chartSvgs.length; i++) {
    const svg = chartSvgs[i];
    const rect = svg.getBoundingClientRect();
    const width = rect.width || parseFloat(svg.getAttribute('width') || '0') || 300;
    const height = rect.height || parseFloat(svg.getAttribute('height') || '0') || 150;

    try {
      const svgStr = serializer.serializeToString(svg);
      const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(width * 2, 400); // 2x 高解析度
      canvas.height = Math.max(height * 2, 200);
      const ctx = canvas.getContext('2d');

      if (ctx) {
        // 深色背景鋪底
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const img = new Image();
        img.crossOrigin = 'anonymous';

        await new Promise<void>((resolve) => {
          img.onload = () => {
            try {
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            } catch {}
            resolve();
          };
          img.onerror = () => resolve();
          img.src = url;
        });

        if (typeof canvas.toBlob === 'function') {
          canvas.toBlob((blob) => {
            if (blob) {
              const pngUrl = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = pngUrl;
              a.download = `${symbol}_chart_${i + 1}_${new Date().toISOString().slice(0, 10)}.png`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(pngUrl);
            }
          }, 'image/png');
        }
      }

      URL.revokeObjectURL(url);
      downloadedCount++;
    } catch {
      // 容錯跳過單一圖表
    }
  }

  return downloadedCount;
}


