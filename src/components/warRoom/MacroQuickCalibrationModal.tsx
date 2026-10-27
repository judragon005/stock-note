import React, { useState, useEffect } from 'react';
import type { MacroIndicatorSnapshot } from '../../types/macro';

export interface MacroCalibrationFormState {
  us10y: string;
  us2y: string;
  vix: string;
  fearAndGreedIndex: string;
  twFuturesNetOi: string;
  twMarginMaintenance: string;
  creditSpreadOAS: string;
  cdsInsuranceIndex: string;
}

export interface MacroQuickCalibrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  macroSnapshot: MacroIndicatorSnapshot;
  onSave: (updatedSnapshot: MacroIndicatorSnapshot) => void;
}

export const MacroQuickCalibrationModal: React.FC<MacroQuickCalibrationModalProps> = ({
  isOpen,
  onClose,
  macroSnapshot,
  onSave,
}) => {
  const [formData, setFormData] = useState<MacroCalibrationFormState>({
    us10y: '',
    us2y: '',
    vix: '',
    fearAndGreedIndex: '',
    twFuturesNetOi: '',
    twMarginMaintenance: '',
    creditSpreadOAS: '',
    cdsInsuranceIndex: '',
  });

  // 當彈窗開啟或基準快照變化時，在內部自治初始化表單
  useEffect(() => {
    if (isOpen) {
      setFormData({
        us10y: macroSnapshot.us10y.toString(),
        us2y: macroSnapshot.us2y.toString(),
        vix: macroSnapshot.vix.toString(),
        fearAndGreedIndex: macroSnapshot.fearAndGreedIndex.toString(),
        twFuturesNetOi: (macroSnapshot.twFuturesNetOi ?? -15000).toString(),
        twMarginMaintenance: (macroSnapshot.twMarginMaintenance ?? 165.2).toString(),
        creditSpreadOAS: (macroSnapshot.creditSpreadOAS ?? 3.5).toString(),
        cdsInsuranceIndex: (macroSnapshot.cdsInsuranceIndex ?? 65).toString(),
      });
    }
  }, [isOpen, macroSnapshot]);

  if (!isOpen) return null;

  const handleChange = (field: keyof MacroCalibrationFormState, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const us10yNum = parseFloat(formData.us10y) || 3.85;
    const us2yNum = parseFloat(formData.us2y) || 3.95;
    const vixNum = parseFloat(formData.vix) || 18.5;
    const fgNum = parseInt(formData.fearAndGreedIndex, 10) || 50;
    const oiNum = parseInt(formData.twFuturesNetOi, 10) || -15000;
    const marginNum = parseFloat(formData.twMarginMaintenance) || 165.2;
    const oasNum = parseFloat(formData.creditSpreadOAS) || 3.5;
    const cdsNum = parseFloat(formData.cdsInsuranceIndex) || 65;

    const yieldSpread = Math.round((us10yNum - us2yNum) * 100) / 100;
    const updated: MacroIndicatorSnapshot = {
      ...macroSnapshot,
      us10y: us10yNum,
      us2y: us2yNum,
      yieldSpread,
      isYieldInverted: yieldSpread < 0,
      vix: vixNum,
      vixLevel: vixNum >= 30 ? 'PANIC' : vixNum >= 20 ? 'ELEVATED' : 'NORMAL',
      fearAndGreedIndex: fgNum,
      fearAndGreedLevel:
        fgNum <= 25 ? 'EXTREME_FEAR' : fgNum <= 45 ? 'FEAR' : fgNum <= 55 ? 'NEUTRAL' : fgNum <= 75 ? 'GREED' : 'EXTREME_GREED',
      twFuturesNetOi: oiNum,
      twMarginMaintenance: marginNum,
      creditSpreadOAS: oasNum,
      cdsInsuranceIndex: cdsNum,
      date: new Date().toISOString().split('T')[0],
      updatedAt: Date.now(),
    };

    onSave(updated);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
      }}
    >
      <div
        style={{
          background: 'var(--bg-secondary, #1e293b)',
          borderRadius: '16px',
          border: '1px solid rgba(148, 163, 184, 0.2)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
          width: '100%',
          maxWidth: '560px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(148, 163, 184, 0.15)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem' }}>✏️</span>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              10 秒極簡快速校準宏觀數據
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: '1.2rem',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
          <p
            style={{
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              margin: '0 0 16px 0',
              lineHeight: 1.5,
            }}
          >
            手動覆寫最新數據以消除歷史滯後。儲存後將即時重算水溫計、作戰姿態並注入晨會簡報。
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                美債 10 年期殖利率 (%)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.us10y}
                onChange={(e) => handleChange('us10y', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(148, 163, 184, 0.25)',
                  background: 'var(--bg-primary, #0f172a)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                美債 2 年期殖利率 (%)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.us2y}
                onChange={(e) => handleChange('us2y', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(148, 163, 184, 0.25)',
                  background: 'var(--bg-primary, #0f172a)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                VIX 恐慌指數
              </label>
              <input
                type="number"
                step="0.1"
                required
                value={formData.vix}
                onChange={(e) => handleChange('vix', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(148, 163, 184, 0.25)',
                  background: 'var(--bg-primary, #0f172a)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                CNN 恐懼貪婪指數 (0~100)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                required
                value={formData.fearAndGreedIndex}
                onChange={(e) => handleChange('fearAndGreedIndex', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(148, 163, 184, 0.25)',
                  background: 'var(--bg-primary, #0f172a)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                外資台指期未平倉淨口數 (負為空單)
              </label>
              <input
                type="number"
                step="100"
                placeholder="如 -45000"
                value={formData.twFuturesNetOi}
                onChange={(e) => handleChange('twFuturesNetOi', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(148, 163, 184, 0.25)',
                  background: 'var(--bg-primary, #0f172a)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                全市場融資維持率 (%)
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="如 165.2"
                value={formData.twMarginMaintenance}
                onChange={(e) => handleChange('twMarginMaintenance', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(148, 163, 184, 0.25)',
                  background: 'var(--bg-primary, #0f172a)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                高收益債信用利差 OAS (%)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="如 3.5"
                value={formData.creditSpreadOAS}
                onChange={(e) => handleChange('creditSpreadOAS', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(148, 163, 184, 0.25)',
                  background: 'var(--bg-primary, #0f172a)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                CDS 信用違約交換指數 (基點)
              </label>
              <input
                type="number"
                step="1"
                placeholder="如 65"
                value={formData.cdsInsuranceIndex}
                onChange={(e) => handleChange('cdsInsuranceIndex', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(148, 163, 184, 0.25)',
                  background: 'var(--bg-primary, #0f172a)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              style={{ fontSize: '0.82rem', padding: '7px 16px' }}
            >
              取消
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ fontSize: '0.82rem', padding: '7px 18px' }}
            >
              💾 儲存並即時重算
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
