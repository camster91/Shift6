import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
                    <div className="max-w-md w-full bg-slate-900/50 border border-red-500/20 rounded-xl p-8 text-center backdrop-blur-sm">
                        <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle className="text-red-400" size={32} />
                        </div>
                        <h2 className="text-2xl font-bold mb-3 text-white">Something went wrong</h2>
                        <p className="text-sm text-slate-400 mb-6">
                            An unexpected error occurred. Your data is safe.
                        </p>
                        <button
                            onClick={this.handleReset}
                            className="bg-cyan-500 hover:bg-cyan-600 text-slate-900 px-6 py-3 rounded-lg text-sm font-bold transition-colors uppercase tracking-wider inline-flex items-center gap-2"
                        >
                            <RefreshCw size={16} />
                            Try Again
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
