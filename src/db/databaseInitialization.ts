export interface OwnedDatabaseConnection {
  closeAsync(): Promise<void>;
}

export interface DatabaseInitializationDiagnostic {
  stage: 'open' | 'initialize' | 'close';
  code: 'connection-closed' | 'storage-busy' | 'storage-full' | 'unavailable';
}

export type DatabaseInitializationState<Database> =
  | { status: 'loading' }
  | { status: 'ready'; database: Database }
  | { status: 'error'; diagnostic: DatabaseInitializationDiagnostic };

interface InitializationDependencies<Database extends OwnedDatabaseConnection> {
  /** Must return a fresh connection owned by this initializer, never a shared handle. */
  open(): Promise<Database>;
  initialize(database: Database): Promise<void>;
  onDiagnostic?(diagnostic: DatabaseInitializationDiagnostic): void;
}

/** Only fixed categories leave this boundary; SQL, paths, values and stacks do not. */
function diagnostic(
  stage: DatabaseInitializationDiagnostic['stage'],
  failure: unknown,
): DatabaseInitializationDiagnostic {
  let code: DatabaseInitializationDiagnostic['code'] = 'unavailable';
  if (failure instanceof Error) {
    const signature = `${failure.name} ${failure.message}`;
    if (/closed|AccessClosedResource/i.test(signature)) code = 'connection-closed';
    else if (/\bSQLITE_BUSY\b|\bSQLITE_LOCKED\b|database is locked/i.test(signature))
      code = 'storage-busy';
    else if (/\bSQLITE_FULL\b|database or disk is full|no space left/i.test(signature))
      code = 'storage-full';
  }
  return { stage, code };
}

/** App-owned lifetime coordinator. A retry waits for the previous attempt to
 * finish initialization and release its own handle; cancellation is not a
 * claim that an in-flight native operation has stopped. */
export function createDatabaseInitialization<Database extends OwnedDatabaseConnection>(
  dependencies: InitializationDependencies<Database>,
) {
  let current: { cancel(): void; closed: Promise<void> } | null = null;

  return {
    start(publish: (state: DatabaseInitializationState<Database>) => void): () => void {
      const previous = current;
      previous?.cancel();
      let cancelled = false;
      let settled = false;
      let connection: Database | undefined;
      let closing: Promise<void> | undefined;
      let releaseClosed!: () => void;
      const closed = new Promise<void>((resolve) => {
        releaseClosed = resolve;
      });
      const isCurrent = () => !cancelled && current === attempt;
      const report = (value: DatabaseInitializationDiagnostic) => {
        if (!isCurrent()) return;
        try {
          dependencies.onDiagnostic?.(value);
        } catch {
          // Diagnostic transport cannot interrupt connection cleanup or recovery.
        }
      };
      const closeOwnedConnection = async () => {
        if (!closing) {
          closing = (async () => {
            try {
              await connection?.closeAsync();
            } catch (error) {
              report(diagnostic('close', error));
            } finally {
              releaseClosed();
            }
          })();
        }
        await closing;
      };
      const attempt = {
        closed,
        cancel() {
          cancelled = true;
          // Retain this attempt as a barrier after effect cleanup. The next
          // mount must await its release even when no subscriber remains.
          // Never close under an in-flight migration/transaction.
          if (settled) void closeOwnedConnection();
        },
      };
      current = attempt;
      publish({ status: 'loading' });

      const run = async () => {
        let failure: DatabaseInitializationDiagnostic | undefined;
        let stage: DatabaseInitializationDiagnostic['stage'] = 'open';
        try {
          if (!isCurrent()) return;
          connection = await dependencies.open();
          if (!isCurrent()) return;
          stage = 'initialize';
          await dependencies.initialize(connection);
          if (isCurrent()) publish({ status: 'ready', database: connection });
        } catch (error) {
          failure = diagnostic(stage, error);
        } finally {
          settled = true;
          if (cancelled || failure) await closeOwnedConnection();
          if (failure && isCurrent()) {
            report(failure);
            publish({ status: 'error', diagnostic: failure });
          }
        }
      };
      // Share the coordinator across provider remounts in the same JS runtime.
      // Each callback and each cleanup still belongs to one exact attempt.
      void (previous?.closed ?? Promise.resolve()).then(run);
      return attempt.cancel;
    },
  };
}
