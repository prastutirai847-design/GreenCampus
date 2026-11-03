import { Component } from 'react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('GreenCampus UI error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-sand-50 p-6">
          <div className="w-full max-w-md rounded-2xl border border-line bg-white p-6 text-center shadow-card">
            <h1 className="font-display text-lg font-semibold text-ink-900">
              The dashboard hit an unexpected error
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-500">
              Your locally saved records are still in this browser. Reloading usually resolves a
              rendering problem.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 inline-flex h-10 items-center justify-center rounded-xl bg-forest-800 px-4 text-sm font-medium text-white transition hover:bg-forest-700"
            >
              Reload GreenCampus
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
