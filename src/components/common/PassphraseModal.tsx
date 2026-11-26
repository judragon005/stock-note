import React, { useEffect, useState } from 'react';
import { Lock, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { ModalShell } from './ModalShell';

export type PassphraseModalMode = 'setup' | 'unlock';

export interface PassphraseValidationResult {
  ok: boolean;
  error?: string;
}

/**
 * 驗證 E2EE 主密碼輸入（公開 Seam 純函式）
 */
export function validatePassphraseSubmission(
  mode: PassphraseModalMode,
  passphrase: string,
  confirmPassphrase: string
): PassphraseValidationResult {
  if (!passphrase || !passphrase.trim()) {
    return {
      ok: false,
      error: mode === 'setup' ? '請輸入 E2EE 加密主密碼' : '請輸入解密主密碼',
    };
  }
  if (mode === 'setup' && passphrase !== confirmPassphrase) {
    return {
      ok: false,
      error: '兩次輸入的主密碼不一致，請重新確認',
    };
  }
  return { ok: true };
}

export interface PassphraseModalProps {
  isOpen: boolean;
  mode: PassphraseModalMode;
  title: string;
  description?: string;
  confirmLabel?: string;
  onSubmit: (passphrase: string) => void;
  onCancel: () => void;
}

/**
 * E2EE 零知識加密主密碼遮罩輸入原語 (Spec 0250 T03)
 * - 掛載於 ModalShell critical 層級 (z-index: 1200)，取代明文 window.prompt()
 * - 關閉或送出時立即清空元件內密碼狀態
 */
export const PassphraseModal: React.FC<PassphraseModalProps> = ({
  isOpen,
  mode,
  title,
  description,
  confirmLabel,
  onSubmit,
  onCancel,
}) => {
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setPassphrase('');
      setConfirmPassphrase('');
      setShowPassword(false);
      setErrorMsg(null);
    }
  }, [isOpen]);

  const handleClose = () => {
    setPassphrase('');
    setConfirmPassphrase('');
    setShowPassword(false);
    setErrorMsg(null);
    onCancel();
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validatePassphraseSubmission(mode, passphrase, confirmPassphrase);
    if (!validation.ok) {
      setErrorMsg(validation.error ?? '密碼驗證失敗');
      return;
    }
    const secret = passphrase;
    setPassphrase('');
    setConfirmPassphrase('');
    setShowPassword(false);
    setErrorMsg(null);
    onSubmit(secret);
  };

  const inputType = showPassword ? 'text' : 'password';

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={handleClose}
      layer="critical"
      maxWidth="440px"
      ariaLabelledBy="passphrase-modal-title"
    >
      <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(139, 92, 246, 0.16)',
              border: '1px solid rgba(139, 92, 246, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#a78bfa',
              flexShrink: 0,
            }}
          >
            <Lock size={18} />
          </div>
          <div>
            <h3 id="passphrase-modal-title" style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>
              {title}
            </h3>
            {description && (
              <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {description}
              </p>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label
              htmlFor="e2ee-passphrase-input"
              style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '6px' }}
            >
              主密碼
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="e2ee-passphrase-input"
                type={inputType}
                autoComplete="new-password"
                value={passphrase}
                onChange={(e) => {
                  setPassphrase(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder={mode === 'setup' ? '請設定加密主密碼（遺失無法找回）' : '請輸入解密主密碼'}
                style={{ width: '100%', paddingRight: '40px' }}
              />
              <button
                type="button"
                aria-label={showPassword ? '隱藏密碼' : '顯示密碼'}
                onClick={() => setShowPassword((prev) => !prev)}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {mode === 'setup' && (
            <div>
              <label
                htmlFor="e2ee-passphrase-confirm"
                style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '6px' }}
              >
                再次輸入主密碼確認
              </label>
              <input
                id="e2ee-passphrase-confirm"
                type={inputType}
                autoComplete="new-password"
                value={confirmPassphrase}
                onChange={(e) => {
                  setConfirmPassphrase(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="請再次輸入相同主密碼"
                style={{ width: '100%' }}
              />
            </div>
          )}
        </div>

        {errorMsg && (
          <div
            role="alert"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.14)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              color: '#fca5a5',
              fontSize: '0.8rem',
            }}
          >
            <AlertTriangle size={15} />
            <span>{errorMsg}</span>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
          <button type="button" className="btn-secondary" onClick={handleClose}>
            取消
          </button>
          <button type="submit" className="btn-primary">
            {confirmLabel ?? (mode === 'setup' ? '確認加密匯出' : '確認解密匯入')}
          </button>
        </div>
      </form>
    </ModalShell>
  );
};
