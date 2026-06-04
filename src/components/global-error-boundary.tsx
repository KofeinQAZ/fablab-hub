import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { withTranslation, WithTranslation } from "react-i18next";

type State = {
  hasError: boolean;
};

// Расширяем типизацию пропсов, добавляя WithTranslation
type Props = {
  children: React.ReactNode;
} & WithTranslation;

class GlobalErrorBoundaryComponent extends React.Component<Props, State> {
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
      // Достаем функцию t из пропсов, куда ее положил withTranslation
      const { t } = this.props;
      
      return (
        <div className="min-h-screen bg-slate-50 p-4">
          <div className="mx-auto flex min-h-[80vh] w-full max-w-3xl items-center justify-center">
            <Card className="w-full rounded-3xl border border-slate-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-2xl text-slate-900">
                  {t('errorBoundary.title', 'Упс! Что-то пошло не так. Мы уже чиним.')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-slate-600">
                  {t('errorBoundary.description', 'Попробуйте обновить страницу. Если проблема повторится, обратитесь к администратору FabLab.')}
                </p>
                <Button
                  className="h-11 rounded-2xl bg-blue-700 hover:bg-blue-800"
                  onClick={this.handleReload}
                >
                  {t('errorBoundary.reloadBtn', 'Обновить страницу')}
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

// Экспортируем обернутый компонент
export const GlobalErrorBoundary = withTranslation()(GlobalErrorBoundaryComponent);