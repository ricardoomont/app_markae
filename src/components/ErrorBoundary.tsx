import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("Erro capturado pelo ErrorBoundary:", error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  handleNavigateHome = (): void => {
    window.location.href = "/";
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <div className="container mx-auto p-4 flex flex-col items-center justify-center min-h-[50vh]">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Algo deu errado</h2>
          <p className="mb-2 text-gray-700">Ocorreu um erro inesperado na aplicação.</p>
          <p className="mb-6 text-sm text-gray-500">
            {this.state.error?.message || "Erro desconhecido"}
          </p>
          <div className="flex space-x-4">
            <Button 
              variant="outline"
              onClick={this.handleReset}
            >
              Tentar novamente
            </Button>
            <Button
              onClick={this.handleNavigateHome}
            >
              Voltar para o Dashboard
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 