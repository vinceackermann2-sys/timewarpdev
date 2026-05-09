import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
  label?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class RouteErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[RouteErrorBoundary${this.props.label ? `:${this.props.label}` : ""}]`, error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="h-full w-full flex items-center justify-center p-8 bg-background">
        <div className="max-w-md w-full bg-card border border-border/60 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-foreground" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Something went wrong</h2>
              <p className="text-xs text-muted-foreground">
                {this.props.label ? `The ${this.props.label} view crashed.` : "This view crashed."} You can keep using the rest of the app.
              </p>
            </div>
          </div>
          {this.state.error?.message && (
            <pre className="text-[11px] text-muted-foreground bg-muted/40 rounded-md p-2 overflow-auto max-h-32">
              {this.state.error.message}
            </pre>
          )}
          <div className="flex gap-2">
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 rounded-md bg-foreground text-background text-sm font-medium px-3 py-2 hover:opacity-90"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Try again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center rounded-md border border-border text-sm font-medium px-3 py-2 hover:bg-muted"
            >
              Reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}
