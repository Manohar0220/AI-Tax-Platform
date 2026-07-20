import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="min-h-screen flex items-center justify-center bg-surface-page p-4">
          <div className="max-w-md w-full text-center">
            <div className="mb-4 flex justify-center text-error-500">
              <AlertTriangle className="h-12 w-12" />
            </div>
            <h1 className="text-xl font-semibold text-text-primary mb-2">
              Something went wrong
            </h1>
            <p className="text-sm text-text-muted mb-6">
              An unexpected error occurred. You can try reloading the page or resetting the application.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-primary-600 text-white hover:bg-primary-700"
              >
                <RotateCcw className="h-4 w-4" />
                Try again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md border border-border-default text-text-primary hover:bg-neutral-50"
              >
                Reload page
              </button>
            </div>
            {this.state.error && (
              <details className="mt-6 text-left">
                <summary className="text-xs text-text-muted cursor-pointer">
                  Error details
                </summary>
                <pre className="mt-2 p-3 bg-neutral-100 rounded text-xs overflow-auto text-text-secondary">
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
