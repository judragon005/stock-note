import React from 'react';
import { PendingSettlementItem } from '../engine/cashLedgerEngine';
import { CheckCircle2, Building2, Calendar } from 'lucide-react';

export interface PendingSettlementCardProps {
  item: PendingSettlementItem;
  onToggleStatus: (transactionId: string) => void;
}

/**
 * 取得交易類別標籤與視覺配色 (Test Seam)
 */
export function getCategoryBadge(type: string, category?: string) {
  const cat = category || type;
  if (cat === 'STOCK_BUY' || type === 'STOCK_BUY') {
    return { label: '股票買進', color: '#f87171', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.35)' };
  }
  if (cat === 'STOCK_SELL' || type === 'STOCK_SELL') {
    return { label: '股票賣出', color: '#34d399', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.35)' };
  }
  if (cat === 'DIVIDEND' || cat === 'DIVIDEND_PAYOUT' || type === 'DIVIDEND' || type === 'DIVIDEND_PAYOUT') {
    return { label: '現金股息', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.35)' };
  }
  if (cat === 'INTEREST' || cat === 'INTEREST_INCOME' || type === 'INTEREST' || type === 'INTEREST_INCOME') {
    return { label: '利息收入', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)', border: 'rgba(56, 189, 248, 0.35)' };
  }
  if (cat === 'DEPOSIT' || type === 'DEPOSIT') {
    return { label: '資金存入', color: '#60a5fa', bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.35)' };
  }
  if (cat === 'WITHDRAWAL' || type === 'WITHDRAWAL') {
    return { label: '資金提領', color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)', border: 'rgba(249, 115, 22, 0.35)' };
  }
  return { label: '資金異動', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)', border: 'rgba(148, 163, 184, 0.35)' };
}

/**
 * 取得時序倒數徽章 (Test Seam)
 */
export function getCountdownBadge(days: number) {
  if (days < 0) {
    return { text: `逾期 ${Math.abs(days)} 天`, color: '#f87171', bg: 'rgba(239, 68, 68, 0.2)' };
  }
  if (days === 0) {
    return { text: '今日到期', color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.25)' };
  }
  if (days === 1) {
    return { text: '明日到期', color: '#60a5fa', bg: 'rgba(59, 130, 246, 0.2)' };
  }
  return { text: `${days} 天後`, color: '#cbd5e1', bg: 'rgba(51, 65, 85, 0.5)' };
}

/**
 * 在途資金時序排程單一項目條列 (Pending Settlement Item Row)
 * 專職單行展示在途款項：[交割日/倒數] + [類別] + [券商] + [備註說明] + [金額] + [一鍵核銷]
 */
export const PendingSettlementCard: React.FC<PendingSettlementCardProps> = ({
  item,
  onToggleStatus,
}) => {
  const isPos = item.amount > 0;
  const isTW = item.currency === 'TWD';
  const catBadge = getCategoryBadge(item.type, item.category);
  const countdown = getCountdownBadge(item.daysUntilSettlement);

  return (
    <div
      style={{
        background: 'rgba(15, 23, 42, 0.65)',
        border: '1px solid rgba(51, 65, 85, 0.5)',
        borderRadius: '10px',
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '14px',
        transition: 'all 0.15s ease',
      }}
    >
      {/* 1. 左側：交割日 + 倒數徽章 + 類別標籤 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Calendar size={13} color="#94a3b8" />
          <span className="mono" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f1f5f9' }}>
            {item.settlementDate}
          </span>
        </div>
        <span
          style={{
            fontSize: '0.68rem',
            padding: '2px 7px',
            borderRadius: '9999px',
            fontWeight: 700,
            color: countdown.color,
            background: countdown.bg,
            border: `1px solid ${countdown.color}40`,
            whiteSpace: 'nowrap',
          }}
        >
          {countdown.text}
        </span>
        <span
          style={{
            fontSize: '0.7rem',
            padding: '2px 7px',
            borderRadius: '5px',
            fontWeight: 600,
            color: catBadge.color,
            background: catBadge.bg,
            border: `1px solid ${catBadge.border}`,
            whiteSpace: 'nowrap',
          }}
        >
          {catBadge.label}
        </span>
      </div>

      {/* 2. 中間：券商帳戶 + 備註說明 */}
      <div style={{ minWidth: 0, flex: 1, display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0, maxWidth: '220px' }}>
          <Building2 size={13} color="#64748b" />
          <span
            style={{
              fontSize: '0.82rem',
              fontWeight: 700,
              color: '#e2e8f0',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={item.accountName}
          >
            {item.accountName}
          </span>
        </div>
        {item.note ? (
          <div
            style={{
              fontSize: '0.76rem',
              color: '#94a3b8',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
            }}
            title={item.note}
          >
            {item.note}
          </div>
        ) : null}
      </div>

      {/* 3. 右側：金額 + 一鍵核銷按鈕 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        <span
          className="mono"
          style={{
            fontSize: '0.92rem',
            fontWeight: 800,
            color: isPos ? '#34d399' : '#f87171',
            whiteSpace: 'nowrap',
            textAlign: 'right',
            minWidth: '100px',
          }}
        >
          {isPos ? '+' : '-'}
          {isTW
            ? `NT$ ${Math.abs(Math.round(item.amount)).toLocaleString()}`
            : `$${Math.abs(item.amount).toFixed(2)}`}
        </span>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => onToggleStatus(item.transactionId)}
          style={{
            padding: '4px 10px',
            fontSize: '0.72rem',
            fontWeight: 600,
            background: 'rgba(16, 185, 129, 0.15)',
            color: '#34d399',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            whiteSpace: 'nowrap',
          }}
          title="點擊直接確認交割入帳/扣款"
        >
          <CheckCircle2 size={12} /> 一鍵核銷
        </button>
      </div>
    </div>
  );
};
