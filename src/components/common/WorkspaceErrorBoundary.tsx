import { Component, ErrorInfo, ReactNode } from 'react';
import { MACRO_PULSE_STORAGE_KEY } from '../../utils/macroPulseStorage';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * 金融級工作區故障隔離邊界 (Workspace Error Boundary)
 * 當個別分析或戰情室活頁遭遇意外渲染例外時，局部攔截並提供自愈按鈕，
 * 確保核心資產總覽、持倉、交易紀錄與現金帳本底座 100% 正常運作。
 */
export class WorkspaceErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[WorkspaceErrorBoundary] Caught unhandled error:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          className="card animate-fade-in"
          style={{
            margin: '24px',
            padding: '24px',
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-lg)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              padding: '12px',
              background: 'rgba(239, 68, 68, 0.15)',
              borderRadius: '50%',
              color: 'var(--loss-color)',
              marginBottom: '12px',
            }}
          >
            <AlertTriangle size={28} />
          </div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '1.15rem', color: 'var(--text-primary)' }}>
            {this.props.fallbackTitle || '此工作區載入異常'}
          </h3>
          <p
            style={{
              margin: '0 0 16px 0',
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
              maxWidth: '520px',
              marginLeft: 'auto',
              marginRight: 'auto',
              lineHeight: 1.5,
            }}
          >
            系統已啟動安全保護機制，主要交易底座與帳本依然安全運作。您可以嘗試重試或重設快取自愈。
          </p>
          <div style={{ display: 'inline-flex', gap: '10px' }}>
            <button
              type="button"
              onClick={this.handleRetry}
              className="btn btn-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={14} /> 重新整理工作區
            </button>
            <button
              type="button"
              onClick={() => {
                try {
                  localStorage.removeItem(MACRO_PULSE_STORAGE_KEY);
                } catch {}
                this.handleRetry();
              }}
              className="btn btn-secondary btn-sm"
            >
              重置快取並重試
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

