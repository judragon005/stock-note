/**
 * 處置股票與注意股票有效視窗判定引擎 (Spec 0156 / Ticket 01 & Ticket 02)
 */

export interface DispositionEventInput {
  type: 'DISPOSITION' | 'ATTENTION';
  startDate?: string;
  endDate?: string;
  eventDate?: string;
}

/**
 * 將各類日期格式 (YYYY-MM-DD, YYYY/MM/DD, Date) 正規化為 YYYY-MM-DD
 */
export function normalizeDateString(date: Date | string | undefined): string | null {
  if (!date) return null;
  if (date instanceof Date) {
    if (isNaN(date.getTime())) return null;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const str = String(date).trim();
  const match = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (!match) return null;
  const y = match[1];
  const m = match[2].padStart(2, '0');
  const d = match[3].padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Ticket 01: 檢驗處置股票事件於基準日是否在生效區間內
 */
export function isDispositionActive(
  event: { startDate?: string; endDate?: string },
  referenceDate: Date | string = new Date()
): boolean {
  const ref = normalizeDateString(referenceDate);
  const start = normalizeDateString(event.startDate);
  const end = normalizeDateString(event.endDate);

  if (!ref || !start || !end) return false;
  return ref >= start && ref <= end;
}

/**
 * Ticket 02: 檢驗注意股票事件於基準日是否有效（容許當日及前 1 個自然日）
 */
export function isAttentionActive(
  event: { eventDate?: string },
  referenceDate: Date | string = new Date()
): boolean {
  const ref = normalizeDateString(referenceDate);
  const evt = normalizeDateString(event.eventDate);

  if (!ref || !evt) return false;

  const refTime = new Date(ref).getTime();
  const evtTime = new Date(evt).getTime();
  const diffDays = (refTime - evtTime) / (1000 * 60 * 60 * 24);

  // 公告日等於基準日，或僅落後 1 天（昨日盤後公告）
  return diffDays >= 0 && diffDays <= 1;
}

/**
 * 複合判定標的之最終狀態標籤 ('NORMAL' | 'ATTENTION' | 'DISPOSITION')
 */
export function resolveDispositionAttentionStatus(
  events: DispositionEventInput[] = [],
  referenceDate: Date | string = new Date()
): 'NORMAL' | 'ATTENTION' | 'DISPOSITION' {
  if (!events || events.length === 0) return 'NORMAL';

  // 1. 優先檢查是否有有效處置
  const hasActiveDisposition = events.some(
    (e) => e.type === 'DISPOSITION' && isDispositionActive(e, referenceDate)
  );
  if (hasActiveDisposition) return 'DISPOSITION';

  // 2. 次之檢查是否有有效注意
  const hasActiveAttention = events.some(
    (e) => e.type === 'ATTENTION' && isAttentionActive(e, referenceDate)
  );
  if (hasActiveAttention) return 'ATTENTION';

  return 'NORMAL';
}
