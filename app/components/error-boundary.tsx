"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { buttonVariants } from "./ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="bg-canvas flex min-h-screen items-center justify-center p-8">
          <div className="bg-surface w-full max-w-md space-y-4 rounded-2xl p-8 text-center">
            <h2 className="text-lg font-semibold text-white">
              Something went wrong
            </h2>
            <p className="text-muted-foreground text-sm">
              {this.state.error?.message ?? "An unexpected error occurred."}
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className={buttonVariants({ variant: "primary", size: "md" })}
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
