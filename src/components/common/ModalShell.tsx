import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type ModalLayoutMode = 'scroll' | 'flex-fixed';
export type ModalLayer = 'base' | 'nested' | 'critical';
export type ModalCloseDecision = 'LOCKED' | 'CONFIRM_DIRTY' | 'ALLOW';

export const TOOLTIP_Z_INDEX = 950;

export const MODAL_LAYER_Z_INDEX: Record<ModalLayer, number> = {
  base: 1000,
  nested: 1100,
  critical: 1200,
};

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface OverlayKernel {
  register: (id: symbol) => void;
  unregister: (id: symbol) => void;
  isTop: (id: symbol) => boolean;
  size: () => number;
  acquireScrollLock: (id: symbol, targetStyle?: { overflow: string }) => void;
  releaseScrollLock: (id: symbol, targetStyle?: { overflow: string }) => void;
  activeScrollLockCount: () => number;
}

/**
 * 建立視口對話層作業系統核心 (OverlayStack + ScrollLockLedger)
 * - 確保巢狀彈窗僅頂層接收 Escape
 * - 確保非 LIFO 卸載順序下，背景捲動鎖定僅於最後一顆彈窗關閉後還原
 */
export function createOverlayKernel(): OverlayKernel {
  const stack: symbol[] = [];
  const scrollLocks = new Set<symbol>();
  let savedOverflow: string | null = null;

  return {
    register(id: symbol) {
      if (!stack.includes(id)) {
        stack.push(id);
      }
    },
    unregister(id: symbol) {
      const idx = stack.indexOf(id);
      if (idx !== -1) {
        stack.splice(idx, 1);
      }
    },
    isTop(id: symbol) {
      return stack.length > 0 && stack[stack.length - 1] === id;
    },
    size() {
      return stack.length;
    },
    acquireScrollLock(id: symbol, targetStyle?: { overflow: string }) {
      const style = targetStyle ?? (typeof document !== 'undefined' ? document.body?.style : undefined);
      if (!scrollLocks.has(id)) {
        if (scrollLocks.size === 0 && style) {
          savedOverflow = style.overflow;
          style.overflow = 'hidden';
        }
        scrollLocks.add(id);
      }
    },
    releaseScrollLock(id: symbol, targetStyle?: { overflow: string }) {
      if (!scrollLocks.has(id)) return;
      scrollLocks.delete(id);
      if (scrollLocks.size === 0) {
        const style = targetStyle ?? (typeof document !== 'undefined' ? document.body?.style : undefined);
        if (style && savedOverflow !== null) {
          style.overflow = savedOverflow;
        }
        savedOverflow = null;
      }
    },
    activeScrollLockCount() {
      return scrollLocks.size;
    },
  };
}

const defaultOverlayKernel = createOverlayKernel();

/**
 * 計算原生焦點陷阱 (Focus Trap) 下一個可聚焦元素索引
 */
export function computeTabFocusIndex(
  currentIndex: number,
  totalFocusable: number,
  shiftKey: boolean
): number {
  if (totalFocusable <= 0) return -1;
  if (shiftKey) {
    return currentIndex <= 0 ? totalFocusable - 1 : currentIndex - 1;
  }
  return currentIndex < 0 || currentIndex >= totalFocusable - 1 ? 0 : currentIndex + 1;
}

/**
 * 仲裁關閉請求：硬鎖 (LOCKED) > 髒表單攔截 (CONFIRM_DIRTY) > 放行 (ALLOW)
 */
export function evaluateModalCloseRequest(options: {
  closeLocked?: boolean;
  dirty?: boolean;
  onBeforeClose?: () => boolean;
}): ModalCloseDecision {
  if (options.closeLocked) return 'LOCKED';
  if (options.dirty) return 'CONFIRM_DIRTY';
  if (options.onBeforeClose && !options.onBeforeClose()) return 'CONFIRM_DIRTY';
  return 'ALLOW';
}

export interface ModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  closeLocked?: boolean;
  dirty?: boolean;
  onBeforeClose?: () => boolean;
  layout?: ModalLayoutMode;
  layer?: ModalLayer;
  maxWidth?: string;
  padding?: string;
  ariaLabelledBy?: string;
  ariaLabel?: string;
  dataTestId?: string;
  contentClassName?: string;
  contentStyle?: React.CSSProperties;
  overlayStyle?: React.CSSProperties;
  children?: React.ReactNode;
}

/**
 * 判定鍵盤事件是否應觸發對話框關閉（受 closeLocked 防誤關保護）
 */
export function shouldCloseModalOnKeyDown(key: string, closeLocked = false): boolean {
  return !closeLocked && key === 'Escape';
}

/**
 * 判定遮罩點擊是否應觸發對話框關閉（僅直接點擊外層遮罩且未鎖定時關閉）
 */
export function shouldCloseModalOnBackdropClick(
  isDirectBackdropTarget: boolean,
  closeLocked = false
): boolean {
  return !closeLocked && isDirectBackdropTarget;
}

/**
 * 全域視口傳送彈窗原語 (Viewport Overlay Kernel, Spec 0245 / Spec 0250)
 * - 透過 createPortal 掛載至 document.body，免受父層 backdrop-filter/transform 層疊上下文劫持
 * - 支援 scroll / flex-fixed 雙版面與 base/nested/critical 三層 z-index
 * - 內建 OverlayStack 頂層 Escape 仲裁、ScrollLockLedger 引用計數鎖、Focus Trap 與非阻塞髒表單確認護欄
 */
export const ModalShell: React.FC<ModalShellProps> = ({
  isOpen,
  onClose,
  closeLocked = false,
  dirty = false,
  onBeforeClose,
  layout = 'scroll',
  layer = 'base',
  maxWidth = '580px',
  padding,
  ariaLabelledBy,
  ariaLabel,
  dataTestId,
  contentClassName,
  contentStyle,
  overlayStyle,
  children,
}) => {
  const [showDirtyConfirm, setShowDirtyConfirm] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const modalIdRef = useRef<symbol | null>(null);
  if (modalIdRef.current === null) {
    modalIdRef.current = Symbol('ModalShell');
  }

  const onCloseRef = useRef(onClose);
  const closeLockedRef = useRef(closeLocked);
  const dirtyRef = useRef(dirty);
  const onBeforeCloseRef = useRef(onBeforeClose);

  onCloseRef.current = onClose;
  closeLockedRef.current = closeLocked;
  dirtyRef.current = dirty;
  onBeforeCloseRef.current = onBeforeClose;

  const requestClose = useCallback(() => {
    const decision = evaluateModalCloseRequest({
      closeLocked: closeLockedRef.current,
      dirty: dirtyRef.current,
      onBeforeClose: onBeforeCloseRef.current,
    });
    if (decision === 'LOCKED') return;
    if (decision === 'CONFIRM_DIRTY') {
      setShowDirtyConfirm(true);
      return;
    }
    setShowDirtyConfirm(false);
    onCloseRef.current();
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setShowDirtyConfirm(false);
      return;
    }
    if (typeof document === 'undefined') return;

    const modalId = modalIdRef.current!;
    const previousActive = document.activeElement as HTMLElement | null;

    defaultOverlayKernel.register(modalId);
    defaultOverlayKernel.acquireScrollLock(modalId);

    // 初始焦點定錨至對話框內第一個可聚焦元素（否則聚焦對話框容器）
    const dialogEl = dialogRef.current;
    if (dialogEl) {
      const focusables = dialogEl.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusables.length > 0) {
        focusables[0].focus();
      } else {
        dialogEl.focus();
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!defaultOverlayKernel.isTop(modalId)) return;

      if (e.key === 'Escape') {
        if (shouldCloseModalOnKeyDown(e.key, closeLockedRef.current)) {
          e.preventDefault();
          requestClose();
        }
        return;
      }

      if (e.key === 'Tab' && dialogRef.current) {
        const focusables = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        );
        if (focusables.length === 0) {
          e.preventDefault();
          dialogRef.current.focus();
          return;
        }
        const currentIdx = focusables.indexOf(document.activeElement as HTMLElement);
        const nextIdx = computeTabFocusIndex(currentIdx, focusables.length, e.shiftKey);
        if (nextIdx >= 0) {
          e.preventDefault();
          focusables[nextIdx].focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      defaultOverlayKernel.unregister(modalId);
      defaultOverlayKernel.releaseScrollLock(modalId);
      if (previousActive && previousActive.isConnected && typeof previousActive.focus === 'function') {
        previousActive.focus();
      }
    };
  }, [isOpen, requestClose]);

  if (!isOpen) return null;

  const resolvedPadding = padding ?? (layout === 'flex-fixed' ? '0' : '24px');
  const contentClasses = [
    'glass-card modal-content',
    layout === 'flex-fixed' ? 'modal-content--flex-fixed' : '',
    contentClassName ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  const dialogTree = (
    <div
      className="modal-overlay"
      data-testid={dataTestId}
      style={{
        zIndex: MODAL_LAYER_Z_INDEX[layer],
        ...overlayStyle,
      }}
      onClick={(e) => {
        if (shouldCloseModalOnBackdropClick(e.target === e.currentTarget, closeLocked)) {
          requestClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        className={contentClasses}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        aria-label={ariaLabel}
        tabIndex={-1}
        style={{ maxWidth, width: '92%', padding: resolvedPadding, ...contentStyle }}
        onClick={(e) => e.stopPropagation()}
      >
        {showDirtyConfirm && (
          <div className="modal-dirty-banner" role="alert">
            <span>⚠️ 尚有未儲存變更，確定放棄並關閉視窗嗎？</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                onClick={() => setShowDirtyConfirm(false)}
              >
                繼續編輯
              </button>
              <button
                type="button"
                className="btn btn-danger"
                style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                onClick={() => {
                  setShowDirtyConfirm(false);
                  onCloseRef.current();
                }}
              >
                放棄變更並關閉
              </button>
            </div>
          </div>
        )}
        {children}
      </div>
    </div>
  );

  if (typeof document !== 'undefined' && document.body) {
    return createPortal(dialogTree, document.body);
  }
  return dialogTree;
};
