import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Armor ErrorBoundary caught:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    try {
      // Clear all Armor data, then any leftover Shift6 v1 keys.
      // The list is in two groups so it's easy to see which is which
      // if someone debugs the reset from the Application panel.
      const ARMOR_KEYS = [
        'armor_data', 'armor_revision', 'armor_auth', 'armor_api_base',
        'armor_migrated_from_shift6', 'armor_theme', 'armor_install_dismissed',
      ];
      const SHIFT6_LEGACY_KEYS = [
        'shift6_logs', 'shift6_goals', 'shift6_my_exercises',
        'shift6_onboarding_done', 'shift6_settings',
        'shift6_install_dismissed', 'shift6_theme',
      ];
      [...ARMOR_KEYS, ...SHIFT6_LEGACY_KEYS].forEach(k => localStorage.removeItem(k));
    } catch {
      // Storage may be disabled or quota exceeded; reload still proceeds
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[var(--elevation-0-bg)] text-[var(--text-primary)] flex items-center justify-center p-6">
          <div className="text-center max-w-sm">
            <div className="text-4xl mb-4">⚠️</div>
            <h1 className="text-xl font-bold mb-2">Something went wrong</h1>
            <p className="text-sm text-[var(--text-secondary)] mb-6">The app hit an unexpected error. Your data is safe — everything is stored locally.</p>
            <div className="space-y-3">
              <button
                onClick={this.handleReload}
                className="w-full px-6 py-3 bg-[var(--color-accent)] text-[var(--elevation-0-bg)] rounded-xl font-bold active:scale-95 transition-transform"
              >
                Reload App
              </button>
              <button
                onClick={this.handleReset}
                className="w-full px-6 py-3 bg-[var(--color-danger-muted)] border border-[var(--color-danger)]/20 text-[var(--color-danger)] rounded-xl font-bold active:scale-95 transition-transform text-sm"
              >
                Reset Data & Start Fresh
              </button>
              <p className="text-xs text-[var(--text-tertiary)] mt-2">Reset clears logs, goals, and settings. This cannot be undone.</p>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
