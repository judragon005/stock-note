import React from 'react';
import { FrictionSummary, BrokerAccount } from '../types/stock';
import { TaxComplianceStatus, TwNhiAlertItem } from '../types/dividend';
import { X, TrendingDown, Award, AlertCircle, Percent, Coins, Receipt, ShieldAlert, FileText } from 'lucide-react';

interface FrictionCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  frictionSummary?: FrictionSummary;
  accounts: BrokerAccount[];
  selectedAccountId: string;
  taxComplianceStatus?: TaxComplianceStatus;
}

export const FrictionCenterModal: React.FC<FrictionCenterModalProps> = ({
  isOpen,
  onClose,
  frictionSummary,
  accounts,
  selectedAccountId,
  taxComplianceStatus,
}) => {
  if (!isOpen || !frictionSummary) return null;

  const currentAccount = selectedAccountId === 'ALL'
    ? null
    : accounts.find((a) => a.id === selectedAccountId);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        animation: 'fadeIn 0.2s ease-in-out',
      }}
    >
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid rgba(51, 65, 85, 0.8)',
          borderRadius: '18px',
          width: '100%',
          maxWidth: '780px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
          color: '#ffffff',
        }}
      >
        {/* 頂部標頭 (Header) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid rgba(51, 65, 85, 0.6)',
            background: 'rgba(15, 23, 42, 0.9)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                color: '#fbbf24',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Coins size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#ffffff' }}>
                  交易摩擦成本與稅務合規分析儀
                </h2>
                <span
                  style={{
                    fontSize: '0.72rem',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    background: 'rgba(59, 130, 246, 0.2)',
                    color: '#60a5fa',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    fontWeight: 600,
                  }}
                >
                  {currentAccount ? currentAccount.name : '全帳戶合併透視'}
                </span>
              </div>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                穿透手續費、證券交易稅、二代健保 (2.11%) 與美股海外所得 (AMT) 稅階衝擊
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(51, 65, 85, 0.4)',
              border: 'none',
              borderRadius: '8px',
              padding: '6px',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              transition: 'all 0.2s',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* 內容主體 (Content Body) */}
        <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* 4 大核心發光指標卡 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
            {/* 1. 歷史買進手續費 */}
            <div style={{ padding: '14px', background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(51, 65, 85, 0.7)', borderRadius: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>
                <span>累計買進手續費</span>
                <Receipt size={14} color="#60a5fa" />
              </div>
              <div className="mono" style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff' }}>
                NT$ {frictionSummary.totalBuyFee.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '4px' }}>建倉交易實扣佣金</div>
            </div>

            {/* 2. 歷史賣出稅費 */}
            <div style={{ padding: '14px', background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(51, 65, 85, 0.7)', borderRadius: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>
                <span>累計賣出稅費</span>
                <TrendingDown size={14} color="#f43f5e" />
              </div>
              <div className="mono" style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff' }}>
                NT$ {(frictionSummary.totalSellFee + frictionSummary.totalSellTax).toLocaleString()}
              </div>
              <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '4px' }}>
                稅 {frictionSummary.totalSellTax.toLocaleString()} / 費 {frictionSummary.totalSellFee.toLocaleString()}
              </div>
            </div>

            {/* 3. 券商折讓已省下 */}
            <div style={{ padding: '14px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.35)', borderRadius: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#34d399', fontWeight: 600, marginBottom: '4px' }}>
                <span>券商折讓已省下</span>
                <Award size={14} color="#34d399" />
              </div>
              <div className="mono" style={{ fontSize: '1.2rem', fontWeight: 800, color: '#34d399' }}>
                +NT$ {frictionSummary.totalFeeSavedByDiscount.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.68rem', color: '#059669', marginTop: '4px' }}>基準：法定牌告 20元+0.1425%</div>
            </div>

            {/* 4. 預估出清摩擦成本 */}
            <div style={{ padding: '14px', background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.35)', borderRadius: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#fbbf24', fontWeight: 600, marginBottom: '4px' }}>
                <span>預估出清摩擦成本</span>
                <Percent size={14} color="#fbbf24" />
              </div>
              <div className="mono" style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fbbf24' }}>
                NT$ {frictionSummary.totalEstimatedFutureFriction.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.68rem', color: '#d97706', marginTop: '4px' }}>
                預估稅 {frictionSummary.totalEstimatedFutureTax.toLocaleString()} / 費 {frictionSummary.totalEstimatedFutureFee.toLocaleString()}
              </div>
            </div>
          </div>

          {/* 稅階合規與海外所得進度條 (Tax Compliance & AMT Progress) */}
          {taxComplianceStatus && (
            <div
              style={{
                padding: '16px',
                background: 'rgba(30, 41, 59, 0.7)',
                border: '1px solid rgba(51, 65, 85, 0.8)',
                borderRadius: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldAlert size={18} color="#f59e0b" />
                  <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#ffffff' }}>
                    {taxComplianceStatus.usOverseasIncome.taxYear} 年度海外所得與二代健保合規進度
                  </h3>
                </div>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>事前稅階預警</span>
              </div>

              {/* 美股海外所得進度 */}
              <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '12px 14px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', flexWrap: 'wrap', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#cbd5e1', fontWeight: 600 }}>
                    <FileText size={14} color="#60a5fa" />
                    <span>美股海外所得申報門檻 (基本所得額)</span>
                  </div>
                  <div style={{ color: '#94a3b8' }}>
                    當年度累積：
                    <span className="mono" style={{ fontWeight: 700, color: '#ffffff' }}>
                      NT$ {taxComplianceStatus.usOverseasIncome.totalOverseasIncomeTWD.toLocaleString()}
                    </span>{' '}
                    / 門檻 NT$ 1,000,000
                  </div>
                </div>

                {/* 100 萬申報門檻進度條 */}
                <div style={{ width: '100%', height: '8px', background: 'rgba(51, 65, 85, 0.6)', borderRadius: '6px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min(100, taxComplianceStatus.usOverseasIncome.filingProgressPercent)}%`,
                      background: taxComplianceStatus.usOverseasIncome.isFilingRequired
                        ? '#ef4444'
                        : 'linear-gradient(90deg, #3b82f6 0%, #10b981 100%)',
                      borderRadius: '6px',
                      transition: 'width 0.5s ease',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#94a3b8' }}>
                  <span>
                    進度：<b>{taxComplianceStatus.usOverseasIncome.filingProgressPercent}%</b>{' '}
                    {taxComplianceStatus.usOverseasIncome.isFilingRequired && '⚠️ 達 100 萬需於 5 月綜所稅申報基本所得額'}
                  </span>
                  <span>最低稅負免稅額 (750 萬) 進度：<b>{taxComplianceStatus.usOverseasIncome.amtProgressPercent}%</b></span>
                </div>
              </div>

              {/* 台股二代健保除息預警清單 */}
              {taxComplianceStatus.twNhiAlerts.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertCircle size={14} color="#f59e0b" />
                    <span>即將除息之台股二代健保 (2.11%) 預警清單</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '8px' }}>
                    {taxComplianceStatus.twNhiAlerts.map((alert: TwNhiAlertItem) => (
                      <div
                        key={alert.symbol}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '8px',
                          fontSize: '0.75rem',
                          background: alert.triggersNhi ? 'rgba(245, 158, 11, 0.15)' : 'rgba(15, 23, 42, 0.6)',
                          border: alert.triggersNhi ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid rgba(51, 65, 85, 0.6)',
                          color: alert.triggersNhi ? '#fef3c7' : '#94a3b8',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                          <span>{alert.symbol} {alert.name}</span>
                          <span>預估股利 NT$ {alert.grossDividendTWD.toLocaleString()}</span>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#cbd5e1', marginTop: '4px' }}>{alert.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 專業法規與摩擦成本優化指南 */}
          <div
            style={{
              padding: '14px 16px',
              borderRadius: '12px',
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
            }}
          >
            <AlertCircle size={18} color="#60a5fa" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.75rem', color: '#cbd5e1', lineHeight: 1.5 }}>
              <b style={{ color: '#93c5fd' }}>摩擦成本優化與法規指南：</b><br />
              1. <strong>台股手續費低消</strong>：標準牌告手續費設有 NT$ 20 低消。小額零股建議使用具備 1 元低消與 2.8 折/2 折券商。<br />
              2. <strong>台股證券交易稅率分層</strong>：普通股票 0.3%；股票 ETF 0.1%；債券型 ETF（以 B 結尾）依法停徵證交稅（0%）。<br />
              3. <strong>美股投資摩擦</strong>：海外券商免手續費，現金股利自動預扣 30% IRS 預扣稅；賣出時僅收取微量 SEC / FINRA 規費。
            </div>
          </div>
        </div>

        {/* 底部按鈕 (Footer) */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(51, 65, 85, 0.6)', background: 'rgba(15, 23, 42, 0.9)', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 20px',
              fontSize: '0.8rem',
              fontWeight: 600,
              background: '#334155',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
};
