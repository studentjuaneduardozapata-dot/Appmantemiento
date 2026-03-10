import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-6 text-center bg-background">
          <p className="text-zinc-400 text-sm font-medium">Ocurrió un error en esta pantalla</p>
          {this.state.error && (
            <p className="text-zinc-600 text-xs max-w-xs break-all">{this.state.error.message}</p>
          )}
          <button
            onClick={this.handleReset}
            className="px-4 py-2 text-sm rounded-md bg-zinc-800 text-zinc-200 hover:bg-zinc-700 transition-colors"
          >
            Reintentar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
