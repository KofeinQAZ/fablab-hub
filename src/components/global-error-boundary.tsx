import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type State = {
  hasError: boolean;
};

export class GlobalErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("GlobalErrorBoundary caught an error:", error, errorInfo);
  }

  private handleReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 p-4">
          <div className="mx-auto flex min-h-[80vh] w-full max-w-3xl items-center justify-center">
            <Card className="w-full rounded-3xl border border-slate-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-2xl text-slate-900">
                  Упс! Что-то пошло не так. Мы уже чиним.
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-slate-600">
                  Попробуйте обновить страницу. Если проблема повторится, обратитесь к администратору FabLab.
                </p>
                <Button
                  className="h-11 rounded-2xl bg-blue-700 hover:bg-blue-800"
                  onClick={this.handleReload}
                >
                  Обновить страницу
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
