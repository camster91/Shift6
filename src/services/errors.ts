import type { ErrorReporter } from './contracts';

const noopErrorReporter: ErrorReporter = {
  captureException: () => undefined,
  captureMessage: () => undefined,
};

/**
 * Keeps crash reporting disabled until a production provider, retention policy,
 * and privacy review are explicitly configured.
 */
export function createNoopErrorReporter(): ErrorReporter {
  return noopErrorReporter;
}
