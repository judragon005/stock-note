/**
 * 跨環境高容錯剪貼簿工具 (Spec 0173 / Ticket 01)
 * 支援 HTTPS / localhost Secure Context 與 NAS HTTP 局域網 Insecure Context 雙軌降級
 */
import { logger } from './logger';

export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof text !== 'string') {
    return false;
  }

  // 第一軌：現代 Secure Context API (HTTPS 或 localhost)
  if (
    typeof navigator !== 'undefined' &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === 'function'
  ) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      logger.warn('[clipboard] navigator.clipboard.writeText 失敗，自動切換降級備援:', err);
    }
  }

  // 第二軌：傳統 DOM execCommand 降級備援 (支援純 HTTP 局域網 NAS 如 http://192.168.x.x)
  if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      // 避免手機與桌面端畫面滾動或閃爍
      textArea.style.position = 'fixed';
      textArea.style.top = '0';
      textArea.style.left = '-9999px';
      textArea.style.width = '2em';
      textArea.style.height = '2em';
      textArea.style.padding = '0';
      textArea.style.border = 'none';
      textArea.style.outline = 'none';
      textArea.style.boxShadow = 'none';
      textArea.style.background = 'transparent';
      textArea.style.opacity = '0';
      textArea.setAttribute('readonly', '');

      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      // 相容 iOS Safari 選取範圍
      if (textArea.setSelectionRange) {
        textArea.setSelectionRange(0, text.length);
      }

      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);

      if (successful) {
        return true;
      }
    } catch (err) {
      logger.warn('[clipboard] document.execCommand 降級複製失敗:', err);
    }
  }

  // 兩軌皆失敗
  return false;
}
