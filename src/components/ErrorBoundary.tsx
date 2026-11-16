import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'Đã xảy ra lỗi không mong muốn.',
    };
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6 text-slate-100">
          <div className="max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center">
            <h1 className="text-lg font-bold">Không thể tải ứng dụng</h1>
            <p className="mt-2 text-sm text-slate-300 break-words">{this.state.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400 cursor-pointer"
            >
              Tải lại trang
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
