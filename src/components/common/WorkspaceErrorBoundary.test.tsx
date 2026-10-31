import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { WorkspaceErrorBoundary } from './WorkspaceErrorBoundary';

const NormalComponent = () => <div>正常運作工作區</div>;

describe('WorkspaceErrorBoundary (金融級工作區故障隔離邊界)', () => {
  it('子組件正常時應正常渲染子組件內容', () => {
    const html = renderToStaticMarkup(
      <WorkspaceErrorBoundary fallbackTitle="戰情室載入異常">
        <NormalComponent />
      </WorkspaceErrorBoundary>
    );
    expect(html).toContain('正常運作工作區');
  });

  it('類別組件初始狀態 hasError 應為 false', () => {
    const boundary = new WorkspaceErrorBoundary({ children: null });
    expect(boundary.state.hasError).toBe(false);
    expect(boundary.state.error).toBe(null);

    const nextState = WorkspaceErrorBoundary.getDerivedStateFromError(new Error('Fatal'));
    expect(nextState.hasError).toBe(true);
    expect(nextState.error?.message).toBe('Fatal');
  });

  it('發生錯誤時應渲染降級告警卡片，提供重試自愈按鈕，保護核心交易底座', () => {
    const boundary = new WorkspaceErrorBoundary({
      children: null,
      fallbackTitle: '宏觀戰情室載入異常',
    });
    boundary.state = {
      hasError: true,
      error: new Error('Cannot read properties of undefined'),
    };

    const html = renderToStaticMarkup(boundary.render() as React.ReactElement);
    expect(html).toContain('宏觀戰情室載入異常');
    expect(html).toContain('系統已啟動安全保護機制');
    expect(html).toContain('重新整理工作區');
    expect(html).toContain('重置快取並重試');
  });
});

