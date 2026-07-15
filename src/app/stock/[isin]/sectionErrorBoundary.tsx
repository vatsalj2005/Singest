"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  sectionName: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class SectionErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Error in section ${this.props.sectionName}:`, error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="glass my-4 rounded-xl p-5 border border-rose-500/30 bg-rose-500/5 text-center">
          <h3 className="text-rose-400 font-semibold text-base">
            {this.props.sectionName} Under Maintenance
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
