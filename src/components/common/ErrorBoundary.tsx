import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught component render error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.href = '/';
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-slate-100">
          <div className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-2xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-bold text-slate-100">
                {this.props.fallbackTitle || 'Something went wrong'}
              </h2>
              <p className="text-sm text-slate-400">
                An unexpected UI error occurred. Your chess data is safe.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 text-xs text-red-300 font-mono text-left max-h-28 overflow-y-auto">
                {this.state.error.message}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={this.handleReset}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-medium text-sm transition-all shadow-lg shadow-primary-600/20"
              >
                <RotateCcw className="w-4 h-4" />
                Reload Application
              </button>
              <button
                onClick={() => { window.location.href = '/'; }}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-sm transition-all border border-slate-700 inline-flex items-center gap-2"
              >
                <Home className="w-4 h-4" />
                Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
