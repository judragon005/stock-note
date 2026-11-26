import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  PassphraseModal,
  validatePassphraseSubmission,
} from './PassphraseModal';

describe('Spec 0250 Seam 2 (T03): PassphraseModal E2EE 遮罩密碼原語', () => {
  it('validatePassphraseSubmission 在 setup 模式阻擋空白與兩次輸入不一致', () => {
    expect(validatePassphraseSubmission('setup', '', '')).toEqual({
      ok: false,
      error: '請輸入 E2EE 加密主密碼',
    });
    expect(validatePassphraseSubmission('setup', 'secret123', 'secret456')).toEqual({
      ok: false,
      error: '兩次輸入的主密碼不一致，請重新確認',
    });
    expect(validatePassphraseSubmission('setup', 'secret123', 'secret123')).toEqual({
      ok: true,
    });
  });

  it('validatePassphraseSubmission 在 unlock 模式驗證非空密碼', () => {
    expect(validatePassphraseSubmission('unlock', '   ', '')).toEqual({
      ok: false,
      error: '請輸入解密主密碼',
    });
    expect(validatePassphraseSubmission('unlock', 'my-master-key', '')).toEqual({
      ok: true,
    });
  });

  it('setup 模式掛載於 ModalShell critical 層級 (z-index:1200) 並輸出兩組遮罩 password 欄位', () => {
    const html = renderToStaticMarkup(
      React.createElement(PassphraseModal, {
        isOpen: true,
        mode: 'setup',
        title: '設定 E2EE 加密主密碼',
        onCancel: () => {},
        onSubmit: () => {},
      })
    );
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('z-index:1200');
    expect(html).toContain('type="password"');
    expect(html).toContain('autoComplete="new-password"');
    expect(html).toContain('設定 E2EE 加密主密碼');
    expect(html).toContain('再次輸入主密碼確認');
  });

  it('unlock 模式僅輸出單一遮罩 password 欄位，isOpen=false 回傳空字串', () => {
    const unlockHtml = renderToStaticMarkup(
      React.createElement(PassphraseModal, {
        isOpen: true,
        mode: 'unlock',
        title: '解密 E2EE 備份檔案',
        onCancel: () => {},
        onSubmit: () => {},
      })
    );
    expect(unlockHtml).toContain('type="password"');
    expect(unlockHtml).not.toContain('再次輸入主密碼確認');

    const closedHtml = renderToStaticMarkup(
      React.createElement(PassphraseModal, {
        isOpen: false,
        mode: 'unlock',
        title: '解密 E2EE 備份檔案',
        onCancel: () => {},
        onSubmit: () => {},
      })
    );
    expect(closedHtml).toBe('');
  });
});
