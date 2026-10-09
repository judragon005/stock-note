import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { copyTextToClipboard } from './clipboard';

describe('clipboard - copyTextToClipboard 跨環境高容錯剪貼簿工具 (Spec 0173 / Ticket 01)', () => {
  const originalNavigator = globalThis.navigator;
  const originalDocument = (globalThis as any).document;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    // 恢復全域環境
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(globalThis, 'document', {
      value: originalDocument,
      writable: true,
      configurable: true,
    });
  });

  it('在 Secure Context (HTTPS / localhost) 支援 navigator.clipboard 時應優先使用 writeText 並回傳 true', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        clipboard: {
          writeText: writeTextMock,
        },
      },
      writable: true,
      configurable: true,
    });

    const result = await copyTextToClipboard('測試全量 7 步 Prompt');
    expect(result).toBe(true);
    expect(writeTextMock).toHaveBeenCalledWith('測試全量 7 步 Prompt');
  });

  it('在 NAS HTTP 局域網非安全環境 (navigator.clipboard 為 undefined) 時應降級使用 execCommand("copy") 並回傳 true', async () => {
    // 模擬 NAS HTTP 環境：navigator.clipboard 為 undefined
    Object.defineProperty(globalThis, 'navigator', {
      value: {},
      writable: true,
      configurable: true,
    });

    const mockTextArea = {
      value: '',
      style: {},
      setAttribute: vi.fn(),
      focus: vi.fn(),
      select: vi.fn(),
      setSelectionRange: vi.fn(),
    };

    const appendChildMock = vi.fn();
    const removeChildMock = vi.fn();
    const execCommandMock = vi.fn().mockReturnValue(true);

    Object.defineProperty(globalThis, 'document', {
      value: {
        createElement: vi.fn().mockReturnValue(mockTextArea),
        body: {
          appendChild: appendChildMock,
          removeChild: removeChildMock,
        },
        execCommand: execCommandMock,
      },
      writable: true,
      configurable: true,
    });

    const result = await copyTextToClipboard('NAS 局域網 Prompt 測試');

    expect(result).toBe(true);
    expect(execCommandMock).toHaveBeenCalledWith('copy');
    expect(appendChildMock).toHaveBeenCalledWith(mockTextArea);
    expect(removeChildMock).toHaveBeenCalledWith(mockTextArea);
    expect(mockTextArea.select).toHaveBeenCalled();
  });

  it('當 navigator.clipboard 失敗拋出異常時應能自動切換至降級 fallback execCommand', async () => {
    const writeTextMock = vi.fn().mockRejectedValue(new Error('Permission denied'));
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        clipboard: {
          writeText: writeTextMock,
        },
      },
      writable: true,
      configurable: true,
    });

    const mockTextArea = {
      value: '',
      style: {},
      setAttribute: vi.fn(),
      focus: vi.fn(),
      select: vi.fn(),
    };
    const execCommandMock = vi.fn().mockReturnValue(true);

    Object.defineProperty(globalThis, 'document', {
      value: {
        createElement: vi.fn().mockReturnValue(mockTextArea),
        body: {
          appendChild: vi.fn(),
          removeChild: vi.fn(),
        },
        execCommand: execCommandMock,
      },
      writable: true,
      configurable: true,
    });

    const result = await copyTextToClipboard('Fallback 測試');

    expect(result).toBe(true);
    expect(writeTextMock).toHaveBeenCalled();
    expect(execCommandMock).toHaveBeenCalledWith('copy');
  });

  it('當兩種方式皆失敗時應安全回傳 false，絕不拋出未捕獲異常', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: {},
      writable: true,
      configurable: true,
    });

    Object.defineProperty(globalThis, 'document', {
      value: {
        createElement: vi.fn().mockImplementation(() => {
          throw new Error('DOM Error');
        }),
      },
      writable: true,
      configurable: true,
    });

    const result = await copyTextToClipboard('失敗案例測試');
    expect(result).toBe(false);
  });

  it('當 execCommand 執行過程中拋出例外時，finally 區塊應保證臨時 DOM 節點 100% 被銷毀且回傳 false', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: {},
      writable: true,
      configurable: true,
    });

    const mockTextArea = {
      value: '',
      style: {},
      setAttribute: vi.fn(),
      focus: vi.fn(),
      select: vi.fn(),
      setSelectionRange: vi.fn(),
      remove: vi.fn(),
    };

    const appendChildMock = vi.fn();
    const removeChildMock = vi.fn();

    Object.defineProperty(globalThis, 'document', {
      value: {
        createElement: vi.fn().mockReturnValue(mockTextArea),
        body: {
          appendChild: appendChildMock,
          removeChild: removeChildMock,
        },
        execCommand: vi.fn().mockImplementation(() => {
          throw new Error('Security Error in execCommand');
        }),
      },
      writable: true,
      configurable: true,
    });

    const result = await copyTextToClipboard('異常降級測試');

    expect(result).toBe(false);
    expect(appendChildMock).toHaveBeenCalledWith(mockTextArea);
    expect(mockTextArea.remove).toHaveBeenCalled();
  });
});

