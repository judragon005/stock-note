import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  ModalShell,
  shouldCloseModalOnKeyDown,
  shouldCloseModalOnBackdropClick,
} from './ModalShell';
import { ExportDatabaseModal } from '../ExportDatabaseModal';

describe('Spec 0245 Seam 1 (T01 & T02): ModalShell 視口傳送原語與 ExportDatabaseModal 遷移', () => {
  describe('T01: ModalShell 公開契約與互動守衛', () => {
    it('isOpen=false 時不掛載任何節點', () => {
      const html = renderToStaticMarkup(
        React.createElement(
          ModalShell,
          { isOpen: false, onClose: () => {}, ariaLabelledBy: 'test-title' },
          React.createElement('div', null, 'Hidden Body')
        )
      );
      expect(html).toBe('');
    });

    it('isOpen=true 時輸出標準 .modal-overlay、glass-card modal-content、role="dialog"、aria-modal="true" 與 maxWidth', () => {
      const html = renderToStaticMarkup(
        React.createElement(
          ModalShell,
          {
            isOpen: true,
            onClose: () => {},
            ariaLabelledBy: 'modal-heading-1',
            maxWidth: '580px',
          },
          React.createElement('h3', { id: 'modal-heading-1' }, 'Dialog Title')
        )
      );
      expect(html).toContain('class="modal-overlay"');
      expect(html).toContain('class="glass-card modal-content"');
      expect(html).toContain('role="dialog"');
      expect(html).toContain('aria-modal="true"');
      expect(html).toContain('aria-labelledby="modal-heading-1"');
      expect(html).toContain('max-width:580px');
      expect(html).toContain('Dialog Title');
    });

    it('Escape 鍵與遮罩點擊在 closeLocked=false 時允許關閉，在 closeLocked=true 時鎖定禁止關閉', () => {
      expect(shouldCloseModalOnKeyDown('Escape', false)).toBe(true);
      expect(shouldCloseModalOnKeyDown('Enter', false)).toBe(false);
      expect(shouldCloseModalOnKeyDown('Escape', true)).toBe(false);

      expect(shouldCloseModalOnBackdropClick(true, false)).toBe(true);
      expect(shouldCloseModalOnBackdropClick(false, false)).toBe(false);
      expect(shouldCloseModalOnBackdropClick(true, true)).toBe(false);
    });
  });

  describe('T02: ExportDatabaseModal 透過 ModalShell 視口居中渲染', () => {
    it('開啟時輸出 .modal-overlay 與 glass-card modal-content，不再使用未定義的 .modal-backdrop', () => {
      const html = renderToStaticMarkup(
        React.createElement(ExportDatabaseModal, {
          isOpen: true,
          onClose: () => {},
          tradesCount: 696,
          cashTransactionsCount: 729,
          accountsCount: 2,
          loansCount: 8,
          onConfirmExport: () => {},
        })
      );

      expect(html).toContain('class="modal-overlay"');
      expect(html).toContain('class="glass-card modal-content"');
      expect(html).toContain('role="dialog"');
      expect(html).toContain('aria-modal="true"');
      expect(html).not.toContain('modal-backdrop');
      expect(html).toContain('系統全態封包匯出 (跨裝置 / NAS 遷移)');
      expect(html).toContain('696');
      expect(html).toContain('729');
    });

    it('關閉時不渲染任何節點', () => {
      const html = renderToStaticMarkup(
        React.createElement(ExportDatabaseModal, {
          isOpen: false,
          onClose: () => {},
          tradesCount: 0,
          cashTransactionsCount: 0,
          accountsCount: 0,
          loansCount: 0,
          onConfirmExport: () => {},
        })
      );
      expect(html).toBe('');
    });
  });
});
