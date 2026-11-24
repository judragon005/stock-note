import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export interface ModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  closeLocked?: boolean;
  maxWidth?: string;
  padding?: string;
  ariaLabelledBy?: string;
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
 * 全域視口傳送彈窗原語 (Viewport-Portaled Modal Shell, Spec 0245 T01)
 * - 瀏覽器環境透過 createPortal 掛載至 document.body，免受父層 backdrop-filter/transform 層疊上下文劫持
 * - 統一提供 .modal-overlay 居中遮罩、glass-card 容器、ESC/遮罩關閉、捲動鎖定與無障礙語意
 */
export const ModalShell: React.FC<ModalShellProps> = ({
  isOpen,
  onClose,
  closeLocked = false,
  maxWidth = '580px',
  padding = '24px',
  ariaLabelledBy,
  children,
}) => {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (shouldCloseModalOnKeyDown(e.key, closeLocked)) {
        e.preventDefault();
        onCloseRef.current();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, closeLocked]);

  if (!isOpen) return null;

  const dialogTree = (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (shouldCloseModalOnBackdropClick(e.target === e.currentTarget, closeLocked)) {
          onClose();
        }
      }}
    >
      <div
        className="glass-card modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        style={{ maxWidth, width: '92%', padding }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );

  if (typeof document !== 'undefined' && document.body) {
    return createPortal(dialogTree, document.body);
  }
  return dialogTree;
};
