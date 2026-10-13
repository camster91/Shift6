/** Coalesce concurrent refreshes while ensuring a request during an active read
 * gets a trailing read. A newly saved date/preference cannot join stale work. */
export function createTrailingRefresh<T>(task: () => Promise<T>): () => Promise<T> {
  let inFlight: Promise<T> | null = null;
  let requested = false;
  return () => {
    requested = true;
    if (!inFlight) {
      inFlight = Promise.resolve().then(async () => {
        try {
          let result: T;
          do {
            requested = false;
            result = await task();
          } while (requested);
          return result;
        } finally {
          inFlight = null;
        }
      });
    }
    return inFlight;
  };
}
