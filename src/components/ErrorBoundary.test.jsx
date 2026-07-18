import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary';

// A component that throws an error on render
function ThrowingComponent({ message }) {
  throw new Error(message || 'Test render error');
}

describe('ErrorBoundary', () => {
  let originalEnvDev;

  beforeEach(() => {
    // Save original DEV env
    originalEnvDev = import.meta.env.DEV;
    // Suppress console.error inside test output when error is thrown
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore DEV env and restore mocks
    import.meta.env.DEV = originalEnvDev;
    vi.restoreAllMocks();
  });

  it('renders children correctly when there is no error', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <div>All systems operational</div>
      </ErrorBoundary>
    );
    expect(getByText('All systems operational')).toBeTruthy();
  });

  it('renders fallback UI when an error is caught', () => {
    const { getByRole, getByText } = render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );
    expect(getByRole('alert')).toBeTruthy();
    expect(getByText('Something went wrong')).toBeTruthy();
  });

  it('displays error details in development mode', () => {
    import.meta.env.DEV = true;

    const { getByText } = render(
      <ErrorBoundary>
        <ThrowingComponent message="SENSITIVE_SECRET_EXPOSED" />
      </ErrorBoundary>
    );

    // Should display the summary "Show error details"
    expect(getByText('Show error details')).toBeTruthy();
    // Should display the error message itself
    expect(getByText('SENSITIVE_SECRET_EXPOSED')).toBeTruthy();
  });

  it('suppresses error details in production mode', () => {
    import.meta.env.DEV = false;

    const { queryByText } = render(
      <ErrorBoundary>
        <ThrowingComponent message="SENSITIVE_SECRET_EXPOSED" />
      </ErrorBoundary>
    );

    // Should NOT display the summary "Show error details"
    expect(queryByText('Show error details')).toBeNull();
    // Should NOT display the error message itself
    expect(queryByText('SENSITIVE_SECRET_EXPOSED')).toBeNull();
  });
});
