import { Component, type ErrorInfo, type ReactNode } from "react";

/** App-wide safety net: a render error shows a reload prompt instead of a blank screen. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[mudra] render error", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-canvas px-6 text-center text-fg">
        <p className="text-[18px] font-semibold lowercase">something broke on this page.</p>
        <p className="max-w-[420px] text-[14px] lowercase text-fg-2">reload to try again. your deal state is kept on the server.</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="press cursor-pointer bg-neo-paccha px-5 py-2.5 text-[14px] font-bold lowercase text-paccha-ink"
        >
          reload
        </button>
      </div>
    );
  }
}
