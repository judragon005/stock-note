import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  ModalShell,
  MODAL_LAYER_Z_INDEX,
  createOverlayKernel,
  computeTabFocusIndex,
  evaluateModalCloseRequest,
  shouldCloseModalOnKeyDown,
  shouldCloseModalOnBackdropClick,
} from './ModalShell';
import { ExportDatabaseModal } from '../ExportDatabaseModal';
import { BrokerAccountsModal } from '../BrokerAccountsModal';
import { XirrDetailModal } from '../XirrDetailModal';

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

  describe('Spec 0250 T01 & T02: Viewport Overlay Kernel (堆疊仲裁、引用計數捲動鎖、焦點陷阱與髒表單攔截)', () => {
    it('T01: 支援 layout="flex-fixed"、三層 z-index 與 ariaLabel 公開渲染契約', () => {
      expect(MODAL_LAYER_Z_INDEX).toEqual({
        base: 1000,
        nested: 1100,
        critical: 1200,
      });

      const html = renderToStaticMarkup(
        React.createElement(
          ModalShell,
          {
            isOpen: true,
            onClose: () => {},
            layout: 'flex-fixed',
            layer: 'critical',
            ariaLabel: 'E2EE 主密碼驗證',
            maxWidth: '460px',
          },
          React.createElement('div', null, 'Fixed Layout Body')
        )
      );

      expect(html).toContain('modal-content--flex-fixed');
      expect(html).toContain('z-index:1200');
      expect(html).toContain('aria-label="E2EE 主密碼驗證"');
      expect(html).toContain('tabindex="-1"');
    });

    it('T01: OverlayStack 僅允許堆疊頂端彈窗響應 Escape，且非 LIFO 卸載後頂層轉移正確', () => {
      const kernel = createOverlayKernel();
      const modalA = Symbol('modalA');
      const modalB = Symbol('modalB');
      const modalC = Symbol('modalC');

      kernel.register(modalA);
      kernel.register(modalB);
      expect(kernel.isTop(modalA)).toBe(false);
      expect(kernel.isTop(modalB)).toBe(true);

      // 非 LIFO：先卸載底層 modalA，頂端仍為 modalB
      kernel.unregister(modalA);
      expect(kernel.isTop(modalB)).toBe(true);
      expect(kernel.size()).toBe(1);

      // 再開 modalC 後關閉 modalC，頂端回到 modalB
      kernel.register(modalC);
      expect(kernel.isTop(modalC)).toBe(true);
      kernel.unregister(modalC);
      expect(kernel.isTop(modalB)).toBe(true);
      kernel.unregister(modalB);
      expect(kernel.size()).toBe(0);
    });

    it('T01: ScrollLockLedger 引用計數鎖免疫非 LIFO 關閉競態，僅最後一顆關閉才還原 overflow', () => {
      const kernel = createOverlayKernel();
      const mockBodyStyle = { overflow: 'auto' };
      const modalA = Symbol('modalA');
      const modalB = Symbol('modalB');

      kernel.acquireScrollLock(modalA, mockBodyStyle);
      expect(mockBodyStyle.overflow).toBe('hidden');
      expect(kernel.activeScrollLockCount()).toBe(1);

      kernel.acquireScrollLock(modalB, mockBodyStyle);
      expect(mockBodyStyle.overflow).toBe('hidden');
      expect(kernel.activeScrollLockCount()).toBe(2);

      // 非 LIFO：先關 modalA，背景仍須維持 hidden
      kernel.releaseScrollLock(modalA, mockBodyStyle);
      expect(mockBodyStyle.overflow).toBe('hidden');
      expect(kernel.activeScrollLockCount()).toBe(1);

      // 重複釋放同一鎖應為冪等 no-op
      kernel.releaseScrollLock(modalA, mockBodyStyle);
      expect(mockBodyStyle.overflow).toBe('hidden');

      // 最後關閉 modalB 才精準還原原始 'auto'
      kernel.releaseScrollLock(modalB, mockBodyStyle);
      expect(mockBodyStyle.overflow).toBe('auto');
      expect(kernel.activeScrollLockCount()).toBe(0);
    });

    it('T02: computeTabFocusIndex 實現原生焦點陷阱首尾循環', () => {
      expect(computeTabFocusIndex(0, 0, false)).toBe(-1);
      // 正向 Tab：最後一個元素回到 0
      expect(computeTabFocusIndex(2, 3, false)).toBe(0);
      expect(computeTabFocusIndex(0, 3, false)).toBe(1);
      // 反向 Shift+Tab：第一個元素或容器本身(-1)跳到最後一個
      expect(computeTabFocusIndex(0, 3, true)).toBe(2);
      expect(computeTabFocusIndex(-1, 3, true)).toBe(2);
      expect(computeTabFocusIndex(2, 3, true)).toBe(1);
    });

    it('T02: evaluateModalCloseRequest 依序仲裁硬鎖 (LOCKED) > 髒表單 (CONFIRM_DIRTY) > 放行 (ALLOW)', () => {
      expect(evaluateModalCloseRequest({ closeLocked: true, dirty: true })).toBe('LOCKED');
      expect(evaluateModalCloseRequest({ closeLocked: false, dirty: true })).toBe('CONFIRM_DIRTY');
      expect(
        evaluateModalCloseRequest({
          closeLocked: false,
          dirty: false,
          onBeforeClose: () => false,
        })
      ).toBe('CONFIRM_DIRTY');
      expect(
        evaluateModalCloseRequest({
          closeLocked: false,
          dirty: false,
          onBeforeClose: () => true,
        })
      ).toBe('ALLOW');
      expect(evaluateModalCloseRequest({})).toBe('ALLOW');
    });

    it('Seam 3 (T04 & T05): BrokerAccountsModal 與 XirrDetailModal 透過 ModalShell flex-fixed 渲染且零幽靈 Tailwind 類別', () => {
      const brokerHtml = renderToStaticMarkup(
        React.createElement(BrokerAccountsModal, {
          isOpen: true,
          onClose: () => {},
          accounts: [
            {
              id: 'b-1',
              name: '國泰證券 (2.8折)',
              market: 'TW',
              feeRate: 0.001425,
              discountRate: 0.28,
              minFee: 1,
              taxRate: 0.003,
              isDefault: true,
              createdAt: 1700000000000,
            },
          ],
          onSaveAccounts: () => {},
        })
      );
      expect(brokerHtml).toContain('role="dialog"');
      expect(brokerHtml).toContain('aria-modal="true"');
      expect(brokerHtml).toContain('modal-content--flex-fixed');
      expect(brokerHtml).not.toContain('bg-slate-');
      expect(brokerHtml).not.toContain('fixed inset-0');

      const xirrHtml = renderToStaticMarkup(
        React.createElement(XirrDetailModal, {
          isOpen: true,
          onClose: () => {},
          title: '2330 XIRR 拆解',
          result: {
            rate: 0.125,
            ratePercent: 12.5,
            simpleReturnPercent: 15.0,
            isAnnualized: true,
            totalInflow: 100000,
            totalOutflow: 115000,
            durationDays: 365,
            method: 'NEWTON_RAPHSON',
            iterations: 4,
          },
          cashFlows: [
            { date: '2025-01-01', amount: -100000, category: 'BUY', description: '買進' },
            { date: '2026-01-01', amount: 115000, category: 'TERMINAL_VALUE', description: '期末市值' },
          ],
          currency: 'TWD',
        })
      );
      expect(xirrHtml).toContain('role="dialog"');
      expect(xirrHtml).toContain('modal-content--flex-fixed');
      expect(xirrHtml).toContain('股票買進');
      expect(xirrHtml).not.toContain('bg-blue-500/20');
    });
  });
});
